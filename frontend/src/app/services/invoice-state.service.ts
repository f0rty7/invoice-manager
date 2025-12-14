import { Injectable, signal, computed, inject } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap, debounceTime, catchError, filter, map, distinctUntilChanged } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { InvoiceService } from '../services/invoice.service';
import type { Invoice, InvoiceFilters, InvoiceStats, FlatItem } from '@pdf-invoice/shared';

// Type for query filters (excludes pagination)
type QueryFilters = Omit<InvoiceFilters, 'page' | 'limit'>;

@Injectable({
  providedIn: 'root'
})
export class InvoiceStateService {
  private invoiceService = inject(InvoiceService);

  // Separate query filters from pagination (and split invoices vs items)
  private invoiceQueryFiltersSignal = signal<QueryFilters>({});
  private invoicePageSignal = signal(1);
  private limitSignal = signal(20);
  private activeTabSignal = signal<'invoices' | 'items'>('invoices');

  // Angular 21: State signals - Invoices
  private invoicesSignal = signal<Invoice[]>([]);
  private statsSignal = signal<InvoiceStats | null>(null);
  private loadingSignal = signal(false);
  private loadingMoreSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private totalSignal = signal(0);
  private hasMoreSignal = signal(false);

  // Angular 21: State signals - Items
  private itemsSignal = signal<FlatItem[]>([]);
  private itemsQueryFiltersSignal = signal<QueryFilters>({});
  private itemsPageSignal = signal(1);
  private itemsLoadingSignal = signal(false);
  private itemsLoadingMoreSignal = signal(false);
  private itemsErrorSignal = signal<string | null>(null);
  private itemsTotalSignal = signal(0);
  private itemsHasMoreSignal = signal(false);
  private itemsLoadedSignal = signal(false); // Track if items have been loaded

  // Aggregates (all filtered rows)
  private invoiceAggregateSignal = signal<{ total_amount: number; total_count: number } | null>(null);
  private itemsAggregateSignal = signal<{ total_price: number; total_count: number } | null>(null);

  // Computed: Full filters object (combines query + pagination)
  readonly filters = computed<InvoiceFilters>(() => ({
    ...this.invoiceQueryFiltersSignal(),
    page: this.invoicePageSignal(),
    limit: this.limitSignal()
  }));

  // Angular 21: Public readonly signals - Invoices
  readonly invoices = this.invoicesSignal.asReadonly();
  readonly stats = this.statsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loadingMore = this.loadingMoreSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly hasMore = this.hasMoreSignal.asReadonly();

  // Angular 21: Public readonly signals - Items
  readonly items = this.itemsSignal.asReadonly();
  readonly itemsFilters = computed<InvoiceFilters>(() => ({
    ...this.itemsQueryFiltersSignal(),
    page: this.itemsPageSignal(),
    limit: this.limitSignal()
  }));
  readonly itemsLoading = this.itemsLoadingSignal.asReadonly();
  readonly itemsLoadingMore = this.itemsLoadingMoreSignal.asReadonly();
  readonly itemsError = this.itemsErrorSignal.asReadonly();
  readonly itemsTotal = this.itemsTotalSignal.asReadonly();
  readonly itemsHasMore = this.itemsHasMoreSignal.asReadonly();
  readonly activeTab = this.activeTabSignal.asReadonly();
  readonly invoiceAggregate = this.invoiceAggregateSignal.asReadonly();
  readonly itemsAggregate = this.itemsAggregateSignal.asReadonly();

  // Angular 21: Computed signals for derived state
  readonly totalAmount = computed(() => {
    return this.invoicesSignal()
      .reduce((sum, inv) => sum + (inv.items_total || 0), 0);
  });

