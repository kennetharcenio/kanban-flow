import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-member-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-avatar.component.html',
  styles: [`
    .avatar {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: white;
      overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
  `],
})
export class MemberAvatarComponent {
  @Input() name = '';
  @Input() avatar = '';
  @Input() size = 24;
  @Input() bgColor = '#6366f1';

  get initials(): string {
    return this.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get styles() {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`,
      fontSize: `${this.size * 0.4}px`,
      backgroundColor: this.avatar ? 'transparent' : this.bgColor,
    };
  }
}
