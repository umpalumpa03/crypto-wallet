import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TradeService } from '../../core/services/trade.service';
import { MarketFeedService } from '../../core/api/market-feed.service';
import { VaultAsset } from './models/vault.model';

@Component({
  selector: 'app-vault',
  imports: [CommonModule, RouterModule],
  templateUrl: './vault.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vault {
  public tradeAPI = inject(TradeService);
  public market = inject(MarketFeedService);

  constructor() {
    this.tradeAPI.loadPortfolio();
    this.tradeAPI.loadHistory();
    this.tradeAPI.loadDepositConfigs();
  }

  public selectedDeposit = signal<VaultAsset>('BTC');
  public copySuccess = signal<boolean>(false);

  public currentDepositInfo = computed(() => {
    const configs = this.tradeAPI.depositConfigs();

    return (
      configs[this.selectedDeposit()] || {
        name: 'Loading...',
        symbol: '...',
        network: '...',
        icon: 'sync',
        iconClass: 'text-on-surface-variant animate-spin',
        address: 'Fetching secure vault address...',
        warning: 'Please wait while we connect to the node.',
      }
    );
  });

  public async copyAddress() {
    const addressToCopy = this.currentDepositInfo()?.address || '';

    if (!addressToCopy) return;

    try {
      await navigator.clipboard.writeText(addressToCopy);
      this.copySuccess.set(true);

      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  }

  public btcBalance = computed(() => this.tradeAPI.cryptoPortfolio()['BTC'] || 0);
  public ethBalance = computed(() => this.tradeAPI.cryptoPortfolio()['ETH'] || 0);
  public solBalance = computed(() => this.tradeAPI.cryptoPortfolio()['SOL'] || 0);

  public btcValue = computed(() => this.btcBalance() * this.market.liveBtcPrice());
  public ethValue = computed(() => this.ethBalance() * this.market.liveEthPrice());
  public solValue = computed(() => this.solBalance() * this.market.liveSolPrice());

  public totalNetWorth = computed(() => {
    return this.tradeAPI.usdBalance() + this.btcValue() + this.ethValue() + this.solValue();
  });

  public recentActivity = computed(() => {
    return this.tradeAPI.tradeHistory().slice(0, 3);
  });
}
