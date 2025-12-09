import { Component, signal, effect, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { debounceTime } from 'rxjs';
import { InvoiceStateService } from '../../services/invoice-state.service';
import { AuthService } from '../../services/auth.service';
import { CATEGORIES } from '@pdf-invoice/shared';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule
  ],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent {
  private fb = inject(FormBuilder);
  private invoiceState = inject(InvoiceStateService);
  private authService = inject(AuthService);

  filterForm: FormGroup;
  categories = CATEGORIES;
  isAdmin = this.authService.isAdmin;
  expanded = signal(false);

  constructor() {
    this.filterForm = this.fb.group({
      date_from: [''],
      date_to: [''],
      category: [''],
      price_min: [''],
      price_max: [''],
      username: ['']
    });

    // Debounce filter changes
    this.filterForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(values => {
        const filters: any = {};
        
        if (values.date_from) {
          filters.date_from = this.formatDate(values.date_from);
        }
        if (values.date_to) {
          filters.date_to = this.formatDate(values.date_to);
        }
        if (values.category) {
          filters.category = values.category;
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

        this.invoiceState.setFilters(filters);
      });
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.invoiceState.resetFilters();
  }

  hasActiveFilters(): boolean {
    const values = this.filterForm.value;
    return Object.values(values).some(v => v !== '' && v !== null);
  }
}

