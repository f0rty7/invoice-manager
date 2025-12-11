import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface SaveFilterDialogData {
  existingNames: string[];
}

export interface SaveFilterDialogResult {
  name: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-save-filter-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Save Filter</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Filter Name</mat-label>
        <input matInput [(ngModel)]="filterName" placeholder="My Filter" required>
        @if (nameExists()) {
          <mat-error>A filter with this name already exists</mat-error>
        }
      </mat-form-field>
      <mat-checkbox [(ngModel)]="isDefault">Set as default filter</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="onSave()"
        [disabled]="!filterName.trim() || nameExists()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 280px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaveFilterDialogComponent {
  private dialogRef = inject(MatDialogRef<SaveFilterDialogComponent>);
  private data = inject<SaveFilterDialogData>(MAT_DIALOG_DATA);

  filterName = '';
  isDefault = false;

  nameExists(): boolean {
    return this.data.existingNames.includes(this.filterName.trim());
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.filterName.trim() && !this.nameExists()) {
      this.dialogRef.close({
        name: this.filterName.trim(),
        isDefault: this.isDefault
      } as SaveFilterDialogResult);
    }
  }
}
