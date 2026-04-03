import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-column-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Column</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Column Name</mat-label>
        <input matInput [(ngModel)]="name" placeholder="e.g., In Review" autofocus (keydown.enter)="create()" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="create()" [disabled]="!name.trim()">Create</button>
    </mat-dialog-actions>
  `,
})
export class ColumnDialogComponent {
  name = '';

  constructor(public dialogRef: MatDialogRef<ColumnDialogComponent>) {}

  create(): void {
    if (this.name.trim()) {
      this.dialogRef.close(this.name.trim());
    }
  }
}
