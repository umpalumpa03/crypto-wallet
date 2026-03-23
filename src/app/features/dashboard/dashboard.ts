import { Component, OnInit, inject, ViewChild, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { MarketFeedService } from '../../core/api/market-feed';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  readonly store = inject(PortfolioStore);
  public market = inject(MarketFeedService);

  @ViewChild('btcChart') btcChart!: ChartComponent;
  @ViewChild('ethChart') ethChart!: ChartComponent;
  @ViewChild('solChart') solChart!: ChartComponent;

  public liveNetWorth = computed(() => {
    const profile = this.store.profile();
    if (!profile) return 0;

    // Find user's crypto balances
    const btcAmount = profile.assets.find((a) => a.symbol === 'BTC')?.amount || 0;
    const ethAmount = profile.assets.find((a) => a.symbol === 'ETH')?.amount || 0;
    const solAmount = profile.assets.find((a) => a.symbol === 'SOL')?.amount || 0;

    // Multiply by live WebSocket prices!
    const cryptoValue =
      btcAmount * this.market.liveBtcPrice() +
      ethAmount * this.market.liveEthPrice() +
      solAmount * this.market.liveSolPrice();

    // Add their raw USD cash balance (from the DB deposit)
    const cashReserve = 250000;

    return cryptoValue + cashReserve;
  });

  // 2. LIVE DONUT CHART DATA [BTC Value, ETH Value, SOL Value]
  public allocationSeries = computed(() => {
    const profile = this.store.profile();
    if (!profile) return [0, 0, 0];

    const btcValue =
      (profile.assets.find((a) => a.symbol === 'BTC')?.amount || 0) * this.market.liveBtcPrice();
    const ethValue =
      (profile.assets.find((a) => a.symbol === 'ETH')?.amount || 0) * this.market.liveEthPrice();
    const solValue =
      (profile.assets.find((a) => a.symbol === 'SOL')?.amount || 0) * this.market.liveSolPrice();

    return [btcValue, ethValue, solValue];
  });

  // 3. DONUT CHART CONFIGURATION
  public allocationChartOptions: any = {
    chart: { type: 'donut', height: 280, animations: { speed: 400 } },
    labels: ['Bitcoin', 'Ethereum', 'Solana'],
    colors: ['#00e1ab', '#627eea', '#9945FF'], // Brand colors for the coins
    stroke: { show: true, colors: ['#001a14'], width: 3 }, // Dark gaps between slices
    dataLabels: { enabled: false }, // Hide the messy text on the chart itself
    plotOptions: {
      pie: {
        donut: {
          size: '75%', // Makes the ring thinner and more elegant
          labels: {
            show: true,
            name: { color: '#8b9592', fontSize: '12px', fontFamily: 'monospace' },
            value: {
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              formatter: (val: string) =>
                `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            },
            total: {
              show: true,
              color: '#00e1ab',
              label: 'Total Crypto',
              formatter: (w: any) => {
                const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                return `$${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              },
            },
          },
        },
      },
    },
    legend: { show: false }, // We build our own legend below!
    tooltip: { theme: 'dark', y: { formatter: (val: number) => `$${val.toLocaleString()}` } },
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
      enabled: false, // Turn off tooltip to stop the hover flickering!
    },
    markers: {
      size: 0,
      hover: { size: 0 }, // Stop the little dot from appearing
    },
  };

  public btcColors = ['#8bdc00'];
  public ethColors = ['#8bdc00'];
  public solColors = ['#ffb4ab'];

  public areaFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
  };

  constructor() {
    effect(() => {
      if (this.btcChart) this.btcChart.updateSeries([{ data: this.market.btcPriceHistory() }]);
      if (this.ethChart) this.ethChart.updateSeries([{ data: this.market.ethPriceHistory() }]);
      if (this.solChart) this.solChart.updateSeries([{ data: this.market.solPriceHistory() }]);
    });
  }

  ngOnInit() {
    this.store.loadPortfolio();
  }
}
