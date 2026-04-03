import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    if (environment.devBypassAuth) {
      this.auth.devBypass();
      return;
    }
    if (typeof google !== 'undefined') {
      this.auth.initializeGoogleAuth();
    }
  }

  signIn(): void {
    this.auth.signIn();
  }
}

declare const google: any;
