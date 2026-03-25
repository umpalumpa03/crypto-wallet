import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API_URL } from '../../environments/environment';
import { TradeHistoryItem, PortfolioResponse, DepositConfig, TradeState } from '../models/trade.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

const initialState: Omit<TradeState, 'tradeMessage'> = {
  usdBalance: 0,
  cryptoPortfolio: {},
  tradeHistory: [],
  depositConfigs: {},
  isTrading: false,
};

export const TradeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      http: HttpClient = inject(HttpClient),
      authService: AuthService = inject(AuthService),
      notificationService: NotificationService = inject(NotificationService),
    ) => {
      const apiUrl: string = `${API_URL}/api/trade`;

      return {
        async loadPortfolio(force: boolean = false): Promise<void> {
          if (!force && (store.usdBalance() > 0 || Object.keys(store.cryptoPortfolio()).length > 0)) {
            return;
          }

          const userId: string | undefined = authService.currentUser()?.id;
          if (!userId) return;

          try {
            const data: PortfolioResponse = await lastValueFrom(
              http.get<PortfolioResponse>(`${apiUrl}/portfolio/${userId}`),
            );
            patchState(store, {
              usdBalance: data.usdBalance,
              cryptoPortfolio: data.cryptoPortfolio,
            });
          } catch (error: unknown) {
            notificationService.error('Could not connect to database.');
          }
        },

        async loadHistory(force: boolean = false): Promise<void> {
          if (!force && store.tradeHistory().length > 0) return;

          const userId: string | undefined = authService.currentUser()?.id;
          if (!userId) return;

          try {
            const history: TradeHistoryItem[] = await lastValueFrom(
              http.get<TradeHistoryItem[]>(`${apiUrl}/history/${userId}`),
            );
            patchState(store, { tradeHistory: history });
          } catch (error: unknown) {}
        },

        async executeTrade(
          side: 'BUY' | 'SELL',
          asset: string,
          amount: number,
          price: number,
        ): Promise<boolean> {
          const userId: string | undefined = authService.currentUser()?.id;
          if (!userId) return false;

          const totalValue: number = amount * price;

          if (amount <= 0) return false;
          if (side === 'BUY' && totalValue > store.usdBalance()) return false;
          if (side === 'SELL' && amount > (store.cryptoPortfolio()[asset] || 0)) return false;

          patchState(store, { isTrading: true });

          try {
            const payload: object = { userId, side, asset, amount, executionPrice: price };
            const updatedPortfolio: PortfolioResponse = await lastValueFrom(
              http.post<PortfolioResponse>(`${apiUrl}/execute`, payload),
            );

            patchState(store, {
              usdBalance: updatedPortfolio.usdBalance,
              cryptoPortfolio: updatedPortfolio.cryptoPortfolio,
            });

            const history: TradeHistoryItem[] = await lastValueFrom(
              http.get<TradeHistoryItem[]>(`${apiUrl}/history/${userId}`),
            );
            patchState(store, {
              tradeHistory: history,
            });

            notificationService.success(
              `Successfully ${side === 'BUY' ? 'purchased' : 'sold'} ${amount} ${asset}!`,
            );

            return true;
          } catch (error: any) {
            const errorMsg: string = error?.error?.message || 'Transaction failed. Please try again.';
            notificationService.error(errorMsg);
            return false;
          } finally {
            patchState(store, { isTrading: false });
          }
        },

        async loadDepositConfigs(force: boolean = false): Promise<void> {
          if (!force && Object.keys(store.depositConfigs()).length > 0) return;

          try {
            const data: Record<string, DepositConfig> = await lastValueFrom(
              http.get<Record<string, DepositConfig>>(`${apiUrl}/deposit-info`),
            );
            patchState(store, { depositConfigs: data });
          } catch (error: unknown) {}
        },
      };
    },
  ),
);
