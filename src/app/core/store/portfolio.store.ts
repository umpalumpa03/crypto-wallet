import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { InstitutionalProfile } from '../models/portfolio.model';
import { PortfolioService } from '../services/portfolio.service';

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

  withMethods((store, portfolioService = inject(PortfolioService)) => ({
    async loadPortfolio() {
      patchState(store, { isLoading: true, error: null });

      try {
        const profile = await firstValueFrom(portfolioService.getDashboardData());
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
