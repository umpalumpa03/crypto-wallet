import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AssetSymbol } from './models/asset.model';
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
  // ==========================================
  // 🔥 INJECTIONS & STATE
  // ==========================================
  public market = inject(MarketStore);
  public tradeAPI = inject(TradeStore);

  public selectedAsset = signal<AssetSymbol>('BTC');
  public tradeSide = signal<'BUY' | 'SELL'>('BUY');

  @ViewChild('mainChart') mainChart!: ChartComponent;

  // Static initialization to establish the DOM and Y-Axis widths immediately
  public initialSeries = [{ name: 'BTC', data: this.market.btcPriceHistory() }];
  private lastAsset = '';

  // ==========================================
  // 🔥 COMPUTED DATA STREAMS
  // ==========================================
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

  // ==========================================
  // 🔥 REACTIVE FORM & TRADE LOGIC
  // ==========================================
  public amountControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0.00001),
  ]);

  // Convert the RxJS stream to a Signal for seamless computed math
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

    // Fail immediately if form is invalid or system is loading
    if (!this.amountControl.valid || this.tradeAPI.isTrading()) return false;

    // Validate based on trade direction
    if (side === 'BUY') return value <= this.tradeAPI.usdBalance();
    if (side === 'SELL') return amount <= currentHoldings;
    return false;
  });

  public setMaxAmount() {
    let max = 0;
    if (this.tradeSide() === 'BUY') {
      max = this.tradeAPI.usdBalance() / this.currentPrice();
    } else {
      max = this.tradeAPI.cryptoPortfolio()[this.selectedAsset()] || 0;
    }
    // Floor to 5 decimal places to prevent microscopic floating-point errors
    this.amountControl.setValue(Math.floor(max * 100000) / 100000);
  }

  public async executeTrade() {
    if (!this.isValidTrade()) return;

    const success = await this.tradeAPI.executeTrade(
      this.tradeSide(),
      this.selectedAsset(),
      this.amountControl.value!,
      this.currentPrice(),
    );

    // Only clear the form if the trade actually went through
    if (success) this.amountControl.reset();
  }

  public setTradeSide(side: 'BUY' | 'SELL') {
    this.tradeSide.set(side);
    this.amountControl.reset();
  }

  public setAsset(asset: AssetSymbol) {
    this.selectedAsset.set(asset);
    this.amountControl.reset();
  }

  // ==========================================
  // 🔥 CHART RENDER CYCLE (THE EFFECT)
  // ==========================================
  constructor() {
    this.tradeAPI.loadPortfolio();
    this.tradeAPI.loadHistory();

    effect(() => {
      const history = this.currentHistory();
      const asset = this.selectedAsset();

      // Ensure chart is initialized and we have data
      if (!this.mainChart || !this.mainChart.chart || history.length < 2) return;

      // 1. SILENT DATA PUSH (Update only the data, don't re-render the whole chart)
      // By passing true for `animate` and false for `overwriteInitialSeries`
      // ApexCharts will just slide the new point in without breaking the hover state
      this.mainChart.updateSeries([{ name: asset, data: history }], false);

      // 2. THEME SWITCHER (Only run when the user actually changes the coin!)
      if (this.lastAsset !== asset) {
        this.lastAsset = asset;
        const brandColor = asset === 'ETH' ? '#627eea' : asset === 'SOL' ? '#9945FF' : '#00e1ab';

        // updateOptions forces a heavy re-render, so we strictly isolate it here
        this.mainChart.updateOptions(
          {
            colors: [brandColor],
            fill: {
              type: 'gradient',
              gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
              colors: [brandColor],
            },
            markers: {
              colors: ['transparent'],
              strokeColors: 'transparent',
              hover: { size: 6, sizeOffset: 3 },
            },
          },
          false,
          true, // 🔥 Force true here so the options completely flush and apply
        );
      }
    });
  }

  // ==========================================
  // 🔥 CHART CONFIGURATION
  // ==========================================
  public chartOptions: any = {
    chart: {
      id: 'aurora-live-chart',
      type: 'area',
      height: '100%',
      width: '100%',
      animations: { enabled: false }, // Essential for live crypto data
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 2 },
    markers: {
      size: 4,
      colors: ['transparent'], // Pre-mounts circles to fix the hover bug
      strokeColors: 'transparent',
      strokeWidth: 2,
      hover: { size: 6, sizeOffset: 3 },
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.05)',
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 10 },
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      crosshairs: {
        show: true,
        stroke: { color: 'rgba(255,255,255,0.2)', width: 1, dashArray: 4 },
      },
    },
    yaxis: {
      show: true,
      labels: {
        minWidth: 75,
        maxWidth: 100,
        style: { colors: '#8b9592', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' },
        formatter: (val: number) =>
          val ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '',
      },
      crosshairs: {
        show: true,
        stroke: { color: 'rgba(255,255,255,0.2)', width: 1, dashArray: 4 },
      },
    },
    tooltip: {
      theme: 'dark',
      shared: false,
      intersect: false,
      followCursor: true,
      x: { show: false },
      marker: { show: false },
      y: {
        title: { formatter: () => '' },
        formatter: (val: number) =>
          val ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
      },
    },
  };

  // ==========================================
  // 🔥 MOCK ORDER BOOK (BIDS / ASKS)
  // ==========================================
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
    const btcValue = (portfolio['BTC'] || 0) * this.market.liveBtcPrice();
    const ethValue = (portfolio['ETH'] || 0) * this.market.liveEthPrice();
    const solValue = (portfolio['SOL'] || 0) * this.market.liveSolPrice();

    return btcValue + ethValue + solValue;
  });

  // Calculate the absolute Total Account Net Worth (Fiat + Crypto)
  public accountNetWorth = computed(() => {
    return this.tradeAPI.usdBalance() + this.totalCryptoValue();
  });

  // Helper to safely get the balance of the currently selected asset
  public currentAssetBalance = computed(() => {
    return this.tradeAPI.cryptoPortfolio()[this.selectedAsset()] || 0;
  });
}
