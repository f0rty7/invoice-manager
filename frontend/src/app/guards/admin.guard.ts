import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) return router.createUrlTree(['/login']);
  return authService.isAdmin()
    ? true
    : router.createUrlTree(['/dashboard']);
};
