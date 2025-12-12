import { Component, signal, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
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
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  filterForm: FormGroup;
  categories = signal<string[]>([]);
  deliveryPartners = signal<string[]>([]);
  savedFilters = signal<SavedFilter[]>([]);
  activeDatePreset = signal<string | null>(null);
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
      date_from: [''],
      date_to: [''],
      categories: [[]],           // Multi-select categories
      delivery_partner: [''],
      price_min: [''],
      price_max: [''],
      username: [''],
      sort_by: ['date'],
      sort_dir: ['desc'],
      // Item filters
      item_search: [''],
      item_qty_min: [''],
      item_qty_max: [''],
      item_unit_price_min: [''],
      item_unit_price_max: [''],
      items_count_min: [''],
      items_count_max: [''],
      // Time filters (Phase 3)
      day_of_week: [[]],
      month: [''],
      year: [''],
      is_weekend: [''],
      exclude_categories: [[]],
      exclude_delivery_partners: [[]],
      spending_pattern: ['']
    });

    // Load categories, delivery partners, and saved filters from API
    this.loadCategories();
    this.loadDeliveryPartners();
    this.loadSavedFilters();

    // FIXED: Add takeUntilDestroyed to prevent subscription leak
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(values => {
        const filters: Partial<InvoiceFilters> = {};
        
        if (values.search) {
          filters.search = values.search;
        }
        if (values.date_from) {
          filters.date_from = this.formatDate(values.date_from);
        }
        if (values.date_to) {
          filters.date_to = this.formatDate(values.date_to);
        }
        if (values.categories?.length) {
          filters.categories = values.categories;
        }
        if (values.delivery_partner) {
          filters.delivery_partner = values.delivery_partner;
        }
        if (values.price_min) {
          filters.price_min = parseFloat(values.price_min);
        }
        if (values.price_max) {
          filters.price_max = parseFloat(values.price_max);
        }
        if (values.username && this.isAdmin()) {
          filters.username = values.username;
        }
        if (values.sort_by) {
          filters.sort_by = values.sort_by;
        }
        if (values.sort_dir) {
          filters.sort_dir = values.sort_dir;
        }
        // Item filters
        if (values.item_search) {
          filters.item_search = values.item_search;
        }
        if (values.item_qty_min) {
          filters.item_qty_min = parseFloat(values.item_qty_min);
        }
        if (values.item_qty_max) {
          filters.item_qty_max = parseFloat(values.item_qty_max);
        }
        if (values.item_unit_price_min) {
          filters.item_unit_price_min = parseFloat(values.item_unit_price_min);
        }
        if (values.item_unit_price_max) {
          filters.item_unit_price_max = parseFloat(values.item_unit_price_max);
        }
        if (values.items_count_min) {
          filters.items_count_min = parseInt(values.items_count_min);
        }
        if (values.items_count_max) {
          filters.items_count_max = parseInt(values.items_count_max);
        }
        // Time filters (Phase 3)
        if (values.day_of_week?.length) {
          filters.day_of_week = values.day_of_week;
        }
        if (values.month) {
          filters.month = parseInt(values.month);
        }
        if (values.year) {
          filters.year = parseInt(values.year);
        }
        if (values.is_weekend !== '' && values.is_weekend !== null) {
          filters.is_weekend = values.is_weekend === 'true' || values.is_weekend === true;
        }
        if (values.exclude_categories?.length) {
          filters.exclude_categories = values.exclude_categories;
        }
        if (values.exclude_delivery_partners?.length) {
          filters.exclude_delivery_partners = values.exclude_delivery_partners;
        }
        if (values.spending_pattern) {
          filters.spending_pattern = values.spending_pattern;
        }

        this.invoiceState.setFilters(filters);
      });
  }

  private loadCategories(): void {
    this.invoiceService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.categories.set([]);
      }
    });
  }

  private loadDeliveryPartners(): void {
    this.invoiceService.getDeliveryPartners().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.deliveryPartners.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load delivery partners:', err);
        this.deliveryPartners.set([]);
      }
    });
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Date preset methods
  setDatePreset(preset: 'today' | 'week' | 'month' | '30days' | 'year'): void {
    const now = new Date();
    let from: Date;
    const to = now;

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        from = new Date(now);
        from.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '30days':
        from = new Date(now);
        from.setDate(now.getDate() - 30);
        break;
      case 'year':
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }

    this.activeDatePreset.set(preset);
    this.filterForm.patchValue({
      date_from: from,
      date_to: to
    });
  }

  clearFilters(): void {
    this.activeDatePreset.set(null);
    this.filterForm.reset({
      categories: [],
      day_of_week: [],
      exclude_categories: [],
      exclude_delivery_partners: [],
      sort_by: 'date',
      sort_dir: 'desc'
    });
    this.invoiceState.resetFilters();
  }

  hasActiveFilters(): boolean {
    const values = this.filterForm.value;
    const arrayFields = ['categories', 'day_of_week', 'exclude_categories', 'exclude_delivery_partners'];
    return Object.entries(values).some(([key, v]) => {
      if (key === 'sort_by') return v !== 'date';
      if (key === 'sort_dir') return v !== 'desc';
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
    const currentFilters = this.getCurrentFiltersFromForm();
    
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
    const f = filter.filters;
    
    // Clear active date preset since we're loading a saved filter
    this.activeDatePreset.set(null);
    
    // Reset form first
    this.filterForm.reset({
      categories: [],
      day_of_week: [],
      exclude_categories: [],
      exclude_delivery_partners: [],
      sort_by: 'date',
      sort_dir: 'desc'
    }, { emitEvent: false });

    // Apply saved filter values
    this.filterForm.patchValue({
      search: f.search || '',
      categories: f.categories || [],
      delivery_partner: f.delivery_partner || '',
      price_min: f.price_min ?? '',
      price_max: f.price_max ?? '',
      sort_by: f.sort_by || 'date',
      sort_dir: f.sort_dir || 'desc',
      item_search: f.item_search || '',
      item_qty_min: f.item_qty_min ?? '',
      item_qty_max: f.item_qty_max ?? '',
      item_unit_price_min: f.item_unit_price_min ?? '',
      item_unit_price_max: f.item_unit_price_max ?? '',
      items_count_min: f.items_count_min ?? '',
      items_count_max: f.items_count_max ?? '',
      day_of_week: f.day_of_week || [],
      month: f.month ?? '',
      year: f.year ?? '',
      is_weekend: f.is_weekend !== undefined ? f.is_weekend : '',
      exclude_categories: f.exclude_categories || [],
      exclude_delivery_partners: f.exclude_delivery_partners || [],
      spending_pattern: f.spending_pattern || ''
    });

    // Handle date fields separately (need Date objects)
    if (f.date_from) {
      const [day, month, year] = f.date_from.split('-').map(Number);
      this.filterForm.patchValue({ date_from: new Date(year, month - 1, day) });
    }
    if (f.date_to) {
      const [day, month, year] = f.date_to.split('-').map(Number);
      this.filterForm.patchValue({ date_to: new Date(year, month - 1, day) });
    }
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

  private getCurrentFiltersFromForm(): InvoiceFilters {
    const values = this.filterForm.value;
    const filters: InvoiceFilters = {};

    if (values.search) filters.search = values.search;
    if (values.date_from) filters.date_from = this.formatDate(values.date_from);
    if (values.date_to) filters.date_to = this.formatDate(values.date_to);
    if (values.categories?.length) filters.categories = values.categories;
    if (values.delivery_partner) filters.delivery_partner = values.delivery_partner;
    if (values.price_min) filters.price_min = parseFloat(values.price_min);
    if (values.price_max) filters.price_max = parseFloat(values.price_max);
    if (values.sort_by && values.sort_by !== 'date') filters.sort_by = values.sort_by;
    if (values.sort_dir && values.sort_dir !== 'desc') filters.sort_dir = values.sort_dir;
    if (values.item_search) filters.item_search = values.item_search;
    if (values.item_qty_min) filters.item_qty_min = parseFloat(values.item_qty_min);
    if (values.item_qty_max) filters.item_qty_max = parseFloat(values.item_qty_max);
    if (values.item_unit_price_min) filters.item_unit_price_min = parseFloat(values.item_unit_price_min);
    if (values.item_unit_price_max) filters.item_unit_price_max = parseFloat(values.item_unit_price_max);
    if (values.items_count_min) filters.items_count_min = parseInt(values.items_count_min);
    if (values.items_count_max) filters.items_count_max = parseInt(values.items_count_max);
    if (values.day_of_week?.length) filters.day_of_week = values.day_of_week;
    if (values.month) filters.month = parseInt(values.month);
    if (values.year) filters.year = parseInt(values.year);
    if (values.is_weekend !== '' && values.is_weekend !== null) {
      filters.is_weekend = values.is_weekend === 'true' || values.is_weekend === true;
    }
    if (values.exclude_categories?.length) filters.exclude_categories = values.exclude_categories;
    if (values.exclude_delivery_partners?.length) filters.exclude_delivery_partners = values.exclude_delivery_partners;
    if (values.spending_pattern) filters.spending_pattern = values.spending_pattern;

    return filters;
  }
}

