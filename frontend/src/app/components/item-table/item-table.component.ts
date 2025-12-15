import { Component, ChangeDetectionStrategy, inject, computed, signal, ViewChild, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import type { FlatItem } from '@pdf-invoice/shared';
import type { FilterOption, InvoiceFilters } from '@pdf-invoice/shared';

type SortColumn = 'date' | 'delivery_partner' | 'price' | 'qty' | 'category';
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
    ScrollingModule,
    MatDialogModule,
    ColumnHeaderMenuComponent
  ],
  templateUrl: './item-table.component.html',
  styleUrls: ['./item-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemTableComponent {
  private invoiceState = inject(InvoiceStateService);
  private invoiceService = inject(InvoiceService);
  private filterOptionsService = inject(FilterOptionsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  private viewportSub: Subscription | null = null;
  private currentViewport: CdkVirtualScrollViewport | null = null;

  @ViewChild(CdkVirtualScrollViewport)
  set viewport(vp: CdkVirtualScrollViewport | undefined) {
    if (!vp) return;
    if (this.currentViewport === vp) return;
    this.currentViewport = vp;
    // This can appear after initial render (e.g., when loading finishes), so attach here.
    this.viewportSub?.unsubscribe();
    this.viewportSub = vp.renderedRangeStream.pipe(
      skip(1), // Skip the initial emission to prevent premature loadMore trigger
      map(r => r.end),
      rxFilter(() => this.hasMore() && !this.loadingMore()),
      rxFilter(end => {
        const len = vp.getDataLength();
        return len > 0 && end >= len - 10;
      })
    ).subscribe(() => this.invoiceState.loadMoreItems());

    // If the viewport is created while this tab is active (e.g. after a loading branch),
    // force a re-measure so the first paint is correct.
    if (this.invoiceState.activeTab() === 'items') {
      requestAnimationFrame(() => this.currentViewport?.checkViewportSize());
    }
  }

  items = this.invoiceState.items;
  loading = this.invoiceState.itemsLoading;
  loadingMore = this.invoiceState.itemsLoadingMore;
  error = this.invoiceState.itemsError;
  total = this.invoiceState.itemsTotal;
  hasMore = this.invoiceState.itemsHasMore;
  itemsFilters = this.invoiceState.itemsFilters;
  aggregate = this.invoiceState.itemsAggregate;

  readonly displayedColumns = ['delivery_partner', 'date', 'order_no', 'description', 'category', 'qty', 'price'] as const;

  readonly currentSort = computed<{ column: SortColumn; direction: SortDirection } | null>(() => {
    const f = this.itemsFilters();
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

  // Filter options from shared service
  partnerOptions = this.filterOptionsService.partners;
  categoryOptions = this.filterOptionsService.categories;

  constructor() {
    this.destroyRef.onDestroy(() => this.viewportSub?.unsubscribe());
    // Load filter options via shared service (prevents duplicate calls)
    this.filterOptionsService.loadFilterOptions();

    // FIX: When switching back to this tab, the viewport was hidden (display:none),
    // so CDK virtual scroll may not recalculate until the user scrolls.
    effect(() => {
      if (this.invoiceState.activeTab() !== 'items') return;
      requestAnimationFrame(() => this.currentViewport?.checkViewportSize());
    });
  }

  readonly rowHeightPx = 50;
  readonly viewportHeightPx = 520;

  // loadMore is attached in the @ViewChild setter once the viewport exists.

  isColumnActive(column: SortColumn): boolean {
    const f = this.itemsFilters();
    const sort = this.currentSort();
    const isSorted = sort?.column === column;
    switch (column) {
      case 'delivery_partner':
        return isSorted || !!(f.delivery_partners?.length) || !!f.delivery_partner;
      case 'category':
        return isSorted || !!(f.categories?.length);
      case 'date':
        return isSorted || !!f.date_from || !!f.date_to;
      case 'qty':
        return isSorted || f.item_qty_min !== undefined || f.item_qty_max !== undefined;
      case 'price':
        return isSorted || f.price_min !== undefined || f.price_max !== undefined;
      default:
        return isSorted;
    }
  }

  private applySortPatch(next: any, sortByForColumn: InvoiceFilters['sort_by'], sortDir: SortDir): void {
    if (sortDir) {
      next.sort_by = sortByForColumn;
      next.sort_dir = sortDir;
    } else if (next.sort_by === sortByForColumn) {
      delete next.sort_by;
      delete next.sort_dir;
    }
  }

  openPartnerDialog(): void {
    const f = this.itemsFilters();
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
      const next: any = { ...this.itemsFilters() };
      this.applySortPatch(next, 'delivery_partner', result.sortDir);

      const selected = (result.selected ?? []).filter(Boolean);
      if (selected.length) next.delivery_partners = selected;
      else delete next.delivery_partners;
      delete next.delivery_partner;

      this.invoiceState.setItemsFilters(next);
    });
  }

  openCategoryDialog(): void {
    const f = this.itemsFilters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'category' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Category',
        kind: 'multiselect',
        sortDir,
        options: this.categoryOptions(),
        selected: f.categories ?? []
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.itemsFilters() };
      this.applySortPatch(next, 'category', result.sortDir);

      const selected = (result.selected ?? []).filter(Boolean);
      if (selected.length) next.categories = selected;
      else delete next.categories;

      this.invoiceState.setItemsFilters(next);
    });
  }

  openDateDialog(): void {
    const f = this.itemsFilters();
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
      const next: any = { ...this.itemsFilters() };
      this.applySortPatch(next, 'date', result.sortDir);

      if (result.dateFrom) next.date_from = result.dateFrom;
      else delete next.date_from;
      if (result.dateTo) next.date_to = result.dateTo;
      else delete next.date_to;

      this.invoiceState.setItemsFilters(next);
    });
  }

  openQtyDialog(): void {
    const f = this.itemsFilters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'qty' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Qty',
        kind: 'numberrange',
        sortDir,
        min: (f.item_qty_min ?? null) as any,
        max: (f.item_qty_max ?? null) as any
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.itemsFilters() };
      this.applySortPatch(next, 'qty', result.sortDir);

      if (result.min !== null && result.min !== undefined) next.item_qty_min = Number(result.min);
      else delete next.item_qty_min;
      if (result.max !== null && result.max !== undefined) next.item_qty_max = Number(result.max);
      else delete next.item_qty_max;

      this.invoiceState.setItemsFilters(next);
    });
  }

  openPriceDialog(): void {
    const f = this.itemsFilters();
    const sort = this.currentSort();
    const sortDir: SortDir = sort?.column === 'price' ? sort.direction : '';

    const ref = this.dialog.open(ColumnFilterDialogComponent, {
      width: '420px',
      data: {
        title: 'Price',
        kind: 'numberrange',
        sortDir,
        min: (f.price_min ?? null) as any,
        max: (f.price_max ?? null) as any
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const next: any = { ...this.itemsFilters() };
      this.applySortPatch(next, 'price', result.sortDir);

      if (result.min !== null && result.min !== undefined) next.price_min = Number(result.min);
      else delete next.price_min;
      if (result.max !== null && result.max !== undefined) next.price_max = Number(result.max);
      else delete next.price_max;

      this.invoiceState.setItemsFilters(next);
    });
  }

  // Load-more is triggered via virtual-scroll viewport near-end detection.

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
