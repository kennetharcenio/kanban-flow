import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../../core/auth/auth.service';
import { BoardSummary } from '../../shared/models/index.model';
import { BoardSnapshot } from '../../shared/models/index.model';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { CreateBoardDialogComponent } from './create-board-dialog.component';

const BOARDS_KEY = 'kanbanflow_boards';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MemberAvatarComponent],
  templateUrl: './board-list.component.html',
  styleUrl: './board-list.component.scss',
})
export class BoardListComponent implements OnInit {
  boards: BoardSummary[] = [];

  constructor(
    public auth: AuthService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBoards();
  }

  private loadBoards(): void {
    const raw = localStorage.getItem(BOARDS_KEY);
    this.boards = raw ? JSON.parse(raw) : [];
  }

  private saveBoards(): void {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(this.boards));
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateBoardDialogComponent, { width: '420px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createBoard(result.name, result.description);
      }
    });
  }

  private createBoard(name: string, description: string): void {
    const user = this.auth.currentUser();
    const boardId = uuidv4();

    const initialSnapshot: BoardSnapshot = {
      board: {
        id: boardId,
        name,
        description,
        createdBy: user?.email || 'dev@kanbanflow.local',
        createdAt: new Date().toISOString(),
        columns: [
          { id: uuidv4(), name: 'Backlog', order: 0, color: '#94a3b8' },
          { id: uuidv4(), name: 'In Progress', order: 1, color: '#60a5fa' },
          { id: uuidv4(), name: 'Review', order: 2, color: '#f59e0b' },
          { id: uuidv4(), name: 'Done', order: 3, color: '#4ade80' },
        ],
        members: [{
          email: user?.email || 'dev@kanbanflow.local',
          name: user?.name || 'Dev User',
          avatar: user?.picture || '',
        }],
      },
      cards: [],
      lastEventVersion: 0,
      snapshotAt: new Date().toISOString(),
      snapshotBy: user?.email || 'dev@kanbanflow.local',
    };

    // Save board state
    localStorage.setItem(`kanbanflow_board_${boardId}`, JSON.stringify(initialSnapshot));
    localStorage.setItem(`kanbanflow_events_${boardId}`, JSON.stringify([]));

    // Update board list
    const summary: BoardSummary = {
      id: boardId,
      name,
      description,
      createdBy: user?.email || 'dev@kanbanflow.local',
      createdAt: new Date().toISOString(),
    };
    this.boards = [...this.boards, summary];
    this.saveBoards();
  }

  openBoard(boardId: string): void {
    this.router.navigate(['/boards', boardId]);
  }

  signOut(): void {
    this.auth.signOut();
  }
}
