import { Component, ChangeDetectionStrategy, inject, computed, Input, ViewChild, DestroyRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { map, filter as rxFilter, skip } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { InvoiceStateService } from '../../services/invoice-state.service';
import { InvoiceService } from '../../services/invoice.service';
import { FilterOptionsService } from '../../services/filter-options.service';
import { ColumnHeaderMenuComponent } from '../column-header-menu/column-header-menu.component';
import { ColumnFilterDialogComponent, type SortDir } from '../column-filter-dialog/column-filter-dialog.component';
import { InvoiceItemsDialogComponent } from '../invoice-items-dialog/invoice-items-dialog.component';
import type { Invoice, InvoiceFilters } from '@pdf-invoice/shared';
import type { FilterOption } from '@pdf-invoice/shared';

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
    ScrollingModule,
    MatDialogModule,
    ColumnHeaderMenuComponent
  ],
  templateUrl: './invoice-table.component.html',
  styleUrls: ['./invoice-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class InvoiceTableComponent {
  private invoiceState = inject(InvoiceStateService);
  private invoiceService = inject(InvoiceService);
  private filterOptionsService = inject(FilterOptionsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  private viewportSub: Subscription | null = null;
  private currentViewport: CdkVirtualScrollViewport | null = null;
  private hasSkippedInitialEmission = false;

  @ViewChild(CdkVirtualScrollViewport)
  set viewport(vp: CdkVirtualScrollViewport | undefined) {
    if (!vp) return;
    // Only resubscribe if this is a different viewport instance
    if (this.currentViewport === vp) return;
    
    this.currentViewport = vp;
    this.viewportSub?.unsubscribe();
    
    // Keep the trigger consistent with ItemTable (this is reliable when itemSize matches row height).
    this.viewportSub = vp.renderedRangeStream.pipe(
      rxFilter(() => {
        // Skip the very first emission globally (not per subscription)
        if (!this.hasSkippedInitialEmission) {
          this.hasSkippedInitialEmission = true;
          return false;
        }
        return true;
      }),
      map(r => r.end),
      rxFilter(() => this.hasMore() && !this.loadingMore()),
      rxFilter(end => {
        const len = vp.getDataLength();
        return len > 0 && end >= len - 10;
      })
    ).subscribe(() => this.invoiceState.loadMoreInvoices());
  }

  // OPTIMIZED: Use server-sorted data directly instead of client-side sorting
  invoices = this.invoiceState.invoices;
  loading = this.invoiceState.loading;
  loadingMore = this.invoiceState.loadingMore;
  error = this.invoiceState.error;
  total = this.invoiceState.total;
  hasMore = this.invoiceState.hasMore;
  filters = this.invoiceState.filters;
  aggregate = this.invoiceState.invoiceAggregate;
  
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

  // Track current sort from filters (server-side). If no sort is set, treat as "no sort selected"
  // so the UI doesn't show a default active sort.
  readonly currentSort = computed<{ column: SortColumn; direction: SortDirection } | null>(() => {
    const f = this.filters();
    const column = f.sort_by as SortColumn | undefined;
    const direction = f.sort_dir as SortDirection | undefined;

    if (!column || !direction) return null;
    return { column, direction };
  });

  getAriaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    const sort = this.currentSort();
    if (!sort || sort.column !== column) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  // Filter options for header dialogs (from shared service)
  partnerOptions = this.filterOptionsService.partners;

  readonly rowHeightPx = 56;
  readonly viewportHeightPx = 520;

  constructor() {
    this.destroyRef.onDestroy(() => this.viewportSub?.unsubscribe());
    // Load filter options via shared service (prevents duplicate calls)
    this.filterOptionsService.loadFilterOptions();
  }

  isColumnActive(column: SortColumn): boolean {
    const f = this.filters();
    const sort = this.currentSort();
    const isSorted = sort?.column === column;
    switch (column) {
      case 'date':
        return isSorted || !!f.date_from || !!f.date_to;
      case 'delivery_partner':
        return isSorted || !!f.delivery_partner || !!(f.delivery_partners?.length);
      case 'items_count':
        return isSorted || f.items_count_min !== undefined || f.items_count_max !== undefined;
      case 'total':
        return isSorted || f.price_min !== undefined || f.price_max !== undefined;
      default:
        return isSorted;
    }
  }

  openDateDialog(): void {
    const f = this.filters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'date' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Date',
        kind: 'daterange',
        sortDir,
        dateFrom: f.date_from ?? null,
        dateTo: f.date_to ?? null
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.filters() };

      // Sort for this column
      if (result.sortDir) {
        next.sort_by = 'date';
        next.sort_dir = result.sortDir;
      } else if (next.sort_by === 'date') {
        delete next.sort_by;
        delete next.sort_dir;
      }

      // Date range
      if (result.dateFrom) next.date_from = result.dateFrom;
      else delete next.date_from;
      if (result.dateTo) next.date_to = result.dateTo;
      else delete next.date_to;

      this.invoiceState.setInvoiceFilters(next);
    });
  }

  openPartnerDialog(): void {
    const f = this.filters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'delivery_partner' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Partner',
        kind: 'multiselect',
        sortDir,
        options: this.partnerOptions(),
        selected: f.delivery_partners ?? (f.delivery_partner ? [f.delivery_partner] : [])
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.filters() };

      if (result.sortDir) {
        next.sort_by = 'delivery_partner';
        next.sort_dir = result.sortDir;
      } else if (next.sort_by === 'delivery_partner') {
        delete next.sort_by;
        delete next.sort_dir;
      }

      const selected = (result.selected ?? []).filter(Boolean);
      if (selected.length) {
        next.delivery_partners = selected;
      } else {
        delete next.delivery_partners;
      }
      // Keep legacy single partner cleared when using multiselect
      delete next.delivery_partner;

      this.invoiceState.setInvoiceFilters(next);
    });
  }

  openItemsCountDialog(): void {
    const f = this.filters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'items_count' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Items',
        kind: 'numberrange',
        sortDir,
        min: (f.items_count_min ?? null) as any,
        max: (f.items_count_max ?? null) as any
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.filters() };

      if (result.sortDir) {
        next.sort_by = 'items_count';
        next.sort_dir = result.sortDir;
      } else if (next.sort_by === 'items_count') {
        delete next.sort_by;
        delete next.sort_dir;
      }

      if (result.min !== null && result.min !== undefined) next.items_count_min = Number(result.min);
      else delete next.items_count_min;
      if (result.max !== null && result.max !== undefined) next.items_count_max = Number(result.max);
      else delete next.items_count_max;

      this.invoiceState.setInvoiceFilters(next);
    });
  }

  openTotalDialog(): void {
    const f = this.filters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'total' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Total',
        kind: 'numberrange',
        sortDir,
        min: (f.price_min ?? null) as any,
        max: (f.price_max ?? null) as any
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.filters() };

      if (result.sortDir) {
        next.sort_by = 'total';
        next.sort_dir = result.sortDir;
      } else if (next.sort_by === 'total') {
        delete next.sort_by;
        delete next.sort_dir;
      }

      if (result.min !== null && result.min !== undefined) next.price_min = Number(result.min);
      else delete next.price_min;
      if (result.max !== null && result.max !== undefined) next.price_max = Number(result.max);
      else delete next.price_max;

      this.invoiceState.setInvoiceFilters(next);
    });
  }

  openInvoiceItems(invoice: Invoice, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open(InvoiceItemsDialogComponent, {
      width: '980px',
      maxWidth: '95vw',
      data: { invoice }
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
