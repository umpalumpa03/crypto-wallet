import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { InstitutionalProfile } from '../models/portfolio.model';
import { API_URL } from '../../environments/environment';

type PortfolioState = {
  profile: InstitutionalProfile | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: PortfolioState = {
  profile: null,
  isLoading: false,
  error: null,
};

export const PortfolioStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ profile }) => ({
    totalAssetsCount: computed(() => profile()?.assets.length || 0),
    recentActivity: computed(() => profile()?.transactions.slice(0, 3) || []),
  })),

  withMethods((store, http = inject(HttpClient)) => ({
    async loadPortfolio(force = false) {
      // Cache check: If we already have data and aren't forcing a refresh, skip the API call
      if (store.profile() && !force) return;

      patchState(store, { isLoading: true, error: null });

      try {
        const apiUrl = `${API_URL}/portfolio/dashboard`;
        const profile = await lastValueFrom(http.get<InstitutionalProfile>(apiUrl));
        patchState(store, { profile, isLoading: false });
      } catch (err) {
        console.error('Failed to load portfolio', err);
        patchState(store, {
          error: 'Failed to establish secure connection to the ledger.',
          isLoading: false,
        });
      }
    },
  })),
);
