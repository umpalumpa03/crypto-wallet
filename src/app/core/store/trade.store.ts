import { inject, computed, effect, Injector } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed, withHooks } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API_URL } from '../../environments/environment';
import { TradeHistoryItem, PortfolioResponse, DepositConfig, TradeState } from '../models/trade.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

type FilterState = {
  searchQuery: string;
  assetFilter: string;
  isPortfolioLoading: boolean;
};

const initialState: Omit<TradeState, 'tradeMessage'> & FilterState = {
  usdBalance: 0,
  cryptoPortfolio: {},
  tradeHistory: [],
  depositConfigs: {},
  isTrading: false,
  isPortfolioLoading: false,
  searchQuery: '',
  assetFilter: 'All Assets',
};

export const TradeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    filteredHistory: computed(() => {
      const history = store.tradeHistory();
      const query = store.searchQuery().toLowerCase().trim();
      const selectedAsset = store.assetFilter();

      if (!query && selectedAsset === 'All Assets') {
        return history;
      }

      return history.filter((tx) => {
        const matchesAsset = selectedAsset === 'All Assets' || tx.assetSymbol === selectedAsset;
        if (!matchesAsset) return false;

        if (!query) return true;

        return (
          tx.id.toLowerCase().includes(query) ||
          tx.type.toLowerCase().includes(query) ||
          tx.assetSymbol.toLowerCase().includes(query)
        );
      });
    }),
  })),
  withMethods(
    (
      store,
      http: HttpClient = inject(HttpClient),
      notificationService: NotificationService = inject(NotificationService),
    ) => {
      const injector = inject(Injector);
      const apiUrl: string = `${API_URL}/api/trade`;

      return {
        setSearchQuery(query: string): void {
          patchState(store, { searchQuery: query });
        },

        setAssetFilter(asset: string): void {
          patchState(store, { assetFilter: asset });
        },

        async loadPortfolio(force: boolean = false): Promise<void> {
          if (!force && (store.usdBalance() > 0 || Object.keys(store.cryptoPortfolio()).length > 0)) {
            return;
          }

          if (store.isPortfolioLoading()) return;

          const authService = injector.get(AuthService);
          const userId: string | undefined = authService.currentUser()?.id;
          if (!userId) return;

          patchState(store, { isPortfolioLoading: true });

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
          } finally {
            patchState(store, { isPortfolioLoading: false });
          }
        },

        async loadHistory(force: boolean = false): Promise<void> {
          if (!force && store.tradeHistory().length > 0) return;

          const authService = injector.get(AuthService);
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
          const authService = injector.get(AuthService);
          const userId: string | undefined = authService.currentUser()?.id;
          if (!userId) return false;

          const totalValue: number = amount * price;

          if (amount <= 0 || price <= 0) {
            notificationService.error('Invalid trade parameters. Price and amount must be positive.');
            return false;
          }

          if (side === 'BUY' && totalValue > store.usdBalance()) {
            notificationService.error('Insufficient USD balance');
            return false;
          }
          
          if (side === 'SELL' && amount > (store.cryptoPortfolio()[asset] || 0)) {
            notificationService.error(`Insufficient ${asset} balance`);
            return false;
          }

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
            let errorMsg: string = 'Transaction failed. Please try again.';
            if (error?.error?.message) {
              errorMsg = Array.isArray(error.error.message) 
                ? error.error.message[0] 
                : error.error.message;
            }
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

        clear(): void {
          patchState(store, initialState);
        },
      };
    },
  ),
  withHooks({
    onInit(store) {
      const saved = localStorage.getItem('aurora_trade_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        patchState(store, { 
          searchQuery: parsed.searchQuery || '',
          assetFilter: parsed.assetFilter || 'All Assets'
        });
      }

      effect(() => {
        const stateToSave = {
          searchQuery: store.searchQuery(),
          assetFilter: store.assetFilter()
        };
        localStorage.setItem('aurora_trade_state', JSON.stringify(stateToSave));
      });
    }
  })
);
