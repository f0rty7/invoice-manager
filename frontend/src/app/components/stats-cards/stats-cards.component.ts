import { Component, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceStateService } from '../../services/invoice-state.service';

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './stats-cards.component.html',
  styleUrls: ['./stats-cards.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsCardsComponent {
  private invoiceState = inject(InvoiceStateService);

  stats = this.invoiceState.stats;
  invoices = this.invoiceState.invoices;
  
  // Computed stats from current view
  totalInvoices = computed(() => this.invoices().length);
  totalAmount = computed(() => 
    this.invoices().reduce((sum, inv) => sum + (inv.items_total || 0), 0)
  );
  
  topCategories = computed(() => {
    const categoryTotals: Record<string, number> = {};
    
    this.invoices().forEach(inv => {
      inv.items.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + (item.price || 0);
      });
    });
    
    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, total]) => ({ category, total }));
  });

  constructor() {
    // Load stats on init
    this.invoiceState.loadStats();
  }
}

