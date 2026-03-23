import { Injectable, signal, computed, WritableSignal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../../environments/environment';
import { MarketTick } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class MarketFeedService implements OnDestroy {
  private socket: Socket = io(API_URL);
  private throttleInterval: ReturnType<typeof setInterval>; // For memory cleanup

  // 1. Live Tickers
  public liveBtcPrice = signal<number>(64281.04);
  public liveEthPrice = signal<number>(3412.55);
  public liveSolPrice = signal<number>(145.22);

  // 2. Chart History (Optimized: Initialized directly with the fake history generator)
  public btcPriceHistory = signal<number[]>(this.generateInitialHistory(64281.04));
  public ethPriceHistory = signal<number[]>(this.generateInitialHistory(3412.55));
  public solPriceHistory = signal<number[]>(this.generateInitialHistory(145.22));

  constructor() {
    // Overwrite the initial fake history with true Binance history
    this.loadRealHistory();

    // Listen for live data with strict typing
    this.socket.on('market-tick', (data: MarketTick) => {
      if (data.BTC) this.liveBtcPrice.set(data.BTC);
      if (data.ETH) this.liveEthPrice.set(data.ETH);
      if (data.SOL) this.liveSolPrice.set(data.SOL);
    });

    // Throttle the chart updates to once every 2 seconds
    this.throttleInterval = setInterval(() => {
      this.updateHistory(this.btcPriceHistory, this.liveBtcPrice());
      this.updateHistory(this.ethPriceHistory, this.liveEthPrice());
      this.updateHistory(this.solPriceHistory, this.liveSolPrice());
    }, 2000);
  }

  // OPTIMIZATION: Clean up connections and intervals when the service is destroyed
  ngOnDestroy() {
    clearInterval(this.throttleInterval);
    this.socket.disconnect();
  }

  // OPTIMIZATION: Strictly typed WritableSignal instead of 'any'
  private updateHistory(targetSignal: WritableSignal<number[]>, newPrice: number) {
    targetSignal.update((history: number[]) => {
      const newHistory = [...history, newPrice];
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
  }

  private async loadRealHistory() {
    try {
      const [btcRes, ethRes, solRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=50'),
        fetch('https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1m&limit=50'),
        fetch('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=50'),
      ]);

      const btcData = await btcRes.json();
      const ethData = await ethRes.json();
      const solData = await solRes.json();

      // Extract closing prices
      const btcPrices = btcData.map((candle: any[]) => parseFloat(candle[4]));
      const ethPrices = ethData.map((candle: any[]) => parseFloat(candle[4]));
      const solPrices = solData.map((candle: any[]) => parseFloat(candle[4]));

      // Paint charts
      this.btcPriceHistory.set(btcPrices);
      this.ethPriceHistory.set(ethPrices);
      this.solPriceHistory.set(solPrices);

      // Sync live tickers
      this.liveBtcPrice.set(btcPrices[btcPrices.length - 1]);
      this.liveEthPrice.set(ethPrices[ethPrices.length - 1]);
      this.liveSolPrice.set(solPrices[solPrices.length - 1]);
    } catch (error) {
      console.error('Failed to load historical data. Falling back to WebSocket buildup.', error);
    }
  }

  private generateInitialHistory(basePrice: number, points = 50): number[] {
    const history: number[] = [];
    let price = basePrice * (0.97 + Math.random() * 0.06);

    for (let i = 0; i < points; i++) {
      const change = price * (Math.random() * 0.008 - 0.004);
      price += change;
      history.push(price);
    }

    history[points - 1] = basePrice;
    return history;
  }

  // Math for the giant Hero SVG Chart
  private generateSvgPath(prices: number[], width: number, height: number): string {
    const padding = prices[0] * 0.0005;
    const min = Math.min(...prices) - padding;
    const max = Math.max(...prices) + padding;
    const range = max - min || 1;

    const pathPoints = prices.map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    });

    return pathPoints.join(' ');
  }

  public mainChartPath = computed(() => this.generateSvgPath(this.btcPriceHistory(), 1000, 100));
}
