import { Injectable, signal, computed, effect, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { InvoiceService } from '../services/invoice.service';
import type { Invoice, InvoiceFilters, InvoiceStats, FlatItem } from '@pdf-invoice/shared';

@Injectable({
  providedIn: 'root'
})
export class InvoiceStateService {
  // Angular 21: State signals - Invoices
  private invoicesSignal = signal<Invoice[]>([]);
  private filtersSignal = signal<InvoiceFilters>({ page: 1, limit: 20 });
  private statsSignal = signal<InvoiceStats | null>(null);
  private loadingSignal = signal(false);
  private loadingMoreSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private totalSignal = signal(0);
  private hasMoreSignal = signal(false);

  // Angular 21: State signals - Items
  private itemsSignal = signal<FlatItem[]>([]);
  private itemsFiltersSignal = signal<InvoiceFilters>({ page: 1, limit: 20 });
  private itemsLoadingSignal = signal(false);
  private itemsLoadingMoreSignal = signal(false);
  private itemsErrorSignal = signal<string | null>(null);
  private itemsTotalSignal = signal(0);
  private itemsHasMoreSignal = signal(false);

  // Angular 21: Public readonly signals - Invoices
  readonly invoices = this.invoicesSignal.asReadonly();
  readonly filters = this.filtersSignal.asReadonly();
  readonly stats = this.statsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loadingMore = this.loadingMoreSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly hasMore = this.hasMoreSignal.asReadonly();

  // Angular 21: Public readonly signals - Items
  readonly items = this.itemsSignal.asReadonly();
  readonly itemsFilters = this.itemsFiltersSignal.asReadonly();
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
    const filters = this.filtersSignal();
    const total = this.totalSignal();
    const currentPage = filters.page || 1;
    const limit = filters.limit || 20;
    
    return {
      currentPage,
      totalPages: Math.ceil(total / limit),
      hasNext: this.hasMoreSignal(),
      hasPrevious: currentPage > 1,
      start: (currentPage - 1) * limit + 1,
      end: Math.min(currentPage * limit, total)
    };
  });

  constructor(private invoiceService: InvoiceService) {
    // Angular 21: Effect with explicit tracking
    effect(() => {
      // Track filters signal
      const filters = this.filtersSignal();
      
      // Untrack to avoid infinite loops
      untracked(() => {
        this.loadInvoices(filters);
        this.loadItemsWithFilters(filters);
      });
    });
  }

  // Angular 21: Signal update methods
  setFilters(filters: Partial<InvoiceFilters>): void {
    this.filtersSignal.update(current => ({ 
      ...current, 
      ...filters, 
      page: filters.page ?? 1 
    }));
  }

  resetFilters(): void {
    this.filtersSignal.set({ page: 1, limit: 20 });
  }

  nextPage(): void {
    if (this.hasMoreSignal()) {
      this.filtersSignal.update(f => ({ 
        ...f, 
        page: (f.page || 1) + 1 
      }));
    }
  }

  previousPage(): void {
    const currentPage = this.filtersSignal().page || 1;
    if (currentPage > 1) {
      this.filtersSignal.update(f => ({ 
        ...f, 
        page: currentPage - 1 
      }));
    }
  }

  private loadInvoices(filters: InvoiceFilters): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.invoiceService.getInvoices(filters).subscribe({
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
    this.loadInvoices(this.filtersSignal());
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

  loadMoreInvoices(): void {
    if (this.loadingMoreSignal() || !this.hasMoreSignal()) return;

    this.loadingMoreSignal.set(true);
    const nextPage = (this.filtersSignal().page || 1) + 1;

    this.invoiceService.getInvoices({ ...this.filtersSignal(), page: nextPage }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.invoicesSignal.update(current => [...current, ...response.data!.data]);
          this.filtersSignal.update(f => ({ ...f, page: nextPage }));
          this.hasMoreSignal.set(response.data.has_more);
        }
        this.loadingMoreSignal.set(false);
      },
      error: () => {
        this.loadingMoreSignal.set(false);
      }
    });
  }

  // Items methods
  private loadItemsWithFilters(filters: InvoiceFilters): void {
    this.itemsLoadingSignal.set(true);
    this.itemsErrorSignal.set(null);

    // Sync the items filter signal with main filters
    this.itemsFiltersSignal.set({ ...filters, page: 1, limit: 20 });

    this.invoiceService.getItems({ ...filters, page: 1, limit: 20 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.itemsSignal.set(response.data.data);
          this.itemsTotalSignal.set(response.data.total);
          this.itemsHasMoreSignal.set(response.data.has_more);
        }
        this.itemsLoadingSignal.set(false);
      },
      error: (err) => {
        this.itemsErrorSignal.set(err.error?.error || 'Failed to load items');
        this.itemsLoadingSignal.set(false);
      }
    });
  }

  setItemsFilters(filters: Partial<InvoiceFilters>): void {
    this.itemsFiltersSignal.update(current => ({ 
      ...current, 
      ...filters, 
      page: filters.page ?? 1 
    }));
    this.loadItems();
  }

  resetItemsFilters(): void {
    this.itemsFiltersSignal.set({ page: 1, limit: 20 });
    this.loadItems();
  }

  loadItems(): void {
    this.itemsLoadingSignal.set(true);
    this.itemsErrorSignal.set(null);

    this.invoiceService.getItems(this.itemsFiltersSignal()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.itemsSignal.set(response.data.data);
          this.itemsTotalSignal.set(response.data.total);
          this.itemsHasMoreSignal.set(response.data.has_more);
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
    const nextPage = (this.itemsFiltersSignal().page || 1) + 1;

    this.invoiceService.getItems({ ...this.itemsFiltersSignal(), page: nextPage }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.itemsSignal.update(current => [...current, ...response.data!.data]);
          this.itemsFiltersSignal.update(f => ({ ...f, page: nextPage }));
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
