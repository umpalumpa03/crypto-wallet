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
      if (store.profile() && !force) return;

      patchState(store, { isLoading: true, error: null });

      try {
        const apiUrl: string = `${API_URL}/portfolio/dashboard`;
        const profile: InstitutionalProfile = await lastValueFrom(http.get<InstitutionalProfile>(apiUrl));
        patchState(store, { profile, isLoading: false });
      } catch (err: unknown) {
        patchState(store, {
          error: 'Failed to establish secure connection to the ledger.',
          isLoading: false,
        });
      }
    },
  })),
);
