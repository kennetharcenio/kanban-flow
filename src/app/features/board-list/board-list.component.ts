import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { v4 as uuidv4 } from 'uuid';
import { SyncService } from '../../core/sync/sync.service';
import { AuthService } from '../../core/auth/auth.service';
import { DriveService } from '../../core/drive/drive.service';
import { AppIndex, BoardSummary } from '../../shared/models/index.model';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { CreateBoardDialogComponent } from './create-board-dialog.component';
import { BoardSnapshot } from '../../shared/models/index.model';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MemberAvatarComponent],
  templateUrl: './board-list.component.html',
  styleUrl: './board-list.component.scss',
})
export class BoardListComponent implements OnInit {
  boards: BoardSummary[] = [];
  folderConnected = false;
  private appIndex: AppIndex = { boards: [], labels: [], version: 0 };

  constructor(
    public sync: SyncService,
    public auth: AuthService,
    private drive: DriveService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.folderConnected = !!this.drive.getFolderId();
    if (this.folderConnected) {
      await this.loadBoards();
    }
  }

  async setupFolder(): Promise<void> {
    const folderId = await this.drive.createFolder('KanbanFlow');
    this.drive.setFolderId(folderId);
    this.folderConnected = true;
    await this.loadBoards();
  }

  async connectFolder(): Promise<void> {
    const folderId = prompt('Paste the Google Drive folder ID shared with you:');
    if (folderId) {
      this.drive.setFolderId(folderId);
      this.folderConnected = true;
      await this.loadBoards();
    }
  }

  private async loadBoards(): Promise<void> {
    this.appIndex = await this.sync.loadIndex();
    this.boards = this.appIndex.boards;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateBoardDialogComponent, { width: '420px' });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.createBoard(result.name, result.description);
      }
    });
  }

  private async createBoard(name: string, description: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    const boardId = uuidv4();
    const folderId = this.drive.getFolderId();
    if (!folderId) return;

    // Create board folder in Drive
    const boardFolderId = await this.drive.createFolder(`board-${boardId}`, folderId);

    // Create initial state.json
    const initialSnapshot: BoardSnapshot = {
      board: {
        id: boardId,
        name,
        description,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        columns: [
          { id: uuidv4(), name: 'Backlog', order: 0, color: '#94a3b8' },
          { id: uuidv4(), name: 'In Progress', order: 1, color: '#60a5fa' },
          { id: uuidv4(), name: 'Review', order: 2, color: '#f59e0b' },
          { id: uuidv4(), name: 'Done', order: 3, color: '#4ade80' },
        ],
        members: [{ email: user.email, name: user.name, avatar: user.picture }],
      },
      cards: [],
      lastEventVersion: 0,
      snapshotAt: new Date().toISOString(),
      snapshotBy: user.email,
    };
    await this.drive.createJsonFile('state.json', boardFolderId, initialSnapshot);
    await this.drive.createJsonFile('events.json', boardFolderId, []);

    // Update index
    const summary: BoardSummary = {
      id: boardId,
      name,
      description,
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    };
    this.appIndex.boards.push(summary);
    this.appIndex.version++;
    await this.sync.saveIndex(this.appIndex);
    this.boards = [...this.appIndex.boards];
  }

  openBoard(boardId: string): void {
    this.router.navigate(['/boards', boardId]);
  }

  signOut(): void {
    this.auth.signOut();
    this.drive.clearFolderId();
  }
}
