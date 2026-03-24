import { Routes } from '@angular/router';
import { Auth } from './features/auth/auth';
import { Dashboard } from './features/dashboard/dashboard';
import { Ledger } from './features/ledger/ledger';
import { Markets } from './features/markets/markets';
import { Vault } from './features/vault/vault';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard, loginGuard } from './core/api/auth.guard';

export const routes: Routes = [
  { path: 'auth', component: Auth, canActivate: [loginGuard] },

  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'markets', component: Markets },
      { path: 'vault', component: Vault },
      { path: 'ledger', component: Ledger },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'auth' },
];
