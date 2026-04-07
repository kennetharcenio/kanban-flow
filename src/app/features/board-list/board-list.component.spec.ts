import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardListComponent } from './board-list.component';
import { SyncService } from '../../core/sync/sync.service';
import { AuthService } from '../../core/auth/auth.service';
import { DriveService } from '../../core/drive/drive.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

describe('BoardListComponent', () => {
  let component: BoardListComponent;
  let fixture: ComponentFixture<BoardListComponent>;

  beforeEach(async () => {
    // Mock localStorage for test environment
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });

    const syncSpy = {
      loadIndex: vi.fn().mockResolvedValue({ boards: [], labels: [], version: 0 }),
      saveIndex: vi.fn(),
      isOnline: signal(true),
      isSyncing: signal(false),
      lastSyncTime: signal(null),
    };

    const authSpy = {
      currentUser: vi.fn().mockReturnValue({ email: 'test@example.com', name: 'Test User', picture: '' }),
      signOut: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    const driveSpy = {
      getFolderId: vi.fn().mockReturnValue('folder-123'),
      setFolderId: vi.fn(),
      createFolder: vi.fn(),
      clearFolderId: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BoardListComponent],
      providers: [
        { provide: SyncService, useValue: syncSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: DriveService, useValue: driveSpy },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load boards on init', async () => {
    await component.ngOnInit();
    expect(component.boards()).toEqual([]);
  });
});
