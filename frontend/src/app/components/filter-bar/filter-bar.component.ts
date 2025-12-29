import { Component, signal, computed, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { debounceTime } from 'rxjs';
import { InvoiceStateService } from '../../services/invoice-state.service';
import { InvoiceService } from '../../services/invoice.service';
import { FilterOptionsService } from '../../services/filter-options.service';
import { AuthService } from '../../services/auth.service';
import type { InvoiceFilters, SavedFilter } from '@pdf-invoice/shared';
import { SaveFilterDialogComponent } from './save-filter-dialog.component';

@Component({
  selector: 'app-filter-bar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatDialogModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private invoiceState = inject(InvoiceStateService);
  private invoiceService = inject(InvoiceService);
  private filterOptionsService = inject(FilterOptionsService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  filterForm: FormGroup;
  // Prefer the shared filter-options endpoint (prevents extra /categories + /delivery-partners calls)
  readonly categories = computed(() => this.filterOptionsService.categories().map(o => o.value));
  readonly deliveryPartners = computed(() => this.filterOptionsService.partners().map(o => o.value));
  savedFilters = signal<SavedFilter[]>([]);
  isAdmin = this.authService.isAdmin;

  // Sort options
  sortOptions: { value: InvoiceFilters['sort_by']; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'total', label: 'Total' },
    { value: 'items_count', label: 'Items Count' },
    { value: 'delivery_partner', label: 'Delivery Partner' }
  ];

  // Day of week options (0=Sun, 1=Mon, etc.)
  daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  // Month options
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Spending pattern options
  spendingPatterns: { value: InvoiceFilters['spending_pattern']; label: string }[] = [
    { value: 'above_avg', label: 'Above Average' },
    { value: 'below_avg', label: 'Below Average' },
    { value: 'top_10_pct', label: 'Top 10%' },
    { value: 'bottom_10_pct', label: 'Bottom 10%' }
  ];

  // Generate year options (last 5 years + current)
  years = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: year.toString() };
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      username: [''],
      // Time filters (Phase 3)
      day_of_week: [[]],
      month: [''],
      year: [''],
      is_weekend: [''],
      exclude_categories: [[]],
      exclude_delivery_partners: [[]],
      spending_pattern: ['']
    });

    // Load shared filter options once (cached in `FilterOptionsService`)
    this.filterOptionsService.loadFilterOptions();

    // Defer saved filters fetch so it doesn't compete with first paint/LCP
    this.deferLoadSavedFilters();

    // FIXED: Add takeUntilDestroyed to prevent subscription leak
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(values => {
        const tab = this.invoiceState.activeTab();
        const current = tab === 'items' ? this.invoiceState.itemsFilters() : this.invoiceState.filters();
        const next: any = { ...current };
        
        if (values.search) next.search = values.search;
        else delete next.search;

        if (values.username && this.isAdmin()) next.username = values.username;
        else delete next.username;

        // Time filters (Phase 3)
        if (values.day_of_week?.length) next.day_of_week = values.day_of_week;
        else delete next.day_of_week;

        if (values.month) next.month = parseInt(values.month);
        else delete next.month;

        if (values.year) next.year = parseInt(values.year);
        else delete next.year;

        if (values.is_weekend !== '' && values.is_weekend !== null) {
          next.is_weekend = values.is_weekend === 'true' || values.is_weekend === true;
        } else {
          delete next.is_weekend;
        }

        if (values.exclude_categories?.length) next.exclude_categories = values.exclude_categories;
        else delete next.exclude_categories;

        if (values.exclude_delivery_partners?.length) next.exclude_delivery_partners = values.exclude_delivery_partners;
        else delete next.exclude_delivery_partners;

        if (values.spending_pattern) next.spending_pattern = values.spending_pattern;
        else delete next.spending_pattern;

        if (tab === 'items') this.invoiceState.setItemsFilters(next);
        else this.invoiceState.setInvoiceFilters(next);
      });
  }

  private deferLoadSavedFilters(): void {
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => this.loadSavedFilters(), { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.loadSavedFilters(), 1500);
    }
  }

  clearFilters(): void {
    const tab = this.invoiceState.activeTab();
    this.filterForm.reset({
      search: '',
      username: '',
      day_of_week: [],
      exclude_categories: [],
      exclude_delivery_partners: [],
      spending_pattern: '',
      month: '',
      year: '',
      is_weekend: ''
    }, { emitEvent: false });
    if (tab === 'items') this.invoiceState.resetItemsFilters();
    else this.invoiceState.resetInvoiceFilters();
  }

  hasActiveFilters(): boolean {
    const values = this.filterForm.value;
    const arrayFields = ['day_of_week', 'exclude_categories', 'exclude_delivery_partners'];
    return Object.entries(values).some(([key, v]) => {
      if (arrayFields.includes(key)) return Array.isArray(v) && v.length > 0;
      return v !== '' && v !== null;
    });
  }

  // Saved Filters methods (Phase 4)
  private loadSavedFilters(): void {
    this.invoiceService.getSavedFilters().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.savedFilters.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load saved filters:', err);
        this.savedFilters.set([]);
      }
    });
  }

  openSaveFilterDialog(): void {
    const dialogRef = this.dialog.open(SaveFilterDialogComponent, {
      width: '350px',
      data: { existingNames: this.savedFilters().map(f => f.name) }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveFilter(result.name, result.isDefault);
      }
    });
  }

  private saveFilter(name: string, isDefault: boolean): void {
    const currentFilters = this.getCurrentFiltersForActiveTab();
    
    this.invoiceService.createSavedFilter(name, currentFilters, isDefault).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadSavedFilters(); // Reload list
        }
      },
      error: (err) => {
        console.error('Failed to save filter:', err);
      }
    });
  }

  loadSavedFilter(filter: SavedFilter): void {
    const tab = this.invoiceState.activeTab();
    const f = filter.filters;

    // Update the sidebar form (advanced fields only) without triggering a fetch twice.
    this.filterForm.patchValue({
      search: f.search || '',
      username: f.username || '',
      day_of_week: f.day_of_week || [],
      month: f.month ?? '',
      year: f.year ?? '',
      is_weekend: f.is_weekend !== undefined ? f.is_weekend : '',
      exclude_categories: f.exclude_categories || [],
      exclude_delivery_partners: f.exclude_delivery_partners || [],
      spending_pattern: f.spending_pattern || ''
    }, { emitEvent: false });

    // Apply the full saved filter (including header-based fields) to the active tab only.
    if (tab === 'items') this.invoiceState.setItemsFilters(f);
    else this.invoiceState.setInvoiceFilters(f);
  }

  deleteSavedFilter(filter: SavedFilter, event: Event): void {
    event.stopPropagation();
    if (!filter._id) return;

    this.invoiceService.deleteSavedFilter(filter._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadSavedFilters();
        }
      },
      error: (err) => {
        console.error('Failed to delete filter:', err);
      }
    });
  }

  setAsDefaultFilter(filter: SavedFilter, event: Event): void {
    event.stopPropagation();
    if (!filter._id) return;

    this.invoiceService.setDefaultFilter(filter._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadSavedFilters();
        }
      },
      error: (err) => {
        console.error('Failed to set default filter:', err);
      }
    });
  }

  private getCurrentFiltersForActiveTab(): InvoiceFilters {
    const tab = this.invoiceState.activeTab();
    const f = tab === 'items' ? this.invoiceState.itemsFilters() : this.invoiceState.filters();
    // strip pagination
    const { page, limit, ...rest } = f as any;
    return rest as InvoiceFilters;
  }
}

