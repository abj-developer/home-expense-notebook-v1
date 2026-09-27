import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const { data, error } = await authService.getSession();
    const isAuthenticated = !error && !!data.session;

    authService.setLoggedInState(isAuthenticated);

    if (isAuthenticated) {
      return true;
    }

    return router.createUrlTree(['/login']);
  } catch {
    authService.setLoggedInState(false);
    return router.createUrlTree(['/login']);
  }
};