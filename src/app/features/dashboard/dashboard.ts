import {
  Component,
  OnInit,
  inject,
  ViewChild,
  effect,
  computed,
  Signal,
  ChangeDetectionStrategy,
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
export class Dashboard implements OnInit {
  protected readonly store: any = inject(PortfolioStore);
  public market: any = inject(MarketStore);

  @ViewChild('btcChart') private btcChart!: ChartComponent;
  @ViewChild('ethChart') private ethChart!: ChartComponent;
  @ViewChild('solChart') private solChart!: ChartComponent;

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
    chart: { type: 'donut', height: 280, animations: { speed: 400 } },
    labels: ['Bitcoin', 'Ethereum', 'Solana'],
    colors: ['#00e1ab', '#627eea', '#9945FF'],
    stroke: { show: true, colors: ['#001a14'], width: 3 },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { color: '#8b9592', fontSize: '12px', fontFamily: 'monospace' },
            value: {
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              formatter: (val: string): string =>
                `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            },
            total: {
              show: true,
              color: '#00e1ab',
              label: 'Total Crypto',
              formatter: (w: any): string => {
                const total: number = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
                return `$${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
            },
          },
        },
      },
    },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number): string => `$${val.toLocaleString()}` },
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
        dynamicAnimation: { speed: 2000 },
      },
      events: {
        mouseMove: undefined,
        click: undefined,
      },
    },
    stroke: { curve: 'smooth', width: 2 },
    tooltip: {
      enabled: false,
    },
    markers: {
      size: 0,
      hover: { size: 0 },
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
      if (this.btcChart) this.btcChart.updateSeries([{ data: this.market.btcPriceHistory() }]);
      if (this.ethChart) this.ethChart.updateSeries([{ data: this.market.ethPriceHistory() }]);
      if (this.solChart) this.solChart.updateSeries([{ data: this.market.solPriceHistory() }]);
    });
  }

  public ngOnInit(): void {
    this.store.loadPortfolio();
  }
}
