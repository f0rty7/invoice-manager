import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-column-header-menu',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './column-header-menu.component.html',
  styleUrls: ['./column-header-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColumnHeaderMenuComponent {
  @Input({ required: true }) label!: string;
  @Input() active = false;
  @Input() tooltip = 'Sort & filter';

  @Output() open = new EventEmitter<void>();

  onOpenClick(event: MouseEvent): void {
    event.stopPropagation();
    this.open.emit();
  }
}



