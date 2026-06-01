import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from './token-storage.service';

export const authGuard: CanActivateFn = () => {
  const storage = inject(TokenStorageService);
  const router = inject(Router);
  if (storage.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/login');
};
