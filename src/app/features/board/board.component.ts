import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription, combineLatest } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { MatDialog } from '@angular/material/dialog';
import { SyncService } from '../../core/sync/sync.service';
import { AuthService } from '../../core/auth/auth.service';
import { EventStoreService } from '../../core/event-store/event-store.service';
import { Board, Column } from '../../shared/models/board.model';
import { Card } from '../../shared/models/card.model';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CardDialogComponent, CardDialogData, CardDialogResult } from './card-dialog.component';
import { MemberDialogComponent, MemberDialogData, MemberDialogResult } from './member-dialog.component';

export interface ColumnWithCards {
  column: Column;
  cards: Card[];
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    DragDropModule,
    MemberAvatarComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit, OnDestroy {
  board: Board | null = null;
  columnsWithCards: ColumnWithCards[] = [];
  loading = true;
  error: string | null = null;

  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public sync: SyncService,
    public auth: AuthService,
    private eventStore: EventStoreService,
    private dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    const boardId = this.route.snapshot.paramMap.get('id');
    if (!boardId) {
      this.router.navigate(['/boards']);
      return;
    }

    try {
      await this.sync.loadBoard(boardId);
      this.loading = false;

      const combined$ = combineLatest([
        this.eventStore.columns$,
        this.eventStore.cards$,
        this.eventStore.board$,
      ]);

      this.subs.add(
        combined$.subscribe(([columns, cards, board]) => {
          this.board = board;
          this.columnsWithCards = columns.map((col) => ({
            column: col,
            cards: cards
              .filter((c) => c.columnId === col.id)
              .sort((a, b) => a.order - b.order),
          }));
        })
      );

      this.sync.startPolling();
    } catch (err: any) {
      this.loading = false;
      this.error = err.message || 'Failed to load board';
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.sync.stopPolling();
  }

  goBack(): void {
    this.router.navigate(['/boards']);
  }

  getColumnConnectedLists(columnId: string): string[] {
    return this.columnsWithCards
      .filter((c) => c.column.id !== columnId)
      .map((c) => 'column-' + c.column.id);
  }

  dropCard(event: CdkDragDrop<Card[]>, targetColumn: Column): void {
    const user = this.auth.currentUser();
    if (!user) return;

    if (event.previousContainer === event.container) {
      // Reorder within same column
      const cards = [...event.container.data];
      moveItemInArray(cards, event.previousIndex, event.currentIndex);
      cards.forEach((card, i) => {
        if (card.order !== i) {
          this.eventStore.dispatch('CARD_MOVED', {
            cardId: card.id,
            columnId: targetColumn.id,
            order: i,
          }, user.email);
        }
      });
    } else {
      // Move to different column
      const prev = [...event.previousContainer.data];
      const curr = [...event.container.data];
      transferArrayItem(prev, curr, event.previousIndex, event.currentIndex);

      // Update moved card
      const movedCard = curr[event.currentIndex];
      this.eventStore.dispatch('CARD_MOVED', {
        cardId: movedCard.id,
        columnId: targetColumn.id,
        order: event.currentIndex,
      }, user.email);

      // Reorder remaining cards in target column
      curr.forEach((card, i) => {
        if (card.id !== movedCard.id && card.order !== i) {
          this.eventStore.dispatch('CARD_MOVED', {
            cardId: card.id,
            columnId: targetColumn.id,
            order: i,
          }, user.email);
        }
      });

      // Reorder source column
      prev.forEach((card, i) => {
        if (card.order !== i) {
          this.eventStore.dispatch('CARD_MOVED', {
            cardId: card.id,
            columnId: card.columnId,
            order: i,
          }, user.email);
        }
      });
    }
  }

  getColumnCardCount(colWithCards: ColumnWithCards): number {
    return colWithCards.cards.length;
  }

  openCreateCardDialog(column: Column, cardCount: number): void {
    if (!this.board) return;
    const dialogRef = this.dialog.open(CardDialogComponent, {
      width: '480px',
      data: {
        mode: 'create',
        members: this.board.members,
        columnName: column.name,
      } as CardDialogData,
    });

    dialogRef.afterClosed().subscribe((result: CardDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;
      const user = this.auth.currentUser();
      if (!user) return;

      this.eventStore.dispatch('CARD_CREATED', {
        cardId: uuidv4(),
        title: result.card.title,
        description: result.card.description,
        columnId: column.id,
        order: cardCount,
        assignee: result.card.assignee,
        dueDate: result.card.dueDate,
        labels: result.card.labels,
      }, user.email);
    });
  }

  openEditCardDialog(card: Card, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.board) return;

    const column = this.board.columns.find((c) => c.id === card.columnId);
    const dialogRef = this.dialog.open(CardDialogComponent, {
      width: '480px',
      data: {
        mode: 'edit',
        card,
        members: this.board.members,
        columnName: column?.name || '',
      } as CardDialogData,
    });

    dialogRef.afterClosed().subscribe((result: CardDialogResult | undefined) => {
      if (!result) return;
      const user = this.auth.currentUser();
      if (!user) return;

      if (result.action === 'delete') {
        this.confirmDeleteCard(card);
      } else if (result.action === 'save') {
        this.eventStore.dispatch('CARD_UPDATED', {
          cardId: card.id,
          title: result.card.title,
          description: result.card.description,
          assignee: result.card.assignee,
          dueDate: result.card.dueDate,
          labels: result.card.labels,
        }, user.email);
      }
    });
  }

