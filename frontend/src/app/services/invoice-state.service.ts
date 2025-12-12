import { Injectable, signal, computed, inject } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap, debounceTime, catchError } from 'rxjs/operators';
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

  // FIXED: Separate query filters from pagination to prevent effect/loadMore conflict
  private queryFiltersSignal = signal<QueryFilters>({});
  private pageSignal = signal(1);
  private limitSignal = signal(20);

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
  private itemsPageSignal = signal(1);
  private itemsLoadingSignal = signal(false);
  private itemsLoadingMoreSignal = signal(false);
  private itemsErrorSignal = signal<string | null>(null);
  private itemsTotalSignal = signal(0);
  private itemsHasMoreSignal = signal(false);
  private itemsLoadedSignal = signal(false); // Track if items have been loaded

  // Computed: Full filters object (combines query + pagination)
  readonly filters = computed<InvoiceFilters>(() => ({
    ...this.queryFiltersSignal(),
    page: this.pageSignal(),
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
    ...this.queryFiltersSignal(),
    page: this.itemsPageSignal(),
    limit: this.limitSignal()
  }));
  readonly itemsLoading = this.itemsLoadingSignal.asReadonly();
  readonly itemsLoadingMore = this.itemsLoadingMoreSignal.asReadonly();
  readonly itemsError = this.itemsErrorSignal.asReadonly();
  readonly itemsTotal = this.itemsTotalSignal.asReadonly();
  readonly itemsHasMore = this.itemsHasMoreSignal.asReadonly();

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
    const currentPage = this.pageSignal();
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
    // FIXED: Use toObservable + switchMap for automatic request cancellation
    // Only tracks queryFiltersSignal changes (NOT page changes)
    toObservable(this.queryFiltersSignal).pipe(
      debounceTime(50), // Small debounce to batch rapid changes
      tap(() => {
        this.loadingSignal.set(true);
        this.errorSignal.set(null);
        this.pageSignal.set(1); // Reset page on filter change
        this.itemsLoadedSignal.set(false); // Reset items loaded flag
      }),
      switchMap(queryFilters => {
        const fullFilters: InvoiceFilters = {
          ...queryFilters,
          page: 1,
          limit: this.limitSignal()
        };
        return this.invoiceService.getInvoices(fullFilters).pipe(
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
  }

  // Angular 21: Signal update methods
  setFilters(filters: Partial<InvoiceFilters>): void {
    // Extract page/limit if provided, otherwise use defaults
    const { page, limit, ...queryFilters } = filters;
    
    // Update query filters (this triggers the effect for loading)
    this.queryFiltersSignal.set(queryFilters);
    
    // Optionally update limit if provided
    if (limit !== undefined) {
      this.limitSignal.set(limit);
    }
  }

  resetFilters(): void {
    this.queryFiltersSignal.set({});
    this.pageSignal.set(1);
  }

  nextPage(): void {
    if (this.hasMoreSignal()) {
      this.pageSignal.update(p => p + 1);
      this.loadInvoicesForCurrentPage();
    }
  }

  previousPage(): void {
    const currentPage = this.pageSignal();
    if (currentPage > 1) {
      this.pageSignal.update(p => p - 1);
      this.loadInvoicesForCurrentPage();
    }
  }

  // Load invoices for specific page (pagination navigation)
  private loadInvoicesForCurrentPage(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const fullFilters: InvoiceFilters = {
      ...this.queryFiltersSignal(),
      page: this.pageSignal(),
      limit: this.limitSignal()
    };

    this.invoiceService.getInvoices(fullFilters).subscribe({
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
    const nextPage = this.pageSignal() + 1;

    const fullFilters: InvoiceFilters = {
      ...this.queryFiltersSignal(),
      page: nextPage,
      limit: this.limitSignal()
    };

    this.invoiceService.getInvoices(fullFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Append to existing data
          this.invoicesSignal.update(current => [...current, ...response.data!.data]);
          // Update page WITHOUT triggering effect (pageSignal is separate)
          this.pageSignal.set(nextPage);
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
    // Items use the same query filters as invoices
    this.queryFiltersSignal.set(queryFilters);
    this.itemsPageSignal.set(1);
    this.loadItems();
  }

  resetItemsFilters(): void {
    this.itemsPageSignal.set(1);
    this.loadItems();
  }

  loadItems(): void {
    this.itemsLoadingSignal.set(true);
    this.itemsErrorSignal.set(null);

    const fullFilters: InvoiceFilters = {
      ...this.queryFiltersSignal(),
      page: this.itemsPageSignal(),
      limit: this.limitSignal()
    };

    this.invoiceService.getItems(fullFilters).subscribe({
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
      ...this.queryFiltersSignal(),
      page: nextPage,
      limit: this.limitSignal()
    };

    this.invoiceService.getItems(fullFilters).subscribe({
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
