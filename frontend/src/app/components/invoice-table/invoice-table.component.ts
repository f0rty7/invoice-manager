import { Component, ChangeDetectionStrategy, signal, inject, computed, Input } from '@angular/core';
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
  
  @Input() showUploader = false;

  private readonly baseColumns = ['order_no', 'date', 'delivery_partner', 'items_count', 'total'] as const;

  get displayedColumns(): string[] {
    const cols: string[] = [...this.baseColumns];
    if (this.showUploader) {
      cols.push('uploaded_by');
    }
    cols.push('actions');
    return cols;
  }

  private sortState = signal<{ column: SortColumn; direction: SortDirection } | null>({
    column: 'date',
    direction: 'desc'
  });

  readonly sortedInvoices = computed(() => {
    const data = [...this.invoices()];
    const sort = this.sortState();

    if (!sort) return data;

    return data.sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;

      switch (sort.column) {
        case 'date': {
          const aDate = this.parseDateMs(a.date);
          const bDate = this.parseDateMs(b.date);
          return (aDate - bDate) * direction;
        }
        case 'delivery_partner': {
          const aName = a.delivery_partner?.known_name?.toLowerCase() || '';
          const bName = b.delivery_partner?.known_name?.toLowerCase() || '';
          return aName.localeCompare(bName) * direction;
        }
        case 'items_count': {
          const aCount = a.items?.length || 0;
          const bCount = b.items?.length || 0;
          return (aCount - bCount) * direction;
        }
        case 'total': {
          const aTotal = a.items_total ?? 0;
          const bTotal = b.items_total ?? 0;
          return (aTotal - bTotal) * direction;
        }
        default:
          return 0;
      }
    });
  });

  expandedInvoice = signal<string | null>(null);

  toggleSort(column: SortColumn): void {
    this.sortState.update(current => {
      if (current?.column === column) {
        const nextDirection: SortDirection = current.direction === 'asc' ? 'desc' : 'asc';
        return { column, direction: nextDirection };
      }
      return { column, direction: 'asc' };
    });
  }

  isSorted(column: SortColumn, direction?: SortDirection): boolean {
    const sort = this.sortState();
    if (!sort) return false;
    if (direction) return sort.column === column && sort.direction === direction;
    return sort.column === column;
  }

  getSortIcon(column: SortColumn): string {
    const sort = this.sortState();
    if (!sort || sort.column !== column) return 'unfold_more';
    return sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  getAriaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.sortState();
    if (!sort || sort.column !== column) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

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

  private parseDateMs(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    // Handle both ISO-like and dd-mm-yyyy formats
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parsed = Date.parse(dateStr);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const isoLike = `${yyyy}-${mm}-${dd}`;
      const parsed = Date.parse(isoLike);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    const fallback = Date.parse(dateStr);
    return Number.isNaN(fallback) ? 0 : fallback;
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

