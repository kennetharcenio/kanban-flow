import { TestBed } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { DriveService } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';
import { EventReplayService } from '../event-store/event-replay.service';

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    const driveSpy = {
      readJsonFile: vi.fn().mockResolvedValue({ data: { boards: [], labels: [], version: 0 }, revisionId: 'rev-1' }),
      writeJsonFile: vi.fn().mockResolvedValue({ revisionId: 'rev-2' }),
      findFileInFolder: vi.fn().mockResolvedValue('file-id'),
      createJsonFile: vi.fn().mockResolvedValue('file-id'),
      getFolderId: vi.fn().mockReturnValue('root-folder'),
      listFoldersInFolder: vi.fn().mockResolvedValue([]),
    };

    const authSpy = {
      getAccessToken: vi.fn().mockReturnValue('token'),
      isAuthenticated: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ email: 'user@test.com', name: 'Test', picture: '' }),
    };

    TestBed.configureTestingModule({
      providers: [
        EventReplayService,
        { provide: DriveService, useValue: driveSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });
    service = TestBed.inject(SyncService);
  });

  it('should be created', () => { expect(service).toBeTruthy(); });
  it('should start as online', () => { expect(service.isOnline()).toBe(true); });
  it('should track sync status', () => { expect(service.isSyncing()).toBe(false); });
  it('should report last sync time as null initially', () => { expect(service.lastSyncTime()).toBeNull(); });
});
