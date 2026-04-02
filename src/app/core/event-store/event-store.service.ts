import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../../shared/models/board.model';
import { Card } from '../../shared/models/card.model';
import { BoardEvent, EventType } from '../../shared/models/event.model';
import { BoardState, EventReplayService } from './event-replay.service';

@Injectable({ providedIn: 'root' })
export class EventStoreService {
  private state$ = new BehaviorSubject<BoardState>({
    board: {} as Board,
    cards: [],
  });
  private allEvents: BoardEvent[] = [];
  private pendingEvents: BoardEvent[] = [];
  private currentVersion = 0;

  board$ = this.state$.pipe(map((s) => s.board));
  cards$ = this.state$.pipe(map((s) => s.cards));
  columns$ = this.board$.pipe(map((b) => [...(b.columns || [])].sort((a, c) => a.order - c.order)));

  constructor(private replay: EventReplayService) {}

  initialize(board: Board, cards: Card[], events: BoardEvent[]): void {
    this.allEvents = [...events];
    this.currentVersion = events.length > 0 ? Math.max(...events.map((e) => e.version)) : 0;
    const initialState: BoardState = { board, cards };
    const state = events.length > 0 ? this.replay.replay(initialState, events) : initialState;
    this.state$.next(state);
    this.pendingEvents = [];
  }

  getState(): BoardState { return this.state$.getValue(); }

  dispatch(type: EventType, payload: Record<string, any>, userId: string): BoardEvent {
    this.currentVersion++;
    const event: BoardEvent = {
      id: uuidv4(), type, payload, userId, timestamp: Date.now(), version: this.currentVersion,
    };
    this.allEvents.push(event);
    this.pendingEvents.push(event);
    const newState = this.replay.replay(this.getState(), [event]);
    this.state$.next(newState);
    return event;
  }

  getPendingEvents(): BoardEvent[] { return [...this.pendingEvents]; }
  acknowledgePendingEvents(): void { this.pendingEvents = []; }

  mergeRemoteEvents(remoteEvents: BoardEvent[]): void {
    const existingIds = new Set(this.allEvents.map((e) => e.id));
    const newEvents = remoteEvents.filter((e) => !existingIds.has(e.id));
    if (newEvents.length === 0) return;
    this.allEvents.push(...newEvents);
    const maxVersion = Math.max(...newEvents.map((e) => e.version));
    if (maxVersion > this.currentVersion) this.currentVersion = maxVersion;
    const newState = this.replay.replay(this.getState(), newEvents);
    this.state$.next(newState);
  }

  getAllEvents(): BoardEvent[] { return [...this.allEvents]; }
  getCurrentVersion(): number { return this.currentVersion; }
}
