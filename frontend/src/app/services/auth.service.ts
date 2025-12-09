import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import type { AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '@pdf-invoice/shared';

interface StoredAuth {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'user' | 'admin';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_URL = '/api/auth';

  // Angular 21: Private writable signals
  private authState = signal<StoredAuth | null>(null);
  
  // Angular 21: Public readonly computed signals
  readonly isAuthenticated = computed(() => !!this.authState());
  readonly currentUser = computed(() => this.authState()?.user || null);
  readonly isAdmin = computed(() => this.authState()?.user?.role === 'admin');
  readonly token = computed(() => this.authState()?.token || null);
  readonly username = computed(() => this.authState()?.user?.username || '');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Angular 21: Effect to sync auth state with localStorage
    effect(() => {
      const auth = this.authState();
      if (auth) {
        localStorage.setItem(this.TOKEN_KEY, auth.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(auth.user));
      } else {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }
    });
  }

  checkStoredAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.authState.set({ token, user });
      } catch (error) {
        this.clearAuth();
      }
    }
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/register`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuth(response.data);
          }
        })
      );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuth(response.data);
          }
        })
      );
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  private setAuth(authResponse: AuthResponse): void {
    this.authState.set({
      token: authResponse.token,
      user: authResponse.user
    });
  }

  private clearAuth(): void {
    this.authState.set(null);
  }
}
