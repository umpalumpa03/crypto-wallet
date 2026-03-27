import { inject, effect } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  patchState,
  withComputed,
  withHooks,
} from '@ngrx/signals';
import { computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { InstitutionalProfile, Transaction } from '../models/portfolio.model';
import { API_URL } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

type PortfolioState = {
  profile: InstitutionalProfile | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
  isInflight: boolean;
};

const initialState: PortfolioState = {
  profile: null,
  isLoading: false,
  error: null,
  lastUpdate: null,
  isInflight: false,
};

export const PortfolioStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ profile }) => ({
    totalAssetsCount: computed((): number => profile()?.assets.length || 0),
    recentActivity: computed((): Transaction[] => profile()?.transactions.slice(0, 3) || []),
  })),

  withMethods((store, http: HttpClient = inject(HttpClient)) => ({
    async loadPortfolio(force: boolean = false): Promise<void> {
      const isFresh = store.lastUpdate() && Date.now() - store.lastUpdate()! < 30000;
      if (store.profile() && isFresh && !force) return;
      if (store.isInflight()) return;

      patchState(store, { isLoading: true, error: null, isInflight: true });

      try {
        const endpoint = `${API_URL}/portfolio/dashboard`;
        const profile = await lastValueFrom(http.get<InstitutionalProfile>(endpoint));
        patchState(store, { profile, lastUpdate: Date.now() });
      } catch (err: unknown) {
        const errorMessage =
          'System failure: connection to the decentralized ledger could not be established.';
        patchState(store, { error: errorMessage });
      } finally {
        patchState(store, { isLoading: false, isInflight: false });
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),

  withHooks({
    onInit(store) {
      const authService = inject(AuthService);
      const saved = localStorage.getItem('aurora_portfolio_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        patchState(store, {
          profile: parsed.profile || null,
          lastUpdate: parsed.lastUpdate || null,
        });
      }

      effect(() => {
        const stateToSave = {
          profile: store.profile(),
          lastUpdate: store.lastUpdate(),
        };
        localStorage.setItem('aurora_portfolio_state', JSON.stringify(stateToSave));
      });

      if (authService.isAuthenticated()) {
        const isFresh = store.lastUpdate() && Date.now() - store.lastUpdate()! < 30000;
        if (!store.profile() || !isFresh) {
          store.loadPortfolio();
        }
      }
    },
  }),
);
