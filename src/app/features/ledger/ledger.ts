import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeStore } from '../../core/store/trade.store';
import { MarketStore } from '../../core/store/market.store';

@Component({
  selector: 'app-ledger',

  imports: [CommonModule],
  templateUrl: './ledger.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ledger {
  public tradeAPI = inject(TradeStore);
  public market = inject(MarketStore);

  constructor() {
    this.tradeAPI.loadPortfolio();
    this.tradeAPI.loadHistory();
  }

  // ==========================================
  // 🔥 DYNAMIC MATH
  // ==========================================

  public onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.tradeAPI.setSearchQuery(query);
  }

  public onFilterAsset(asset: string): void {
    this.tradeAPI.setAssetFilter(asset);
  }

  // Calculate Live Account Equity (Same as Vault Net Worth)
  public accountEquity = computed(() => {
    const portfolio = this.tradeAPI.cryptoPortfolio();
    const btcValue = (portfolio['BTC'] || 0) * this.market.liveBtcPrice();
    const ethValue = (portfolio['ETH'] || 0) * this.market.liveEthPrice();
    const solValue = (portfolio['SOL'] || 0) * this.market.liveSolPrice();
    return this.tradeAPI.usdBalance() + btcValue + ethValue + solValue;
  });

  // Calculate Total Volume by summing the USD value of all trades in the history
  public totalVolume = computed(() => {
    const history = this.tradeAPI.tradeHistory();
    return history.reduce((sum, tx) => sum + tx.amount * tx.priceAtTime, 0);
  });
}
