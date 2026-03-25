import {
  Component,
  OnInit,
  inject,
  effect,
  computed,
  Signal,
  ChangeDetectionStrategy,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { MarketStore } from '../../core/store/market.store';
import { InstitutionalProfile, Asset } from '../../core/models/portfolio.model';

@Component({
  selector: 'app-dashboard',

  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly store: any = inject(PortfolioStore);
  public market: any = inject(MarketStore);

  public readonly btcChart = viewChild<ChartComponent>('btcChart');
  public readonly ethChart = viewChild<ChartComponent>('ethChart');
  public readonly solChart = viewChild<ChartComponent>('solChart');

  public liveNetWorth: Signal<number> = computed((): number => {
    const profile: InstitutionalProfile | null = this.store.profile();
    if (!profile) return 0;

    const btcAmount: number = profile.assets.find((a: Asset) => a.symbol === 'BTC')?.amount || 0;
    const ethAmount: number = profile.assets.find((a: Asset) => a.symbol === 'ETH')?.amount || 0;
    const solAmount: number = profile.assets.find((a: Asset) => a.symbol === 'SOL')?.amount || 0;

    const cryptoValue: number =
      btcAmount * this.market.liveBtcPrice() +
      ethAmount * this.market.liveEthPrice() +
      solAmount * this.market.liveSolPrice();

    const cashReserve: number = profile.usdBalance || 0;

    return cryptoValue + cashReserve;
  });

  public totalPNL: Signal<number> = computed((): number => {
    const profile: InstitutionalProfile | null = this.store.profile();
    if (!profile) return 0;

    const btcAsset: Asset | undefined = profile.assets.find((a: Asset) => a.symbol === 'BTC');
    const ethAsset: Asset | undefined = profile.assets.find((a: Asset) => a.symbol === 'ETH');
    const solAsset: Asset | undefined = profile.assets.find((a: Asset) => a.symbol === 'SOL');

    const btcValue: number = (btcAsset?.amount || 0) * this.market.liveBtcPrice();
    const ethValue: number = (ethAsset?.amount || 0) * this.market.liveEthPrice();
    const solValue: number = (solAsset?.amount || 0) * this.market.liveSolPrice();

    const currentTotalValue: number = btcValue + ethValue + solValue;
    const totalCostBasis: number =
      (btcAsset?.totalCost || 0) + (ethAsset?.totalCost || 0) + (solAsset?.totalCost || 0);

    return currentTotalValue - totalCostBasis;
  });

  public pnlPercentage: Signal<number> = computed((): number => {
    const profile: InstitutionalProfile | null = this.store.profile();
    if (!profile) return 0;

    const totalCostBasis: number = profile.assets.reduce(
      (sum: number, a: Asset) => sum + a.totalCost,
      0,
    );
    if (totalCostBasis === 0) return 0;

    return (this.totalPNL() / totalCostBasis) * 100;
  });

  public allocationSeries: Signal<number[]> = computed((): number[] => {
    const profile: InstitutionalProfile | null = this.store.profile();
    if (!profile) return [0, 0, 0];

    const btcValue: number =
      (profile.assets.find((a: Asset) => a.symbol === 'BTC')?.amount || 0) *
      this.market.liveBtcPrice();
    const ethValue: number =
      (profile.assets.find((a: Asset) => a.symbol === 'ETH')?.amount || 0) *
      this.market.liveEthPrice();
    const solValue: number =
      (profile.assets.find((a: Asset) => a.symbol === 'SOL')?.amount || 0) *
      this.market.liveSolPrice();

    return [btcValue, ethValue, solValue];
  });

  public allocationChartOptions: any = {
    chart: {
      type: 'donut',
      height: 280,
      animations: { enabled: true, speed: 400 },
      dropShadow: {
        enabled: true,
        blur: 10,
        left: 0,
        top: 0,
        opacity: 0.2,
        color: '#00e1ab',
      },
    },
    labels: ['Bitcoin', 'Ethereum', 'Solana'],
    colors: ['#00e1ab', '#627eea', '#9945FF'],
    stroke: {
      show: true,
      colors: ['#1d2023'], 
      width: 4,
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '78%',
          labels: {
            show: true,
            name: {
              show: true,
              color: '#8b9592',
              fontSize: '11px',
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 600,
              offsetY: -10,
            },
            value: {
              show: true,
              color: '#ffffff',
              fontSize: '28px',
              fontFamily: 'JetBrains Mono',
              fontWeight: 800,
              offsetY: 10,
              formatter: (val: string): string =>
                `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            },
            total: {
              show: true,
              color: '#00e1ab',
              label: 'NET ASSETS',
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 700,
              formatter: (w: any): string => {
                const total: number = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
                return `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              },
            },
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#00ffa2', '#7e95ff', '#bc80ff'],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100],
      },
    },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
        return (
          '<div class="px-3 py-2 bg-[#0c0e12] border border-white/10 rounded-lg shadow-xl">' +
          '<span class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">' +
          w.globals.labels[seriesIndex] +
          '</span>' +
          '<div class="text-sm font-mono font-bold text-white">$' +
          series[seriesIndex].toLocaleString() +
          '</div>' +
          '</div>'
        );
      },
    },
  };

  public sparklineOptions: any = {
    chart: {
      type: 'area',
      height: 45,
      width: 140,
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: { speed: 800 },
      },
    },
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => '' } },
      marker: { show: false },
    },
    markers: {
      size: 0,
      hover: { size: 4, strokeColors: '#fff', strokeWidth: 2 },
    },
  };

  public btcColors: string[] = ['#8bdc00'];
  public ethColors: string[] = ['#8bdc00'];
  public solColors: string[] = ['#ffb4ab'];

  public areaFill: any = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
  };

  constructor() {
    effect((): void => {
      const btc = this.btcChart();
      const eth = this.ethChart();
      const sol = this.solChart();

      if (btc) btc.updateSeries([{ data: this.market.btcPriceHistory() }]);
      if (eth) eth.updateSeries([{ data: this.market.ethPriceHistory() }]);
      if (sol) sol.updateSeries([{ data: this.market.solPriceHistory() }]);
    });
  }
}
