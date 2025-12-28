import { provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { IconRegistryService } from './app/services/icon-registry.service';

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
    provideAnimationsAsync()
  ]
}).catch(err => console.error(err));

