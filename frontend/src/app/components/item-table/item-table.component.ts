import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { InvoiceStateService } from '../../services/invoice-state.service';
import type { FlatItem } from '@pdf-invoice/shared';

type SortColumn = 'date' | 'delivery_partner' | 'price' | 'qty';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-item-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule,
    ScrollingModule
  ],
  templateUrl: './item-table.component.html',
  styleUrls: ['./item-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemTableComponent {
  private invoiceState = inject(InvoiceStateService);

  items = this.invoiceState.items;
  loading = this.invoiceState.itemsLoading;
  loadingMore = this.invoiceState.itemsLoadingMore;
  error = this.invoiceState.itemsError;
  total = this.invoiceState.itemsTotal;
  hasMore = this.invoiceState.itemsHasMore;

  readonly displayedColumns = ['delivery_partner', 'date', 'order_no', 'description', 'category', 'qty', 'price'] as const;

  private sortState = signal<{ column: SortColumn; direction: SortDirection } | null>({
    column: 'date',
    direction: 'desc'
  });

  readonly sortedItems = computed(() => {
    const data = [...this.items()];
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
          const aName = a.delivery_partner?.toLowerCase() || '';
          const bName = b.delivery_partner?.toLowerCase() || '';
          return aName.localeCompare(bName) * direction;
        }
        case 'price': {
          const aPrice = a.price ?? 0;
          const bPrice = b.price ?? 0;
          return (aPrice - bPrice) * direction;
        }
        case 'qty': {
          return (a.qty - b.qty) * direction;
        }
        default:
          return 0;
      }
    });
  });

  toggleSort(column: SortColumn): void {
    this.sortState.update(current => {
      if (current?.column === column) {
        const nextDirection: SortDirection = current.direction === 'asc' ? 'desc' : 'asc';
        return { column, direction: nextDirection };
      }
      return { column, direction: 'asc' };
    });
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

  private parseDateMs(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
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

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 200;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    if (distanceFromBottom < threshold && this.hasMore() && !this.loadingMore()) {
      this.invoiceState.loadMoreItems();
    }
  }

  trackByItem(index: number, item: FlatItem): string {
    return `${item.invoice_id}-${item.sr}`;
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
