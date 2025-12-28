import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChartBootstrapService {
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  ensureRegistered(): Promise<void> {
    if (ChartBootstrapService.initialized) return Promise.resolve();
    if (ChartBootstrapService.initPromise) return ChartBootstrapService.initPromise;

    ChartBootstrapService.initPromise = (async () => {
      const chartJs = await import('chart.js');

      // Register only what we use (same set previously registered in main.ts)
      chartJs.Chart.register(
        chartJs.LineController,
        chartJs.BarController,
        chartJs.DoughnutController,
        chartJs.LineElement,
        chartJs.BarElement,
        chartJs.ArcElement,
        chartJs.PointElement,
        chartJs.CategoryScale,
        chartJs.LinearScale,
        chartJs.Title,
        chartJs.Tooltip,
        chartJs.Legend,
        chartJs.Filler
      );

      // Keep the previous global defaults
      chartJs.Chart.defaults.animation = false;
      chartJs.Chart.defaults.responsive = true;
      chartJs.Chart.defaults.resizeDelay = 100;

      ChartBootstrapService.initialized = true;
    })();

    return ChartBootstrapService.initPromise;
  }
}


