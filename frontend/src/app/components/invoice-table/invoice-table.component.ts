import { Component, ChangeDetectionStrategy, signal, inject, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { InvoiceStateService } from '../../services/invoice-state.service';
import type { Invoice, InvoiceFilters } from '@pdf-invoice/shared';

// Sort columns that map to server-side sort_by values
type SortColumn = 'date' | 'delivery_partner' | 'items_count' | 'total';
type SortDirection = 'asc' | 'desc';

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

  // OPTIMIZED: Use server-sorted data directly instead of client-side sorting
  invoices = this.invoiceState.invoices;
  loading = this.invoiceState.loading;
  loadingMore = this.invoiceState.loadingMore;
  error = this.invoiceState.error;
  total = this.invoiceState.total;
  hasMore = this.invoiceState.hasMore;
  filters = this.invoiceState.filters;
  
  @Input() showUploader = false;

  private readonly baseColumns = ['order_no', 'invoice_no', 'date', 'delivery_partner', 'items_count', 'total'] as const;

  get displayedColumns(): string[] {
    const cols: string[] = [...this.baseColumns];
    if (this.showUploader) {
      cols.push('uploaded_by');
    }
    cols.push('actions');
    return cols;
  }

  // Track current sort from filters (server-side)
  readonly currentSort = computed(() => {
    const f = this.filters();
    return {
      column: (f.sort_by || 'date') as SortColumn,
      direction: (f.sort_dir || 'desc') as SortDirection
    };
  });

  expandedInvoice = signal<string | null>(null);

  // OPTIMIZED: Request server-side sorting instead of client-side
  toggleSort(column: SortColumn): void {
    const current = this.currentSort();
    const newDirection: SortDirection = 
      current.column === column && current.direction === 'asc' ? 'desc' : 'asc';
    
    // Update filters to trigger server-side sort
    this.invoiceState.setFilters({
      ...this.filters(),
      sort_by: column,
      sort_dir: newDirection
    });
  }

  isSorted(column: SortColumn, direction?: SortDirection): boolean {
    const sort = this.currentSort();
    if (direction) return sort.column === column && sort.direction === direction;
    return sort.column === column;
  }

  getSortIcon(column: SortColumn): string {
    const sort = this.currentSort();
    if (sort.column !== column) return 'unfold_more';
    return sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  getAriaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.currentSort();
    if (sort.column !== column) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  toggleExpand(invoiceId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    requestAnimationFrame(() => {
      document.getElementById(invoiceId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (this.expandedInvoice() === invoiceId) {
      this.expandedInvoice.set(null);
    } else {
      this.expandedInvoice.set(invoiceId);
    }
  }

  isExpanded(invoiceId: string): boolean {
    return this.expandedInvoice() === invoiceId;
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 200; // pixels from bottom to trigger load
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    if (distanceFromBottom < threshold && this.hasMore() && !this.loadingMore()) {
      this.invoiceState.loadMoreInvoices();
    }
  }

  deleteInvoice(invoice: Invoice, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Delete invoice ${invoice.order_no}?`)) {
      if (invoice._id) {
        this.invoiceState.deleteInvoice(invoice._id);
      }
    }
  }

  trackById(index: number, invoice: Invoice): string {
    return invoice._id || index.toString();
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
