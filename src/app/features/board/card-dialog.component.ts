import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../shared/models/card.model';
import { Member } from '../../shared/models/board.model';

export interface CardDialogData {
  mode: 'create' | 'edit';
  card?: Card;
  members: Member[];
  columnName: string;
}

export interface CardDialogResult {
  action: 'save' | 'delete';
  card: {
    title: string;
    description: string;
    assignee: string | null;
    dueDate: string | null;
    labels: string[];
  };
}

@Component({
  selector: 'app-card-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './card-dialog.component.html',
  styleUrl: './card-dialog.component.scss',
})
export class CardDialogComponent {
  title = '';
  description = '';
  assignee: string | null = null;
  dueDate: string | null = null;
  labels: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<CardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CardDialogData
  ) {
    if (data.card) {
      this.title = data.card.title;
      this.description = data.card.description;
      this.assignee = data.card.assignee;
      this.dueDate = data.card.dueDate;
      this.labels = [...data.card.labels];
    }
  }

  save(): void {
    if (!this.title.trim()) return;
    this.dialogRef.close({
      action: 'save',
      card: {
        title: this.title.trim(),
        description: this.description.trim(),
        assignee: this.assignee || null,
        dueDate: this.dueDate || null,
        labels: this.labels,
      },
    } as CardDialogResult);
  }

  delete(): void {
    this.dialogRef.close({ action: 'delete' } as CardDialogResult);
  }
}
