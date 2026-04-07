import { TestBed } from '@angular/core/testing';
import { DriveService } from './drive.service';
import { AuthService } from '../auth/auth.service';

describe('DriveService', () => {
  let service: DriveService;
  let authSpy: any;

  beforeEach(() => {
    authSpy = { getAccessToken: vi.fn().mockReturnValue('test-token') };

    // Mock localStorage for test environment
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authSpy }],
    });
    service = TestBed.inject(DriveService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should build correct headers with auth token', () => {
    const headers = service.buildAuthHeaders();
    expect(headers!.get('Authorization')).toBe('Bearer test-token');
  });

  it('should return null headers when not authenticated', () => {
    authSpy.getAccessToken.mockReturnValue(null);
    expect(service.buildAuthHeaders()).toBeNull();
  });

  it('should store and retrieve folder ID', () => {
    service.setFolderId('folder-123');
    expect(service.getFolderId()).toBe('folder-123');
  });

  it('should persist folder ID to localStorage', () => {
    service.setFolderId('folder-456');
    expect(localStorage.getItem('kanbanflow_folder_id')).toBe('folder-456');
  });

  it('should load folder ID from localStorage on init', () => {
    localStorage.setItem('kanbanflow_folder_id', 'folder-789');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authSpy }],
    });
    const freshService = TestBed.inject(DriveService);
    expect(freshService.getFolderId()).toBe('folder-789');
  });
});
