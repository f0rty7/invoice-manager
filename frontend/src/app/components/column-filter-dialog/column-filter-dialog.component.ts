import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import type { FilterOption } from '@pdf-invoice/shared';

export type ColumnFilterKind = 'multiselect' | 'daterange' | 'numberrange';
export type SortDir = '' | 'asc' | 'desc';

export interface ColumnFilterDialogData {
  title: string;
  kind: ColumnFilterKind;
  // Sort for *this* column only. '' means no sort selected.
  sortDir: SortDir;

  // Multi-select
  options?: FilterOption[];
  selected?: string[];

  // Date range (DD-MM-YYYY)
  dateFrom?: string | null;
  dateTo?: string | null;

  // Number range
  min?: number | null;
  max?: number | null;
}

export interface ColumnFilterDialogResult {
  sortDir: SortDir;
  selected?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  min?: number | null;
  max?: number | null;
}

@Component({
  selector: 'app-column-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './column-filter-dialog.component.html',
  styleUrls: ['./column-filter-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColumnFilterDialogComponent {
  private dialogRef = inject(MatDialogRef<ColumnFilterDialogComponent, ColumnFilterDialogResult>);
  readonly data = inject<ColumnFilterDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  readonly sortDir = signal<SortDir>(this.data.sortDir ?? '');

  // Multi-select state
  readonly searchText = signal('');
  readonly selectedSet = signal<Set<string>>(new Set(this.data.selected ?? []));

  readonly filteredOptions = computed(() => {
    const opts = this.data.options ?? [];
    const q = this.searchText().trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(o => o.value.toLowerCase().includes(q));
  });

  private readonly allOptionValues = computed(() => (this.data.options ?? []).map(o => o.value));

  readonly allSelected = computed(() => {
    const all = this.allOptionValues();
    if (all.length === 0) return false;
    const selected = this.selectedSet();
    return all.every(v => selected.has(v));
  });

  readonly someSelected = computed(() => {
    const all = this.allOptionValues();
    if (all.length === 0) return false;
    const selected = this.selectedSet();
    const any = all.some(v => selected.has(v));
    return any && !this.allSelected();
  });

  // Date + number inputs
  readonly form = this.fb.group({
    dateFrom: [this.parseDate(this.data.dateFrom ?? null)],
    dateTo: [this.parseDate(this.data.dateTo ?? null)],
    min: [this.data.min ?? null],
    max: [this.data.max ?? null],
  });

  readonly isRangeInvalid = computed(() => {
    if (this.data.kind === 'daterange') {
      const from = this.form.value.dateFrom ?? null;
      const to = this.form.value.dateTo ?? null;
      return !!(from && to && from.getTime() > to.getTime());
    }
    if (this.data.kind === 'numberrange') {
      const min = this.form.value.min;
      const max = this.form.value.max;
      return min !== null && min !== undefined && max !== null && max !== undefined && Number(min) > Number(max);
    }
    return false;
  });

  onSortChange(ev: MatButtonToggleChange): void {
    this.sortDir.set((ev.value ?? '') as SortDir);
  }

  close(): void {
    this.dialogRef.close();
  }

  clearAll(): void {
    this.sortDir.set('');

    if (this.data.kind === 'multiselect') {
      this.searchText.set('');
      this.selectedSet.set(new Set());
      return;
    }

    if (this.data.kind === 'daterange') {
      this.form.controls.dateFrom.setValue(null);
      this.form.controls.dateTo.setValue(null);
      return;
    }

    if (this.data.kind === 'numberrange') {
      this.form.controls.min.setValue(null);
      this.form.controls.max.setValue(null);
    }
  }

  toggleSelected(value: string, checked: boolean): void {
    const next = new Set(this.selectedSet());
    if (checked) next.add(value);
    else next.delete(value);
    this.selectedSet.set(next);
  }

  toggleSelectAll(): void {
    const all = this.allOptionValues();
    if (all.length === 0) return;

    if (this.allSelected()) {
      this.selectedSet.set(new Set());
      return;
    }

    this.selectedSet.set(new Set(all));
  }

  submit(): void {
    if (this.isRangeInvalid()) return;

    const result: ColumnFilterDialogResult = { sortDir: this.sortDir() };

    if (this.data.kind === 'multiselect') {
      result.selected = Array.from(this.selectedSet()).sort();
    } else if (this.data.kind === 'daterange') {
      result.dateFrom = this.formatDate(this.form.value.dateFrom ?? null);
      result.dateTo = this.formatDate(this.form.value.dateTo ?? null);
    } else if (this.data.kind === 'numberrange') {
      result.min = this.form.value.min ?? null;
      result.max = this.form.value.max ?? null;
    }

    this.dialogRef.close(result);
  }

  private parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return d;
  }

  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
}



