import { Injectable, signal, inject } from '@angular/core';
import { InvoiceService } from './invoice.service';
import type { FilterOption } from '@pdf-invoice/shared';

/**
 * Shared service to fetch and cache filter options.
 * Prevents duplicate API calls when multiple components need the same data.
 */
@Injectable({
  providedIn: 'root'
})
export class FilterOptionsService {
  private invoiceService = inject(InvoiceService);

  // Cached filter options
  private partnersSignal = signal<FilterOption[]>([]);
  private categoriesSignal = signal<FilterOption[]>([]);
  private loadingSignal = signal(false);
  private loadedSignal = signal(false);

  // Public readonly signals
  readonly partners = this.partnersSignal.asReadonly();
  readonly categories = this.categoriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Load filter options from API (only once, cached for subsequent calls)
   */
  loadFilterOptions(): void {
    // Skip if already loaded or currently loading
    if (this.loadedSignal() || this.loadingSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.invoiceService.getFilterOptions().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.partnersSignal.set(res.data.partners);
          this.categoriesSignal.set(res.data.categories);
          this.loadedSignal.set(true);
        }
        this.loadingSignal.set(false);
      },
      error: () => {
        this.partnersSignal.set([]);
        this.categoriesSignal.set([]);
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Refresh filter options (e.g., after uploading new invoices)
   */
  refresh(): void {
    this.loadedSignal.set(false);
    this.loadFilterOptions();
  }
}

