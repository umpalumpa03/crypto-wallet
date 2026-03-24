import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API_URL } from '../../environments/environment';
import { TradeHistoryItem, PortfolioResponse, DepositConfig } from '../models/trade.model';
import { AuthService } from '../services/auth.service';

type TradeState = {
  usdBalance: number;
  cryptoPortfolio: Record<string, number>;
  tradeHistory: TradeHistoryItem[];
  depositConfigs: Record<string, DepositConfig>;
  isTrading: boolean;
  tradeMessage: { type: 'success' | 'error'; text: string } | null;
};

const initialState: TradeState = {
  usdBalance: 0,
  cryptoPortfolio: {},
  tradeHistory: [],
  depositConfigs: {},
  isTrading: false,
  tradeMessage: null,
};

export const TradeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, http = inject(HttpClient), authService = inject(AuthService)) => {
    const apiUrl = `${API_URL}/api/trade`;

    return {
      async loadPortfolio(force = false) {
        // Cache Check: If we have a balance or crypto and not forcing, skip.
        if (!force && (store.usdBalance() > 0 || Object.keys(store.cryptoPortfolio()).length > 0)) {
          return;
        }

        const userId = authService.currentUser()?.id;
        if (!userId) return;

        try {
          const data = await lastValueFrom(
            http.get<PortfolioResponse>(`${apiUrl}/portfolio/${userId}`),
          );
          patchState(store, {
            usdBalance: data.usdBalance,
            cryptoPortfolio: data.cryptoPortfolio,
          });
        } catch (error) {
          console.error('Failed to load portfolio from database', error);
          patchState(store, {
            tradeMessage: { type: 'error', text: 'Could not connect to database.' },
          });
        }
      },

      async loadHistory(force = false) {
        // Cache Check: Only fetch if history is empty or if we are forcing it.
        if (!force && store.tradeHistory().length > 0) return;

        const userId = authService.currentUser()?.id;
        if (!userId) return;

        try {
          const history = await lastValueFrom(
            http.get<TradeHistoryItem[]>(`${apiUrl}/history/${userId}`),
          );
          patchState(store, { tradeHistory: history });
        } catch (error) {
          console.error('Failed to load history', error);
        }
      },

      async executeTrade(
        side: 'BUY' | 'SELL',
        asset: string,
        amount: number,
        price: number,
      ): Promise<boolean> {
        const userId = authService.currentUser()?.id;
        if (!userId) return false;

        const totalValue = amount * price;

        if (amount <= 0) return false;
        if (side === 'BUY' && totalValue > store.usdBalance()) return false;
        if (side === 'SELL' && amount > (store.cryptoPortfolio()[asset] || 0)) return false;

        patchState(store, { isTrading: true, tradeMessage: null });

        try {
          const payload = { userId, side, asset, amount, executionPrice: price };
          const updatedPortfolio = await lastValueFrom(
            http.post<PortfolioResponse>(`${apiUrl}/execute`, payload),
          );

          // After a trade, we ALWAYS update the local state with the returned fresh data
          // This keeps the "cache" valid without a full reload of everything.
          patchState(store, {
            usdBalance: updatedPortfolio.usdBalance,
            cryptoPortfolio: updatedPortfolio.cryptoPortfolio,
          });

          // Also fetch history to keep the ledger updated after a mutation
          const history = await lastValueFrom(
            http.get<TradeHistoryItem[]>(`${apiUrl}/history/${userId}`),
          );
          patchState(store, {
            tradeHistory: history,
            tradeMessage: {
              type: 'success',
              text: `Successfully ${side === 'BUY' ? 'purchased' : 'sold'} ${amount} ${asset}!`,
            },
          });

          return true;
        } catch (error: any) {
          const errorMsg = error.error?.message || 'Transaction failed. Please try again.';
          patchState(store, { tradeMessage: { type: 'error', text: errorMsg } });
          return false;
        } finally {
          patchState(store, { isTrading: false });
          setTimeout(() => patchState(store, { tradeMessage: null }), 4000);
        }
      },

      async loadDepositConfigs(force = false) {
        // Deposit configs rarely change, so aggressive caching is good.
        if (!force && Object.keys(store.depositConfigs()).length > 0) return;

        try {
          const data = await lastValueFrom(http.get<Record<string, DepositConfig>>(`${apiUrl}/deposit-info`));
          patchState(store, { depositConfigs: data });
        } catch (error) {
          console.error('Failed to load vault configurations from backend', error);
        }
      },
    };
  }),
);
