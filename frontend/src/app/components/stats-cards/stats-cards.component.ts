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

  readonly stats = this.invoiceState.stats;

  // All-time stats (server-provided), independent of pagination/scroll
  readonly totalInvoices = computed<number | null>(() => this.stats()?.total_invoices ?? null);
  readonly totalAmount = computed<number | null>(() => this.stats()?.total_amount ?? null);

  readonly topCategories = computed(() => {
    const byCategory = this.stats()?.by_category ?? {};

    return Object.entries(byCategory)
      .filter(([category, row]) => !!category && !!row)
      .map(([category, row]) => ({
        category,
        total: row.total ?? 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  });

  constructor() {
    // Load stats on init
    this.invoiceState.loadStats();
  }
}

