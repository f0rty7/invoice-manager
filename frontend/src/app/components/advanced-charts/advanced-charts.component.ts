import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { InvoiceStateService } from '../../services/invoice-state.service';

@Component({
  selector: 'app-advanced-charts',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, BaseChartDirective],
  templateUrl: './advanced-charts.component.html',
  styleUrls: ['./advanced-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedChartsComponent {
  private invoiceState = inject(InvoiceStateService);
  
  invoices = this.invoiceState.invoices;

  // 1. Spending by Delivery Partner
  deliveryPartnerData = computed(() => {
    const invoices = this.invoices();
    const partnerTotals: Record<string, number> = {};

    invoices.forEach(inv => {
      const partner = inv.delivery_partner?.known_name || 
                     inv.delivery_partner?.registered_name || 
                     'Unknown';
      partnerTotals[partner] = (partnerTotals[partner] || 0) + (inv.items_total || 0);
    });

    const partners = Object.keys(partnerTotals);
    const totals = Object.values(partnerTotals);

    return {
      labels: partners,
      datasets: [{
        label: 'Spending',
        data: totals,
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',   // Blinkit yellow
          'rgba(139, 0, 139, 0.8)',   // Zepto purple
          'rgba(158, 158, 158, 0.8)'  // Unknown gray
        ],
        borderColor: [
          'rgb(255, 193, 7)',
          'rgb(139, 0, 139)',
          'rgb(158, 158, 158)'
        ],
        borderWidth: 2
      }]
    };
  });

  deliveryPartnerOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: any) => a + (b || 0), 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // 2. Average Order Value Trend
  avgOrderValueData = computed(() => {
    const invoices = this.invoices();
    const monthlyData: Record<string, { total: number; count: number }> = {};

    invoices.forEach(inv => {
      if (inv.date) {
        const dateParts = inv.date.split('-');
        if (dateParts.length === 3) {
          const monthKey = `${dateParts[2]}-${dateParts[1]}`; // YYYY-MM
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, count: 0 };
          }
          monthlyData[monthKey].total += (inv.items_total || 0);
          monthlyData[monthKey].count += 1;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    
    return {
      labels: sortedMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets: [{
        label: 'Average Order Value',
        data: sortedMonths.map(m => monthlyData[m].total / monthlyData[m].count),
        fill: false,
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: 'rgb(76, 175, 80)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(76, 175, 80)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    };
  });

  avgOrderValueOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Avg: ₹${(context.parsed.y ?? 0).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `₹${value}`
        }
      }
    }
  };

  // 3. Items Count Distribution
  itemsCountData = computed(() => {
    const invoices = this.invoices();
    const ranges = [
      { min: 1, max: 3, label: '1-3 items' },
      { min: 4, max: 6, label: '4-6 items' },
      { min: 7, max: 10, label: '7-10 items' },
      { min: 11, max: 15, label: '11-15 items' },
      { min: 16, max: 999, label: '16+ items' }
    ];

    const distribution = ranges.map(range => {
      return invoices.filter(inv => {
        const itemCount = inv.items.length;
        return itemCount >= range.min && itemCount <= range.max;
      }).length;
    });

    return {
      labels: ranges.map(r => r.label),
      datasets: [{
        label: 'Number of Invoices',
        data: distribution,
        backgroundColor: 'rgba(33, 150, 243, 0.8)',
        borderColor: 'rgb(33, 150, 243)',
        borderWidth: 2
      }]
    };
  });

  itemsCountOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Invoices: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // 4. Category Mix Over Time
  categoryMixData = computed(() => {
    const invoices = this.invoices();
    const monthlyCategories: Record<string, Record<string, number>> = {};
    const allCategories = new Set<string>();

    // Aggregate spending by month and category
    invoices.forEach(inv => {
      if (inv.date) {
        const dateParts = inv.date.split('-');
        if (dateParts.length === 3) {
          const monthKey = `${dateParts[2]}-${dateParts[1]}`; // YYYY-MM
          if (!monthlyCategories[monthKey]) {
            monthlyCategories[monthKey] = {};
          }

          inv.items.forEach(item => {
            allCategories.add(item.category);
            monthlyCategories[monthKey][item.category] = 
              (monthlyCategories[monthKey][item.category] || 0) + (item.price || 0);
          });
        }
      }
    });

    // Get top 7 categories by total spending
    const categoryTotals: Record<string, number> = {};
    Object.values(monthlyCategories).forEach(monthData => {
      Object.entries(monthData).forEach(([cat, total]) => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + total;
      });
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([cat]) => cat);

    const sortedMonths = Object.keys(monthlyCategories).sort();
    
    // Define colors for categories
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)'
    ];

    const datasets = topCategories.map((category, index) => ({
      label: category,
      data: sortedMonths.map(month => monthlyCategories[month][category] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace('0.8', '1'),
      borderWidth: 1
    }));

    return {
      labels: sortedMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets
    };
  });

  categoryMixOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ₹${(context.parsed.y ?? 0).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value) => `₹${value}`
        }
      }
    }
  };

  // 5A. Price Range Distribution - Detailed
  priceRangeDetailedData = computed(() => {
    const invoices = this.invoices();
    const ranges = [
      { min: 0, max: 200, label: '₹0-200' },
      { min: 200, max: 400, label: '₹200-400' },
      { min: 400, max: 600, label: '₹400-600' },
      { min: 600, max: 800, label: '₹600-800' },
      { min: 800, max: 1000, label: '₹800-1000' },
      { min: 1000, max: 1500, label: '₹1000-1500' },
      { min: 1500, max: 2000, label: '₹1500-2000' },
      { min: 2000, max: 999999, label: '₹2000+' }
    ];

    const distribution = ranges.map(range => {
      return invoices.filter(inv => {
        const total = inv.items_total || 0;
        return total >= range.min && total < range.max;
      }).length;
    });

    return {
      labels: ranges.map(r => r.label),
      datasets: [{
        label: 'Number of Invoices',
        data: distribution,
        backgroundColor: 'rgba(156, 39, 176, 0.8)',
        borderColor: 'rgb(156, 39, 176)',
        borderWidth: 2
      }]
    };
  });

  // 5B. Price Range Distribution - Overview
  priceRangeOverviewData = computed(() => {
    const invoices = this.invoices();
    const ranges = [
      { min: 0, max: 500, label: '₹0-500' },
      { min: 500, max: 1000, label: '₹500-1000' },
      { min: 1000, max: 1500, label: '₹1000-1500' },
      { min: 1500, max: 2000, label: '₹1500-2000' },
      { min: 2000, max: 999999, label: '₹2000+' }
    ];

    const distribution = ranges.map(range => {
      return invoices.filter(inv => {
        const total = inv.items_total || 0;
        return total >= range.min && total < range.max;
      }).length;
    });

    return {
      labels: ranges.map(r => r.label),
      datasets: [{
        label: 'Number of Invoices',
        data: distribution,
        backgroundColor: 'rgba(255, 87, 34, 0.8)',
        borderColor: 'rgb(255, 87, 34)',
        borderWidth: 2
      }]
    };
  });

  priceRangeOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Invoices: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Check if we have data to display
  hasData = computed(() => this.invoices().length > 0);
}

