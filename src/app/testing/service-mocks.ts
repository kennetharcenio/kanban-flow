import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { signal } from '@angular/core';
import { Board } from '../shared/models/board.model';
import { Card } from '../shared/models/card.model';
import { BoardState } from '../core/event-store/event-replay.service';
import { createMockBoard } from './mock-factories';

export function createMockEventStoreService() {
  const state$ = new BehaviorSubject<BoardState>({
    board: createMockBoard(),
    cards: [],
  });

  return {
    state$,
    board$: state$.pipe(map((s) => s.board)),
    cards$: state$.pipe(map((s) => s.cards)),
    columns$: state$.pipe(map((s) => [...(s.board.columns || [])].sort((a, c) => a.order - c.order))),
    initialize: vi.fn(),
    getState: vi.fn(() => state$.getValue()),
    dispatch: vi.fn(),
    getPendingEvents: vi.fn(() => []),
    acknowledgePendingEvents: vi.fn(),
    mergeRemoteEvents: vi.fn(),
    getAllEvents: vi.fn(() => []),
    getCurrentVersion: vi.fn(() => 0),
  };
}

export function createMockSyncService() {
  return {
    isOnline: signal(true).asReadonly(),
    isSyncing: signal(false).asReadonly(),
    lastSyncTime: signal<Date | null>(null).asReadonly(),
    loadIndex: vi.fn().mockResolvedValue({ boards: [], labels: [], version: 0 }),
    saveIndex: vi.fn().mockResolvedValue(undefined),
    loadBoard: vi.fn().mockResolvedValue(undefined),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    sync: vi.fn().mockResolvedValue(undefined),
    cacheStateLocally: vi.fn(),
  };
}

export function createMockDriveService() {
  return {
    getFolderId: vi.fn(() => 'folder-123'),
    setFolderId: vi.fn(),
    clearFolderId: vi.fn(),
    buildAuthHeaders: vi.fn(() => new Headers({ Authorization: 'Bearer test-token' })),
    createFolder: vi.fn().mockResolvedValue('new-folder-id'),
    readJsonFile: vi.fn().mockResolvedValue({ data: {}, revisionId: 'rev-1' }),
    writeJsonFile: vi.fn().mockResolvedValue({ revisionId: 'rev-2' }),
    createJsonFile: vi.fn().mockResolvedValue('new-file-id'),
    findFileInFolder: vi.fn().mockResolvedValue(null),
    listFoldersInFolder: vi.fn().mockResolvedValue([]),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
}
