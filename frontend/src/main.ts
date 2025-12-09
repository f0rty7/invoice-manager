import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';

// Angular 21: Zoneless by default, no need for provideExperimentalZonelessChangeDetection
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch() // Angular 21: Use native fetch API
    ),
    provideAnimations()
  ]
}).catch(err => console.error(err));