  readonly invoicesByCategory = computed(() => {
    const invoices = this.invoicesSignal();
    const byCategory: Record<string, Invoice[]> = {};
    
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!byCategory[item.category]) {
          byCategory[item.category] = [];
        }
        byCategory[item.category].push(inv);
      });
    });
    
    return byCategory;
  });

  // Angular 21: Computed signal for page info
  readonly pageInfo = computed(() => {
    const total = this.totalSignal();
    const currentPage = this.invoicePageSignal();
    const limit = this.limitSignal();
    
    return {
      currentPage,
      totalPages: Math.ceil(total / limit),
      hasNext: this.hasMoreSignal(),
      hasPrevious: currentPage > 1,
      start: (currentPage - 1) * limit + 1,
      end: Math.min(currentPage * limit, total)
    };
  });

  constructor() {
    // Use toObservable + switchMap for automatic request cancellation
    // Load data when filters change (including initial empty filters)
    toObservable(this.invoiceQueryFiltersSignal).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      debounceTime(50), // Small debounce to batch rapid changes
      tap(() => {
        this.loadingSignal.set(true);
        this.errorSignal.set(null);
        this.invoicePageSignal.set(1); // Reset invoice page on invoice filter change
      }),
      switchMap(queryFilters => {
        const fullFilters: InvoiceFilters = {
          ...queryFilters,
          page: 1,
          limit: this.limitSignal()
        };
        return this.invoiceService.searchInvoices(fullFilters).pipe(
          catchError(err => {
            this.errorSignal.set(err.error?.error || 'Failed to load invoices');
            this.loadingSignal.set(false);
            return of(null);
          })
        );
      }),
      takeUntilDestroyed()
    ).subscribe(response => {
      if (response?.success && response.data) {
        this.invoicesSignal.set(response.data.data);
        this.totalSignal.set(response.data.total);
        this.hasMoreSignal.set(response.data.has_more);
      }
      this.loadingSignal.set(false);
    });

    // Aggregate invoices totals (all filtered rows), cancel on filter changes
    toObservable(this.invoiceQueryFiltersSignal).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      debounceTime(100),
      switchMap(queryFilters => {
        const filters: InvoiceFilters = { ...queryFilters };
        return this.invoiceService.aggregateInvoices(filters).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed()
    ).subscribe(res => {
      if (res?.success && res.data) {
        this.invoiceAggregateSignal.set(res.data);
      } else {
        this.invoiceAggregateSignal.set({ total_amount: 0, total_count: 0 });
      }
    });

    // Aggregate items totals only when Items tab is active (cancel on changes)
    // We map the active tab signal into the stream by reading it in filter() (runs on each emission).
    toObservable(this.itemsQueryFiltersSignal).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      debounceTime(100),
      filter(() => this.activeTabSignal() === 'items'),
      switchMap(queryFilters => {
        const filters: InvoiceFilters = { ...queryFilters };
        return this.invoiceService.aggregateItems(filters).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed()
    ).subscribe(res => {
      if (res?.success && res.data) {
        this.itemsAggregateSignal.set(res.data);
      } else {
        this.itemsAggregateSignal.set({ total_price: 0, total_count: 0 });
      }
    });
  }

  // Angular 21: Signal update methods
  setInvoiceFilters(filters: Partial<InvoiceFilters>): void {
    // Extract page/limit if provided, otherwise use defaults
    const { page, limit, ...queryFilters } = filters;
    
    // Update query filters (this triggers the effect for loading)
    this.invoiceQueryFiltersSignal.set(queryFilters);
    
    // Optionally update limit if provided
    if (limit !== undefined) {
      this.limitSignal.set(limit);
    }
  }

  // Backward-compatible alias (existing callers use setFilters/resetFilters)
  setFilters(filters: Partial<InvoiceFilters>): void {
    this.setInvoiceFilters(filters);
  }

  resetInvoiceFilters(): void {
    this.invoiceQueryFiltersSignal.set({});
    this.invoicePageSignal.set(1);
  }

  resetFilters(): void {
    this.resetInvoiceFilters();
  }

  setActiveTab(tab: 'invoices' | 'items'): void {
    this.activeTabSignal.set(tab);
    if (tab === 'items') {
      // Trigger totals computation on first switch even if filters didn't change
      this.itemsQueryFiltersSignal.update(v => ({ ...v }));
    }
  }

  nextPage(): void {
    if (this.hasMoreSignal()) {
      this.invoicePageSignal.update(p => p + 1);
      this.loadInvoicesForCurrentPage();
    }
  }

  previousPage(): void {
    const currentPage = this.invoicePageSignal();
    if (currentPage > 1) {
      this.invoicePageSignal.update(p => p - 1);
      this.loadInvoicesForCurrentPage();
    }
  }

  // Load invoices for specific page (pagination navigation)
  private loadInvoicesForCurrentPage(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const fullFilters: InvoiceFilters = {
      ...this.invoiceQueryFiltersSignal(),
      page: this.invoicePageSignal(),
      limit: this.limitSignal()
    };

    this.invoiceService.searchInvoices(fullFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.invoicesSignal.set(response.data.data);
          this.totalSignal.set(response.data.total);
          this.hasMoreSignal.set(response.data.has_more);
        }
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set(err.error?.error || 'Failed to load invoices');
        this.loadingSignal.set(false);
      }
    });
  }

  loadStats(): void {
    this.invoiceService.getStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statsSignal.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load stats:', err);
      }
    });
  }

  refreshInvoices(): void {
    this.loadInvoicesForCurrentPage();
  }

  deleteInvoice(id: string): void {
    this.invoiceService.deleteInvoice(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.refreshInvoices();
          this.loadStats();
        }
      },
      error: (err) => {
        this.errorSignal.set(err.error?.error || 'Failed to delete invoice');
      }
    });
  }

  // FIXED: loadMoreInvoices no longer triggers the effect
  // because it only updates pageSignal, not queryFiltersSignal
  loadMoreInvoices(): void {
    if (this.loadingMoreSignal() || !this.hasMoreSignal()) return;

    this.loadingMoreSignal.set(true);
    const nextPage = this.invoicePageSignal() + 1;

    const fullFilters: InvoiceFilters = {
      ...this.invoiceQueryFiltersSignal(),
      page: nextPage,
      limit: this.limitSignal()
    };

    this.invoiceService.searchInvoices(fullFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Append to existing data
          this.invoicesSignal.update(current => [...current, ...response.data!.data]);
          // Update page WITHOUT triggering effect (pageSignal is separate)
          this.invoicePageSignal.set(nextPage);
          this.hasMoreSignal.set(response.data.has_more);
        }
        this.loadingMoreSignal.set(false);
      },
      error: () => {
        this.loadingMoreSignal.set(false);
      }
    });
  }

  // FIXED: Items are loaded on demand, not automatically with every filter change
  // Call this when Items tab becomes active
  syncItemsWithFilters(): void {
    this.itemsPageSignal.set(1);
    this.loadItems();
  }

  setItemsFilters(filters: Partial<InvoiceFilters>): void {
    const { page, limit, ...queryFilters } = filters;
    this.itemsQueryFiltersSignal.set(queryFilters);
    this.itemsPageSignal.set(1);
    this.loadItems();
  }

  resetItemsFilters(): void {
    this.itemsQueryFiltersSignal.set({});
    this.itemsPageSignal.set(1);
    this.loadItems();
  }

  loadItems(): void {
    this.itemsLoadingSignal.set(true);
    this.itemsErrorSignal.set(null);

    const fullFilters: InvoiceFilters = {
      ...this.itemsQueryFiltersSignal(),
      page: this.itemsPageSignal(),
      limit: this.limitSignal()
    };

    this.invoiceService.searchItems(fullFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.itemsSignal.set(response.data.data);
          this.itemsTotalSignal.set(response.data.total);
          this.itemsHasMoreSignal.set(response.data.has_more);
          this.itemsLoadedSignal.set(true);
        }
        this.itemsLoadingSignal.set(false);
      },
      error: (err) => {
        this.itemsErrorSignal.set(err.error?.error || 'Failed to load items');
        this.itemsLoadingSignal.set(false);
      }
    });
  }

  loadMoreItems(): void {
    if (this.itemsLoadingMoreSignal() || !this.itemsHasMoreSignal()) return;

    this.itemsLoadingMoreSignal.set(true);
    const nextPage = this.itemsPageSignal() + 1;

    const fullFilters: InvoiceFilters = {
      ...this.itemsQueryFiltersSignal(),
      page: nextPage,
      limit: this.limitSignal()
    };

    this.invoiceService.searchItems(fullFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.itemsSignal.update(current => [...current, ...response.data!.data]);
          this.itemsPageSignal.set(nextPage);
          this.itemsHasMoreSignal.set(response.data.has_more);
        }
        this.itemsLoadingMoreSignal.set(false);
      },
      error: () => {
        this.itemsLoadingMoreSignal.set(false);
      }
    });
  }

  refreshItems(): void {
    this.loadItems();
  }
}
