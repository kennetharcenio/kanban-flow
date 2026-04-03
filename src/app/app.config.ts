import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { DriveService } from './core/drive/drive.service';
import { LocalDriveService } from './core/drive/local-drive.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    ...(environment.devBypassAuth
      ? [{ provide: DriveService, useClass: LocalDriveService }]
      : []),
  ],
};
