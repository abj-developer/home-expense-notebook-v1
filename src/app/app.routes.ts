import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/login/login.component')
        .then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    title: 'Dashboard | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component')
        .then((m) => m.DashboardComponent)
  },
  {
    path: 'category/:id',
    canActivate: [authGuard],
    title: 'Category Details | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/category-detail/category-detail.component')
        .then((m) => m.CategoryDetailComponent)
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    title: 'Categories | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/categories/categories.component')
        .then((m) => m.CategoriesComponent)
  },
  {
    path: 'expenses',
    canActivate: [authGuard],
    title: 'Expenses | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/phase2/phase2.component')
        .then((m) => m.Phase2Component)
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    title: 'Reports | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/phase2/phase2.component')
        .then((m) => m.Phase2Component)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    title: 'Settings | Home Expense Notebook',
    loadComponent: () =>
      import('./pages/phase2/phase2.component')
        .then((m) => m.Phase2Component)
  },
  { path: '**', redirectTo: '' }
];