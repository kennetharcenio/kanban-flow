import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start as not authenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should have null user initially', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('should store access token after sign in', () => {
    service.setAuthResponse({
      access_token: 'test-token',
      expires_in: 3600,
    });
    expect(service.getAccessToken()).toBe('test-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should store user profile', () => {
    service.setUserProfile({
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    });
    const user = service.currentUser();
    expect(user?.email).toBe('test@example.com');
    expect(user?.name).toBe('Test User');
  });

  it('should clear auth state on sign out', () => {
    service.setAuthResponse({ access_token: 'token', expires_in: 3600 });
    service.setUserProfile({ email: 'test@example.com', name: 'Test', picture: '' });
    service.signOut();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });
});
