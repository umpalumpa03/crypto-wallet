import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetSymbol } from './models/asset.model';
import { ChartComponent, NgApexchartsModule } from 'ng-apexcharts';
import { MarketFeedService } from '../../core/api/market-feed';

@Component({
  selector: 'app-markets',
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './markets.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Markets {
  public market = inject(MarketFeedService);
  public selectedAsset = signal<AssetSymbol>('BTC');

  @ViewChild('mainChart') mainChart!: ChartComponent;

  public initialSeries = [{ name: 'BTC', data: this.market.btcPriceHistory() }];
  private lastAsset = '';

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

  constructor() {
    effect(() => {
      const history = this.currentHistory();
      const asset = this.selectedAsset();

      if (!this.mainChart || history.length < 2) return;

      const tooltips = document.querySelectorAll('.apexcharts-tooltip');
      if (tooltips.length > 1) {
        for (let i = 0; i < tooltips.length - 1; i++) {
          tooltips[i].remove();
        }
      }

      this.mainChart.updateSeries([{ name: asset, data: history }], false);

      if (this.lastAsset !== asset) {
        this.lastAsset = asset;
        const brandColor = asset === 'ETH' ? '#627eea' : asset === 'SOL' ? '#9945FF' : '#00e1ab';

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
              hover: { size: 6, colors: [brandColor], strokeColors: '#001a14' },
            },
          },
          false,
          false,
        );
      }
    });
  }

  public chartOptions: any = {
    chart: {
      id: 'aurora-live-chart',
      type: 'area',
      height: '100%',
      width: '100%',
      animations: { enabled: false },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 2 },
    markers: {
      size: 4,
      colors: ['transparent'],
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
      shared: true,
      intersect: false,
      x: { show: false },
      marker: { show: false },
      y: {
        title: { formatter: () => '' },
        formatter: (val: number) =>
          val ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
      },
    },
  };

  public asks = computed(() => {
    const price = this.currentPrice();
    return [
      { p: price + price * 0.0015, size: 0.451, sum: 12.88, width: '40%' },
      { p: price + price * 0.001, size: 1.2, sum: 12.43, width: '65%' },
      { p: price + price * 0.0005, size: 0.05, sum: 11.23, width: '20%' },
    ].reverse();
  });

  public bids = computed(() => {
    const price = this.currentPrice();
    return [
      { p: price - price * 0.0005, size: 0.312, sum: 0.31, width: '30%' },
      { p: price - price * 0.001, size: 2.441, sum: 2.75, width: '85%' },
      { p: price - price * 0.0015, size: 0.82, sum: 3.57, width: '45%' },
    ];
  });

  public setAsset(asset: AssetSymbol) {
    this.selectedAsset.set(asset);
  }
}
