import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

interface AuthResponse {
  access_token: string;
  expires_in: number;
}

declare const google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private accessToken = signal<string | null>(null);
  private tokenExpiresAt = signal<number>(0);
  private user = signal<UserProfile | null>(null);
  private tokenClient: any = null;

  isAuthenticated(): boolean {
    return this.accessToken() !== null && Date.now() < this.tokenExpiresAt();
  }

  currentUser(): UserProfile | null {
    return this.user();
  }

  getAccessToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.accessToken();
  }

  setAuthResponse(response: AuthResponse): void {
    this.accessToken.set(response.access_token);
    this.tokenExpiresAt.set(Date.now() + response.expires_in * 1000);
  }

  setUserProfile(profile: UserProfile): void {
    this.user.set(profile);
  }

  initializeGoogleAuth(): void {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: environment.driveScope,
      callback: (response: any) => {
        if (response.access_token) {
          this.setAuthResponse(response);
          this.fetchUserProfile();
        }
      },
    });
  }

  signIn(): void {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    }
  }

  signOut(): void {
    const token = this.accessToken();
    if (token) {
      try {
        google.accounts.oauth2.revoke(token);
      } catch {
        // google GIS SDK may not be available (e.g., in tests)
      }
    }
    this.accessToken.set(null);
    this.tokenExpiresAt.set(0);
    this.user.set(null);
  }

  private async fetchUserProfile(): Promise<void> {
    const token = this.accessToken();
    if (!token) return;

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await response.json();
    this.setUserProfile({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
  }
}
