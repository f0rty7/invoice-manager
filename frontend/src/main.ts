import { provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { IconRegistryService } from './app/services/icon-registry.service';

// OPTIMIZED: Tree-shake Chart.js by importing only what we need
import { Chart, LineController, BarController, DoughnutController,
         LineElement, BarElement, ArcElement, PointElement,
         CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import { provideCharts } from 'ng2-charts';

// Register only the chart types and plugins we actually use:
// - Line charts (2): Monthly Spending Trends, Average Order Value
// - Bar charts (6): Top Categories, Top Items, Items Count, Category Mix, Price Range x2
// - Doughnut (1): Spending by Delivery Partner
Chart.register(
  LineController, BarController, DoughnutController,  // Controllers for chart types
  LineElement, BarElement, ArcElement, PointElement,  // Visual elements
  CategoryScale, LinearScale,                          // Scales
  Title, Tooltip, Legend, Filler                       // Plugins
);

// PERFORMANCE: Disable animations and throttle resize to reduce lag when dev tools are open
Chart.defaults.animation = false;
Chart.defaults.responsive = true;
Chart.defaults.resizeDelay = 100; // Throttle resize events to 100ms

// Angular 21: Zoneless by default, no need for provideExperimentalZonelessChangeDetection
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes, 
      withComponentInputBinding()
    ),
    provideAppInitializer(() => {
      inject(IconRegistryService).register();
    }),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch() // Angular 21: Use native fetch API
    ),
    provideAnimationsAsync(),
    provideCharts()  // No registerables - we manually registered only what we need
  ]
}).catch(err => console.error(err));

