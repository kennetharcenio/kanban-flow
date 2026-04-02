import { Injectable, signal, OnDestroy } from '@angular/core';
import { Subscription, interval, fromEvent } from 'rxjs';
import { DriveService, ConflictError } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';
import { EventStoreService } from '../event-store/event-store.service';
import { SnapshotService } from '../event-store/snapshot.service';
import { BoardEvent } from '../../shared/models/event.model';
import { BoardSnapshot, AppIndex } from '../../shared/models/index.model';
import { Board } from '../../shared/models/board.model';
import { environment } from '../../../environments/environment';

const LOCAL_STATE_KEY = 'kanbanflow_local_state';
const LOCAL_QUEUE_KEY = 'kanbanflow_event_queue';

@Injectable({ providedIn: 'root' })
export class SyncService implements OnDestroy {
  private pollSub: Subscription | null = null;
  private onlineSub: Subscription | null = null;
  private offlineSub: Subscription | null = null;
  private boardFolderId: string | null = null;
  private eventsFileId: string | null = null;
  private eventsRevisionId: string | null = null;
  private indexFileId: string | null = null;
  private indexRevisionId: string | null = null;

  private _isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  private _isSyncing = signal(false);
  private _lastSyncTime = signal<Date | null>(null);

  isOnline = this._isOnline.asReadonly();
  isSyncing = this._isSyncing.asReadonly();
  lastSyncTime = this._lastSyncTime.asReadonly();

  constructor(
    private drive: DriveService,
    private auth: AuthService,
    private eventStore: EventStoreService,
    private snapshot: SnapshotService
  ) {
    if (typeof window !== 'undefined') {
      this.onlineSub = fromEvent(window, 'online').subscribe(() => {
        this._isOnline.set(true);
        this.pushPendingEvents();
      });
      this.offlineSub = fromEvent(window, 'offline').subscribe(() => {
        this._isOnline.set(false);
      });
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.onlineSub?.unsubscribe();
    this.offlineSub?.unsubscribe();
  }

  async loadIndex(): Promise<AppIndex> {
    const folderId = this.drive.getFolderId();
    if (!folderId) throw new Error('No folder ID configured');
    this.indexFileId = await this.drive.findFileInFolder(folderId, 'index.json');
    if (!this.indexFileId) {
      const emptyIndex: AppIndex = { boards: [], labels: [], version: 0 };
      this.indexFileId = await this.drive.createJsonFile('index.json', folderId, emptyIndex);
      return emptyIndex;
    }
    const result = await this.drive.readJsonFile<AppIndex>(this.indexFileId);
    this.indexRevisionId = result.revisionId;
    return result.data;
  }

  async saveIndex(index: AppIndex): Promise<void> {
    if (!this.indexFileId) throw new Error('Index not loaded');
    const result = await this.drive.writeJsonFile(this.indexFileId, index, this.indexRevisionId || undefined);
    this.indexRevisionId = result.revisionId;
  }

  async loadBoard(boardId: string): Promise<void> {
    const folderId = this.drive.getFolderId();
    if (!folderId) throw new Error('No folder ID configured');
    const folders = await this.drive.listFoldersInFolder(folderId);
    const boardFolder = folders.find((f: any) => f.name === `board-${boardId}`);
    if (!boardFolder) throw new Error(`Board folder not found: board-${boardId}`);
    this.boardFolderId = boardFolder.id;
    const stateFileId = await this.drive.findFileInFolder(this.boardFolderId, 'state.json');
    let board: Board = { id: boardId, name: '', description: '', createdBy: '', createdAt: '', columns: [], members: [] };
    let cards: import('../../shared/models/card.model').Card[] = [];
    let lastEventVersion = 0;
    if (stateFileId) {
      const snapshotResult = await this.drive.readJsonFile<BoardSnapshot>(stateFileId);
      board = snapshotResult.data.board;
      cards = snapshotResult.data.cards;
      lastEventVersion = snapshotResult.data.lastEventVersion;
    }
    this.eventsFileId = await this.drive.findFileInFolder(this.boardFolderId, 'events.json');
    let events: BoardEvent[] = [];
    if (this.eventsFileId) {
      const eventsResult = await this.drive.readJsonFile<BoardEvent[]>(this.eventsFileId);
      this.eventsRevisionId = eventsResult.revisionId;
      events = eventsResult.data.filter((e: any) => e.version > lastEventVersion);
    }
    this.eventStore.initialize(board, cards, events);
    await this.pushPendingEvents();
    this._lastSyncTime.set(new Date());
  }

  startPolling(): void {
    this.stopPolling();
    this.pollSub = interval(environment.pollIntervalMs).subscribe(() => {
      if (this._isOnline() && !this._isSyncing()) { this.sync(); }
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  async sync(): Promise<void> {
    if (this._isSyncing()) return;
    this._isSyncing.set(true);
    try {
      await this.pushPendingEvents();
      await this.pullRemoteEvents();
      this._lastSyncTime.set(new Date());
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      this._isSyncing.set(false);
    }
  }

  private async pushPendingEvents(): Promise<void> {
    const pending = this.eventStore.getPendingEvents();
    if (pending.length === 0) return;
    if (!this._isOnline()) { this.queueEventsLocally(pending); return; }
    try {
      if (!this.eventsFileId && this.boardFolderId) {
        this.eventsFileId = await this.drive.createJsonFile('events.json', this.boardFolderId, pending);
        this.eventStore.acknowledgePendingEvents();
        return;
      }
      if (!this.eventsFileId) return;
      const result = await this.drive.readJsonFile<BoardEvent[]>(this.eventsFileId);
      const merged = [...result.data, ...pending];
      const writeResult = await this.drive.writeJsonFile(this.eventsFileId, merged);
      this.eventsRevisionId = writeResult.revisionId;
      this.eventStore.acknowledgePendingEvents();
      this.clearLocalQueue();
      if (this.snapshot.shouldSnapshot(merged.length) && this.boardFolderId) {
        const user = this.auth.currentUser();
        if (user) {
          const snap = this.snapshot.buildSnapshot(this.eventStore, user.email);
          await this.snapshot.saveSnapshot(this.boardFolderId, snap);
        }
      }
    } catch (err) {
      if (err instanceof ConflictError) {
        await this.pullRemoteEvents();
        await this.pushPendingEvents();
      } else {
        this.queueEventsLocally(pending);
        throw err;
      }
    }
  }

  private async pullRemoteEvents(): Promise<void> {
    if (!this.eventsFileId) return;
    const result = await this.drive.readJsonFile<BoardEvent[]>(this.eventsFileId);
    this.eventsRevisionId = result.revisionId;
    this.eventStore.mergeRemoteEvents(result.data);
  }

  private queueEventsLocally(events: BoardEvent[]): void {
    const existing = this.getLocalQueue();
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify([...existing, ...events]));
  }

  private getLocalQueue(): BoardEvent[] {
    const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private clearLocalQueue(): void { localStorage.removeItem(LOCAL_QUEUE_KEY); }

  cacheStateLocally(): void {
    const state = this.eventStore.getState();
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  }
}
