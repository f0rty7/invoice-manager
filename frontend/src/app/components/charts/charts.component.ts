import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { InvoiceStateService } from '../../services/invoice-state.service';
import { provideCharts } from 'ng2-charts';
import { ChartBootstrapService } from '../../services/chart-bootstrap.service';
import type { Invoice } from '@pdf-invoice/shared';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, BaseChartDirective],
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideCharts()]
})
export class ChartsComponent {
  private invoiceState = inject(InvoiceStateService);
  private chartBootstrap = inject(ChartBootstrapService);
  
  invoices = this.invoiceState.invoices;

  constructor() {
    void this.chartBootstrap.ensureRegistered();
  }

  // Monthly Spending Trends Chart
  monthlyTrendsData = computed(() => {
    const invoices = this.invoices();
    const monthlyData: Record<string, number> = {};

    invoices.forEach(inv => {
      if (inv.date) {
        // Parse DD-MM-YYYY format and convert to YYYY-MM
        const dateParts = inv.date.split('-');
        if (dateParts.length === 3) {
          const day = dateParts[0];
          const month = dateParts[1];
          const year = dateParts[2];
          const monthKey = `${year}-${month}`; // YYYY-MM format
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (inv.items_total || 0);
        }
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort();
    
    return {
      labels: sortedMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets: [{
        label: 'Monthly Spending',
        data: sortedMonths.map(m => monthlyData[m]),
        fill: true,
        backgroundColor: 'rgba(0, 212, 255, 0.15)',
        borderColor: 'rgb(0, 212, 255)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(0, 212, 255)',
        pointBorderColor: 'rgba(26, 31, 46, 0.8)',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(255, 215, 0)',
        pointHoverBorderColor: 'rgb(0, 212, 255)',
        pointHoverBorderWidth: 3,
      }]
    };
  });

  monthlyTrendsOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for better dev tools performance
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#b8c5d6',
          font: {
            size: 13,
            weight: 500
          },
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#b8c5d6',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ₹${(context.parsed.y ?? 0).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 212, 255, 0.08)',
          lineWidth: 1,
        },
        ticks: {
          color: '#8899aa',
          font: {
            size: 12
          },
          callback: (value) => `₹${value}`
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#8899aa',
          font: {
            size: 12
          }
        },
        border: {
          display: false
        }
      }
    }
  };

  // Top Categories Chart
  topCategoriesData = computed(() => {
    const invoices = this.invoices();
    const categoryTotals: Record<string, number> = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + (item.price || 0);
      });
    });

    // Sort by total and get top 10
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedCategories.map(([cat]) => cat),
      datasets: [{
        label: 'Spending by Category',
        data: sortedCategories.map(([, total]) => total),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(255, 99, 255, 0.8)',
          'rgba(99, 255, 132, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)',
          'rgb(199, 199, 199)',
          'rgb(83, 102, 255)',
          'rgb(255, 99, 255)',
          'rgb(99, 255, 132)'
        ],
        borderWidth: 2
      }]
    };
  });

  topCategoriesOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for better dev tools performance
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#b8c5d6',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `${context.label}: ₹${(context.parsed.x ?? 0).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 212, 255, 0.08)',
          lineWidth: 1,
        },
        ticks: {
          color: '#8899aa',
          font: {
            size: 12
          },
          callback: (value) => `₹${value}`
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#b8c5d6',
          font: {
            size: 12
          }
        },
        border: {
          display: false
        }
      }
    }
  };

  // Top Items Chart
  topItemsData = computed(() => {
    const invoices = this.invoices();
    const itemTotals: Record<string, { total: number; qty: number }> = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!itemTotals[item.description]) {
          itemTotals[item.description] = { total: 0, qty: 0 };
        }
        itemTotals[item.description].total += (item.price || 0);
        itemTotals[item.description].qty += item.qty;
      });
    });

    // Sort by total spending and get top 10
    const sortedItems = Object.entries(itemTotals)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10);

    return {
      labels: sortedItems.map(([item]) => {
        // Truncate long item names
        return item.length > 30 ? item.substring(0, 27) + '...' : item;
      }),
      datasets: [{
        label: 'Spending on Item',
        data: sortedItems.map(([, data]) => data.total),
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: 'rgb(76, 175, 80)',
        borderWidth: 2
      }]
    };
  });

  topItemsOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for better dev tools performance
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#b8c5d6',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `Total Spent: ₹${(context.parsed.x ?? 0).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 212, 255, 0.08)',
          lineWidth: 1,
        },
        ticks: {
          color: '#8899aa',
          font: {
            size: 12
          },
          callback: (value) => `₹${value}`
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#b8c5d6',
          font: {
            size: 12
          }
        },
        border: {
          display: false
        }
      }
    }
  };

  // Check if we have data to display
  hasData = computed(() => this.invoices().length > 0);
}

