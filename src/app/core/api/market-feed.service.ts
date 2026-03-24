import { Injectable, signal, WritableSignal, OnDestroy } from '@angular/core';
// Removed socket.io-client, using native browser WebSockets!
import { OrderBookData, OrderBookLevel } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class MarketFeedService implements OnDestroy {
  private ws!: WebSocket;
  private throttleInterval: any;

  // 1. Live Tickers
  public liveBtcPrice = signal<number>(0);
  public liveEthPrice = signal<number>(0);
  public liveSolPrice = signal<number>(0);

  // 2. Order Book
  public btcOrderBook = signal<OrderBookData>({ asks: [], bids: [], price: 0 });
  public ethOrderBook = signal<OrderBookData>({ asks: [], bids: [], price: 0 });
  public solOrderBook = signal<OrderBookData>({ asks: [], bids: [], price: 0 });

  // 3. Chart History
  public btcPriceHistory = signal<number[]>([]);
  public ethPriceHistory = signal<number[]>([]);
  public solPriceHistory = signal<number[]>([]);

  constructor() {
    this.loadRealHistory();
    this.connectToBinance();

    // Throttle chart updates: Push the live Binance price to the chart every 2 seconds
    this.throttleInterval = setInterval(() => {
      if (this.btcPriceHistory().length > 0 && this.liveBtcPrice() > 0) {
        this.updateHistory(this.btcPriceHistory, this.liveBtcPrice());
        this.updateHistory(this.ethPriceHistory, this.liveEthPrice());
        this.updateHistory(this.solPriceHistory, this.liveSolPrice());
      }
    }, 2000);
  }

  ngOnDestroy() {
    clearInterval(this.throttleInterval);
    if (this.ws) this.ws.close();
  }

  // Maintains a strict rolling array of 60 points
  private updateHistory(targetSignal: WritableSignal<number[]>, newPrice: number) {
    targetSignal.update((history: number[]) => {
      const newHistory = [...history, newPrice];
      if (newHistory.length > 60) newHistory.shift();
      return newHistory;
    });
  }

  // ==========================================
  // 🔥 1. FETCH REAL HISTORY (Past 60 Seconds)
  // ==========================================
  private async loadRealHistory() {
    try {
      // Fetch 1-second candles so the chart is perfectly continuous with the live feed
      const [btcRes, ethRes, solRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=60'),
        fetch('https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1s&limit=60'),
        fetch('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1s&limit=60'),
      ]);

      const parsePrices = async (res: Response) => {
        const data = await res.json();
        return data.map((candle: any[]) => parseFloat(candle[4])); // Extract closing price
      };

      const btcPrices = await parsePrices(btcRes);
      const ethPrices = await parsePrices(ethRes);
      const solPrices = await parsePrices(solRes);

      this.btcPriceHistory.set(btcPrices);
      this.ethPriceHistory.set(ethPrices);
      this.solPriceHistory.set(solPrices);

      // Seed the initial live prices
      this.liveBtcPrice.set(btcPrices[btcPrices.length - 1]);
      this.liveEthPrice.set(ethPrices[ethPrices.length - 1]);
      this.liveSolPrice.set(solPrices[solPrices.length - 1]);
    } catch (error) {
      console.error('Failed to load Binance history. Check your internet connection.', error);
    }
  }

  // ==========================================
  // 🔥 2. REAL-TIME BINANCE WEBSOCKET
  // ==========================================
  private connectToBinance() {
    // We subscribe to 6 streams simultaneously: The live price ticker AND the Top 5 Order Book levels
    const streams = [
      'btcusdt@ticker',
      'ethusdt@ticker',
      'solusdt@ticker',
      'btcusdt@depth5@100ms',
      'ethusdt@depth5@100ms',
      'solusdt@depth5@100ms',
    ].join('/');

    this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const stream = payload.stream;
      const data = payload.data;

      // 1. Process Live Prices
      if (stream.includes('@ticker')) {
        const price = parseFloat(data.c); // 'c' is the live closing price
        if (stream.startsWith('btc')) this.liveBtcPrice.set(price);
        if (stream.startsWith('eth')) this.liveEthPrice.set(price);
        if (stream.startsWith('sol')) this.liveSolPrice.set(price);
      }

      // 2. Process Live Order Books
      if (stream.includes('@depth5')) {
        const formatted = {
          asks: this.formatDepth(data.asks).reverse(), // UI requires asks highest-to-lowest
          bids: this.formatDepth(data.bids),
          price: 0, // Price is handled by the ticker above
        };

        if (stream.startsWith('btc')) this.btcOrderBook.set(formatted);
        if (stream.startsWith('eth')) this.ethOrderBook.set(formatted);
        if (stream.startsWith('sol')) this.solOrderBook.set(formatted);
      }
    };
  }

  // Parses Binance's raw string arrays into our Angular interface
  private formatDepth(rawOrders: string[][]): OrderBookLevel[] {
    let sum = 0;

    const top3Orders = rawOrders.slice(0, 3);

    const levels = top3Orders.map((order) => {
      const p = parseFloat(order[0]);
      const size = parseFloat(order[1]);
      sum += size;
      return { p, size, sum, width: '' };
    });

    // Calculate the CSS width for the visual background bars
    return levels.map((order) => {
      order.width = `${Math.min((order.sum / sum) * 100, 100)}%`;
      return order;
    });
  }
}
