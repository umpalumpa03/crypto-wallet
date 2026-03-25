import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  effect,
  viewChild,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChartComponent, NgApexchartsModule } from 'ng-apexcharts';
import { TradeStore } from '../../core/store/trade.store';
import { MarketStore } from '../../core/store/market.store';
import { NumberInput } from '../../shared/components/number-input/number-input';

@Component({
  selector: 'app-markets',

  imports: [CommonModule, DecimalPipe, ReactiveFormsModule, NgApexchartsModule, NumberInput],
  templateUrl: './markets.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Markets {
  public market = inject(MarketStore);
  public tradeAPI = inject(TradeStore);

  public readonly mainChart = viewChild<ChartComponent>('mainChart');

  public selectedAsset = this.market.selectedAsset;
  public tradeSide = signal<'BUY' | 'SELL'>('BUY');

  
  
  
  public currentPrice = computed(() => {
    const asset = this.selectedAsset();
    if (asset === 'BTC') return this.market.liveBtcPrice();
    if (asset === 'ETH') return this.market.liveEthPrice();
    return this.market.liveSolPrice();
  });

  public currentHistory = computed(() => {
    const asset = this.selectedAsset();
    if (asset === 'BTC') return this.market.btcPriceHistory();
    if (asset === 'ETH') return this.market.ethPriceHistory();
    return this.market.solPriceHistory();
  });

  
  
  
  public amountControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0.00001),
  ]);

  public orderAmount = toSignal(this.amountControl.valueChanges, { initialValue: null });

  public estimatedValue = computed(() => {
    const amt = this.orderAmount() || 0;
    return amt * this.currentPrice();
  });

  public isValidTrade = computed(() => {
    const side = this.tradeSide();
    const amount = this.orderAmount() || 0;
    const value = this.estimatedValue();
    const currentHoldings = this.tradeAPI.cryptoPortfolio()[this.selectedAsset()] || 0;

    if (!this.amountControl.valid || this.tradeAPI.isTrading()) return false;

    if (side === 'BUY') return value <= this.tradeAPI.usdBalance();
    if (side === 'SELL') return amount <= currentHoldings;
    return false;
  });

  public setMaxAmount(): void {
    let max = 0;
    if (this.tradeSide() === 'BUY') {
      max = this.tradeAPI.usdBalance() / this.currentPrice();
    } else {
      max = this.tradeAPI.cryptoPortfolio()[this.selectedAsset()] || 0;
    }
    this.amountControl.setValue(Math.floor(max * 100000) / 100000);
  }

  public async executeTrade(): Promise<void> {
    if (!this.isValidTrade()) return;

    const success = await this.tradeAPI.executeTrade(
      this.tradeSide(),
      this.selectedAsset(),
      this.amountControl.value!,
      this.currentPrice(),
    );

    if (success) this.amountControl.reset();
  }

  public setTradeSide(side: 'BUY' | 'SELL'): void {
    this.tradeSide.set(side);
    this.amountControl.reset();
  }

  public setAsset(asset: any): void {
    this.market.setSelectedAsset(asset);
    this.amountControl.reset();
  }

  public onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.market.setSearchQuery(query);
  }

  constructor() {
    this.tradeAPI.loadPortfolio();
    this.tradeAPI.loadHistory();

    effect(() => {
      const history = this.currentHistory();
      const asset = this.selectedAsset();
      const chart = this.mainChart();

      if (!chart || !chart.chart || history.length < 2) return;

      chart.updateSeries([{ name: asset, data: history }], false);

      const brandColor = asset === 'ETH' ? '#627eea' : asset === 'SOL' ? '#9945FF' : '#00e1ab';
      chart.updateOptions(
        {
          colors: [brandColor],
          fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
            colors: [brandColor],
          },
        },
        false,
        true,
      );
    });
  }

  public chartOptions: any = {
    chart: {
      id: 'aurora-live-chart',
      type: 'area',
      height: '100%',
      width: '100%',
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    markers: { size: 0, hover: { size: 5 } },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.03)',
      strokeDashArray: 5,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        show: true,
        style: { colors: '#8b9592', fontFamily: 'Plus Jakarta Sans', fontSize: '10px' },
        datetimeUTC: false,
        format: 'HH:mm:ss',
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      show: true,
      opposite: true,
      labels: {
        minWidth: 60,
        style: { colors: '#8b9592', fontFamily: 'JetBrains Mono', fontSize: '10px' },
        formatter: (val: number) =>
          val ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '',
      },
    },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    tooltip: {
      theme: 'dark',
      shared: false,
      x: { show: false },
      y: {
        formatter: (val: number) =>
          `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
    },
  };

  public asks = computed(() => {
    const asset = this.selectedAsset();
    if (asset === 'BTC') return this.market.btcOrderBook().asks;
    if (asset === 'ETH') return this.market.ethOrderBook().asks;
    return this.market.solOrderBook().asks;
  });

  public bids = computed(() => {
    const asset = this.selectedAsset();
    if (asset === 'BTC') return this.market.btcOrderBook().bids;
    if (asset === 'ETH') return this.market.ethOrderBook().bids;
    return this.market.solOrderBook().bids;
  });

  public totalCryptoValue = computed(() => {
    const portfolio = this.tradeAPI.cryptoPortfolio();
    return (
      (portfolio['BTC'] || 0) * this.market.liveBtcPrice() +
      (portfolio['ETH'] || 0) * this.market.liveEthPrice() +
      (portfolio['SOL'] || 0) * this.market.liveSolPrice()
    );
  });

  public accountNetWorth = computed(() => this.tradeAPI.usdBalance() + this.totalCryptoValue());
  public currentAssetBalance = computed(
    () => this.tradeAPI.cryptoPortfolio()[this.selectedAsset()] || 0,
  );
}
