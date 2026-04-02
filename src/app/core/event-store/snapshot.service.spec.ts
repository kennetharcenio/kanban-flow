import { TestBed } from '@angular/core/testing';
import { SnapshotService } from './snapshot.service';
import { EventStoreService } from './event-store.service';
import { EventReplayService } from './event-replay.service';
import { DriveService } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';
import { Board } from '../../shared/models/board.model';

describe('SnapshotService', () => {
  let service: SnapshotService;
  let eventStore: EventStoreService;

  const testBoard: Board = {
    id: 'board-1', name: 'Test', description: '', createdBy: 'user@test.com',
    createdAt: '2026-04-03T00:00:00Z', columns: [], members: [],
  };

  beforeEach(() => {
    const driveSpy = {
      writeJsonFile: vi.fn().mockResolvedValue({ revisionId: 'rev-1' }),
      findFileInFolder: vi.fn().mockResolvedValue('file-id'),
      createJsonFile: vi.fn().mockResolvedValue('file-id'),
      getAccessToken: vi.fn().mockReturnValue('token'),
    };

    TestBed.configureTestingModule({
      providers: [
        EventReplayService,
        { provide: DriveService, useValue: driveSpy },
        { provide: AuthService, useValue: { getAccessToken: () => 'token', currentUser: () => ({ email: 'user@test.com' }) } },
      ],
    });
    service = TestBed.inject(SnapshotService);
    eventStore = TestBed.inject(EventStoreService);
  });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should determine snapshot is needed after 50 events', () => {
    expect(service.shouldSnapshot(50)).toBe(true);
    expect(service.shouldSnapshot(49)).toBe(false);
    expect(service.shouldSnapshot(100)).toBe(true);
  });

  it('should build a snapshot from current state', () => {
    eventStore.initialize(testBoard, [], []);
    const snapshot = service.buildSnapshot(eventStore, 'user@test.com');
    expect(snapshot.board.id).toBe('board-1');
    expect(snapshot.cards).toEqual([]);
    expect(snapshot.snapshotBy).toBe('user@test.com');
    expect(snapshot.lastEventVersion).toBe(0);
  });
});
