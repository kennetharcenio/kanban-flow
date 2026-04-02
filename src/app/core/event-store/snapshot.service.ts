import { Injectable } from '@angular/core';
import { DriveService } from '../drive/drive.service';
import { EventStoreService } from './event-store.service';
import { BoardSnapshot } from '../../shared/models/index.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SnapshotService {
  constructor(private drive: DriveService) {}

  shouldSnapshot(eventCount: number): boolean {
    return eventCount > 0 && eventCount % environment.snapshotEveryNEvents === 0;
  }

  buildSnapshot(eventStore: EventStoreService, userEmail: string): BoardSnapshot {
    const state = eventStore.getState();
    return {
      board: state.board,
      cards: state.cards,
      lastEventVersion: eventStore.getCurrentVersion(),
      snapshotAt: new Date().toISOString(),
      snapshotBy: userEmail,
    };
  }

  async saveSnapshot(boardFolderId: string, snapshot: BoardSnapshot): Promise<void> {
    const fileId = await this.drive.findFileInFolder(boardFolderId, 'state.json');
    if (fileId) {
      await this.drive.writeJsonFile(fileId, snapshot);
    } else {
      await this.drive.createJsonFile('state.json', boardFolderId, snapshot);
    }
  }
}
