import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { InstitutionalProfile, PortfolioState, Transaction } from '../models/portfolio.model';
import { API_URL } from '../../environments/environment';

const initialState: PortfolioState = {
  profile: null,
  isLoading: false,
  error: null,
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
      const isProfileLoaded = !!store.profile();
      if (isProfileLoaded && !force) return;

      patchState(store, { isLoading: true, error: null });

      try {
        const endpoint = `${API_URL}/portfolio/dashboard`;
        const profile = await lastValueFrom(http.get<InstitutionalProfile>(endpoint));
        patchState(store, { profile, isLoading: false });
      } catch (err: unknown) {
        const errorMessage = 'System failure: connection to the decentralized ledger could not be established.';
        patchState(store, {
          error: errorMessage,
          isLoading: false,
        });
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
);
