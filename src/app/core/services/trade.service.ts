import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API_URL } from '../../environments/environment';
import { TradeHistoryItem, PortfolioResponse, DepositConfig } from '../models/trade.model';

@Injectable({
  providedIn: 'root',
})
export class TradeService {
  private http = inject(HttpClient);

  // 🔥 IMPORTANT: Replace this with the UUID from your Prisma Seed terminal output!
  private userId = '270f672e-5f15-4eb3-a782-2cf6299b0524';

  private apiUrl = `${API_URL}/api/trade`;

  // Initialize with empty states, the database will fill these in a millisecond
  public usdBalance = signal<number>(0);
  public cryptoPortfolio = signal<Record<string, number>>({});
  public tradeHistory = signal<TradeHistoryItem[]>([]);
  public depositConfigs = signal<Record<string, DepositConfig>>({});

  public isTrading = signal<boolean>(false);
  public tradeMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // ==========================================
  // 1. Fetch User Data on Load
  // ==========================================
  public async loadPortfolio() {
    try {
      const data = await lastValueFrom(
        this.http.get<PortfolioResponse>(`${this.apiUrl}/portfolio/${this.userId}`),
      );

      // Populate the UI with real DB data
      this.usdBalance.set(data.usdBalance);
      this.cryptoPortfolio.set(data.cryptoPortfolio);
    } catch (error) {
      console.error('Failed to load portfolio from database', error);
      this.tradeMessage.set({ type: 'error', text: 'Could not connect to database.' });
    }
  }

  public async loadHistory() {
    try {
      const history = await lastValueFrom(
        this.http.get<TradeHistoryItem[]>(`${this.apiUrl}/history/${this.userId}`),
      );
      this.tradeHistory.set(history);
    } catch (error) {
      console.error('Failed to load history', error);
    }
  }

  // ==========================================
  // 2. Execute Real HTTP Trade
  // ==========================================
  public async executeTrade(
    side: 'BUY' | 'SELL',
    asset: string,
    amount: number,
    price: number,
  ): Promise<boolean> {
    const totalValue = amount * price;

    // Frontend safety check (NestJS also does this, but this prevents wasted network requests)
    if (amount <= 0) return false;
    if (side === 'BUY' && totalValue > this.usdBalance()) return false;
    if (side === 'SELL' && amount > (this.cryptoPortfolio()[asset] || 0)) return false;

    this.isTrading.set(true);
    this.tradeMessage.set(null);

    try {
      // Create the exact DTO payload NestJS expects
      const payload = { userId: this.userId, side, asset, amount, executionPrice: price };

      // Send to NestJS and wait for the atomic Prisma Transaction to finish
      const updatedPortfolio = await lastValueFrom(
        this.http.post<PortfolioResponse>(`${this.apiUrl}/execute`, payload),
      );

      // NestJS returns the *new* balances, so we just overwrite our signals!
      this.usdBalance.set(updatedPortfolio.usdBalance);
      this.cryptoPortfolio.set(updatedPortfolio.cryptoPortfolio);

      this.loadHistory();

      this.tradeMessage.set({
        type: 'success',
        text: `Successfully ${side === 'BUY' ? 'purchased' : 'sold'} ${amount} ${asset}!`,
      });

      return true;
    } catch (error: any) {
      // Extract the clean error message thrown by NestJS's BadRequestException
      const errorMsg = error.error?.message || 'Transaction failed. Please try again.';
      this.tradeMessage.set({ type: 'error', text: errorMsg });
      return false;
    } finally {
      this.isTrading.set(false);
      setTimeout(() => this.tradeMessage.set(null), 4000);
    }
  }

  public async loadDepositConfigs() {
    try {
      const data = await lastValueFrom(
        this.http.get<Record<string, DepositConfig>>(`${this.apiUrl}/deposit-info`),
      );
      this.depositConfigs.set(data);
    } catch (error) {
      console.error('Failed to load vault configurations from backend', error);
    }
  }
}
