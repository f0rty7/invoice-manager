import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import type { Invoice, InvoiceItem } from '@pdf-invoice/shared';

export interface InvoiceItemsDialogData {
  invoice: Invoice;
}

@Component({
  selector: 'app-invoice-items-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './invoice-items-dialog.component.html',
  styleUrls: ['./invoice-items-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceItemsDialogComponent {
  private dialogRef = inject(MatDialogRef<InvoiceItemsDialogComponent>);
  readonly data = inject<InvoiceItemsDialogData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['sr', 'description', 'category', 'qty', 'unit_price', 'price'] as const;

  get invoice(): Invoice {
    return this.data.invoice;
  }

  get items(): InvoiceItem[] {
    return this.data.invoice.items ?? [];
  }

  close(): void {
    this.dialogRef.close();
  }
}


