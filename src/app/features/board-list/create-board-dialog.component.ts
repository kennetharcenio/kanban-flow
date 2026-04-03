import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-board-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
  templateUrl: './create-board-dialog.component.html',
})
export class CreateBoardDialogComponent {
  name = '';
  description = '';

  constructor(public dialogRef: MatDialogRef<CreateBoardDialogComponent>) {}

  create(): void {
    if (this.name.trim()) {
      this.dialogRef.close({ name: this.name.trim(), description: this.description.trim() });
    }
  }
}
