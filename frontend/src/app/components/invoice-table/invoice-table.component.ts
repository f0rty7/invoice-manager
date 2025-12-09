import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { InvoiceStateService } from '../../services/invoice-state.service';
import type { Invoice } from '@pdf-invoice/shared';

@Component({
  selector: 'app-invoice-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatCardModule,
    ScrollingModule
  ],
  templateUrl: './invoice-table.component.html',
  styleUrls: ['./invoice-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceTableComponent {
  private invoiceState = inject(InvoiceStateService);

  invoices = this.invoiceState.invoices;
  loading = this.invoiceState.loading;
  error = this.invoiceState.error;
  total = this.invoiceState.total;
  hasMore = this.invoiceState.hasMore;
  filters = this.invoiceState.filters;
  
  displayedColumns = ['order_no', 'date', 'delivery_partner', 'items_count', 'total', 'actions'];
  expandedInvoice = signal<string | null>(null);

  toggleExpand(orderNo: string): void {
    if (this.expandedInvoice() === orderNo) {
      this.expandedInvoice.set(null);
    } else {
      this.expandedInvoice.set(orderNo);
    }
  }

  isExpanded(orderNo: string): boolean {
    return this.expandedInvoice() === orderNo;
  }

  onPageChange(event: PageEvent): void {
    this.invoiceState.setFilters({ 
      page: event.pageIndex + 1, 
      limit: event.pageSize 
    });
  }

  deleteInvoice(invoice: Invoice, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Delete invoice ${invoice.order_no}?`)) {
      if (invoice._id) {
        this.invoiceState.deleteInvoice(invoice._id);
      }
    }
  }

  trackByOrderNo(index: number, invoice: Invoice): string {
    return invoice.order_no?.toString() || index.toString();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    return dateStr;
  }

  getOrderNoDisplay(orderNo: string | string[] | null): string {
    if (!orderNo) return 'N/A';
    if (Array.isArray(orderNo)) return orderNo.join(', ');
    return orderNo;
  }
}