  // --- Column management ---

  addColumn(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const name = prompt('Column name:');
    if (!name?.trim()) return;

    const order = this.columnsWithCards.length;
    const colors = ['#94a3b8', '#60a5fa', '#f59e0b', '#4ade80', '#ec4899', '#6366f1'];
    this.eventStore.dispatch('COLUMN_CREATED', {
      columnId: uuidv4(),
      name: name.trim(),
      order,
      color: colors[order % colors.length],
    }, user.email);
  }

  renameColumn(column: Column): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const name = prompt('New column name:', column.name);
    if (!name?.trim() || name.trim() === column.name) return;

    this.eventStore.dispatch('COLUMN_UPDATED', {
      columnId: column.id,
      name: name.trim(),
    }, user.email);
  }

  changeColumnColor(column: Column): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const colors = ['#94a3b8', '#60a5fa', '#f59e0b', '#4ade80', '#ec4899', '#6366f1', '#f43f5e', '#a78bfa'];
    const currentIdx = colors.indexOf(column.color);
    const nextColor = colors[(currentIdx + 1) % colors.length];

    this.eventStore.dispatch('COLUMN_UPDATED', {
      columnId: column.id,
      color: nextColor,
    }, user.email);
  }

  moveColumnLeft(column: Column): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const idx = this.columnsWithCards.findIndex((c) => c.column.id === column.id);
    if (idx <= 0) return;

    const prev = this.columnsWithCards[idx - 1].column;
    this.eventStore.dispatch('COLUMN_MOVED', { columnId: column.id, order: prev.order }, user.email);
    this.eventStore.dispatch('COLUMN_MOVED', { columnId: prev.id, order: column.order }, user.email);
  }

  moveColumnRight(column: Column): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const idx = this.columnsWithCards.findIndex((c) => c.column.id === column.id);
    if (idx >= this.columnsWithCards.length - 1) return;

    const next = this.columnsWithCards[idx + 1].column;
    this.eventStore.dispatch('COLUMN_MOVED', { columnId: column.id, order: next.order }, user.email);
    this.eventStore.dispatch('COLUMN_MOVED', { columnId: next.id, order: column.order }, user.email);
  }

  deleteColumn(column: Column, cardCount: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Delete Column',
        message: cardCount > 0
          ? `"${column.name}" has ${cardCount} card(s). They will be deleted too. Continue?`
          : `Delete column "${column.name}"?`,
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      const user = this.auth.currentUser();
      if (!user) return;
      this.eventStore.dispatch('COLUMN_DELETED', { columnId: column.id }, user.email);
    });
  }

  // --- Member management ---

  openMemberDialog(): void {
    const user = this.auth.currentUser();
    if (!this.board || !user) return;

    const dialogRef = this.dialog.open(MemberDialogComponent, {
      width: '420px',
      data: {
        members: this.board.members,
        currentUserEmail: user.email,
      } as MemberDialogData,
    });

    dialogRef.afterClosed().subscribe((result: MemberDialogResult | undefined) => {
      if (!result) return;
      if (!user) return;

      if (result.action === 'add') {
        this.eventStore.dispatch('MEMBER_ADDED', {
          email: result.email,
          name: result.name || result.email,
          avatar: '',
        }, user.email);
      } else if (result.action === 'remove') {
        this.eventStore.dispatch('MEMBER_REMOVED', {
          email: result.email,
        }, user.email);
      }
    });
  }

  private confirmDeleteCard(card: Card): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Delete Card',
        message: `Are you sure you want to delete "${card.title}"?`,
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      const user = this.auth.currentUser();
      if (!user) return;
      this.eventStore.dispatch('CARD_DELETED', { cardId: card.id }, user.email);
    });
  }
}
