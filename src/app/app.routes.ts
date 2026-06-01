import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions-page.component').then(
            (m) => m.TransactionsPageComponent,
          ),
      },
      { path: '', redirectTo: 'transactions', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
