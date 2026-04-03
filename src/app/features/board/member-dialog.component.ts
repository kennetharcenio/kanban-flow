import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Member } from '../../shared/models/board.model';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';

export interface MemberDialogData {
  members: Member[];
  currentUserEmail: string;
}

export interface MemberDialogResult {
  action: 'add' | 'remove';
  email: string;
  name?: string;
}

@Component({
  selector: 'app-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MemberAvatarComponent,
  ],
  templateUrl: './member-dialog.component.html',
  styleUrl: './member-dialog.component.scss',
})
export class MemberDialogComponent {
  newEmail = '';

  constructor(
    public dialogRef: MatDialogRef<MemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MemberDialogData
  ) {}

  addMember(): void {
    const email = this.newEmail.trim();
    if (!email || !email.includes('@')) return;
    if (this.data.members.some((m) => m.email === email)) return;

    this.dialogRef.close({
      action: 'add',
      email,
      name: email.split('@')[0],
    } as MemberDialogResult);
  }

  removeMember(member: Member): void {
    this.dialogRef.close({
      action: 'remove',
      email: member.email,
    } as MemberDialogResult);
  }

  isCurrentUser(member: Member): boolean {
    return member.email === this.data.currentUserEmail;
  }
}
