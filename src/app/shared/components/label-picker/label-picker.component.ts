import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Label } from '../../models/index.model';

@Component({
  selector: 'app-label-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './label-picker.component.html',
  styles: [`
    .label-list { display: flex; flex-direction: column; gap: 4px; }
    .label-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      transition: background 0.15s;
    }
    .label-item:hover { background: #334155; }
    .label-item.selected { background: #334155; }
    .label-dot { width: 12px; height: 12px; border-radius: 50%; }
    .label-name { font-size: 13px; color: #e2e8f0; }
  `],
})
export class LabelPickerComponent {
  @Input() labels: Label[] = [];
  @Input() selectedIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  isSelected(labelId: string): boolean {
    return this.selectedIds.includes(labelId);
  }

  toggle(labelId: string): void {
    const selected = this.isSelected(labelId)
      ? this.selectedIds.filter((id) => id !== labelId)
      : [...this.selectedIds, labelId];
    this.selectionChange.emit(selected);
  }
}
