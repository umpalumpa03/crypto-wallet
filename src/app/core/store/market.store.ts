import { signalStore, withState, withMethods, patchState, withHooks, withComputed } from '@ngrx/signals';
import { OrderBookData, OrderBookLevel } from '../models/portfolio.model';
import { computed, effect } from '@angular/core';

type MarketState = {
  liveBtcPrice: number;
  liveEthPrice: number;
  liveSolPrice: number;
  btcOrderBook: OrderBookData;
  ethOrderBook: OrderBookData;
  solOrderBook: OrderBookData;
  btcPriceHistory: [number, number][];
  ethPriceHistory: [number, number][];
  solPriceHistory: [number, number][];
  searchQuery: string;
  selectedAsset: 'BTC' | 'ETH' | 'SOL';
};

const initialState: MarketState = {
  liveBtcPrice: 0,
  liveEthPrice: 0,
  liveSolPrice: 0,
  btcOrderBook: { asks: [], bids: [], price: 0 },
  ethOrderBook: { asks: [], bids: [], price: 0 },
  solOrderBook: { asks: [], bids: [], price: 0 },
  btcPriceHistory: [],
  ethPriceHistory: [],
  solPriceHistory: [],
  searchQuery: '',
  selectedAsset: 'BTC',
};

export const MarketStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    allAssets: computed(() => [
      { name: 'Bitcoin', symbol: 'BTC', price: store.liveBtcPrice(), history: store.btcPriceHistory() },
      { name: 'Ethereum', symbol: 'ETH', price: store.liveEthPrice(), history: store.ethPriceHistory() },
      { name: 'Solana', symbol: 'SOL', price: store.liveSolPrice(), history: store.solPriceHistory() },
    ]),
  })),
  withComputed((store) => ({
    filteredAssets: computed(() => {
      const query = store.searchQuery().toLowerCase().trim();
      const assets = store.allAssets();

      if (!query) return assets;

      return assets.filter(a => 
        a.name.toLowerCase().includes(query) || 
        a.symbol.toLowerCase().includes(query)
      );
    })
  })),
  withMethods((store) => {
    let ws: WebSocket;
    let throttleInterval: any;

    const updateHistory = (history: [number, number][], newPrice: number) => {
      const newHistory: [number, number][] = [...history, [Date.now(), newPrice]];
      if (newHistory.length > 60) newHistory.shift();
      return newHistory;
    };

    const formatDepth = (rawOrders: string[][]): OrderBookLevel[] => {
      let sum = 0;
      const top3Orders = rawOrders.slice(0, 3);
      const levels = top3Orders.map((order) => {
        const p = parseFloat(order[0]);
        const size = parseFloat(order[1]);
        sum += size;
        return { p, size, sum, width: '' };
      });
      return levels.map((order) => {
        order.width = `${Math.min((order.sum / sum) * 100, 100)}%`;
        return order;
      });
    };

    return {
      setSearchQuery(query: string): void {
        patchState(store, { searchQuery: query });
      },

      setSelectedAsset(asset: 'BTC' | 'ETH' | 'SOL'): void {
        patchState(store, { selectedAsset: asset });
      },

      async loadRealHistory() {
        try {
          const [btcRes, ethRes, solRes] = await Promise.all([
            fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=60'),
            fetch('https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1s&limit=60'),
            fetch('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1s&limit=60'),
          ]);

          const parsePrices = async (res: Response): Promise<[number, number][]> => {
            const data = await res.json();
            return data.map((candle: any[]) => [candle[0], parseFloat(candle[4])]);
          };

          const btcPrices = await parsePrices(btcRes);
          const ethPrices = await parsePrices(ethRes);
          const solPrices = await parsePrices(solRes);

          patchState(store, {
            btcPriceHistory: btcPrices,
            ethPriceHistory: ethPrices,
            solPriceHistory: solPrices,
            liveBtcPrice: btcPrices[btcPrices.length - 1][1],
            liveEthPrice: ethPrices[ethPrices.length - 1][1],
            liveSolPrice: solPrices[solPrices.length - 1][1],
          });
        } catch (error) {
          console.error('Failed to load Binance history.', error);
        }
      },

      connectToBinance() {
        const streams = [
          'btcusdt@ticker',
          'ethusdt@ticker',
          'solusdt@ticker',
          'btcusdt@depth5@100ms',
          'ethusdt@depth5@100ms',
          'solusdt@depth5@100ms',
        ].join('/');

        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

        ws.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          const stream = payload.stream;
          const data = payload.data;

          if (stream.includes('@ticker')) {
            const price = parseFloat(data.c);
            if (stream.startsWith('btc')) patchState(store, { liveBtcPrice: price });
            if (stream.startsWith('eth')) patchState(store, { liveEthPrice: price });
            if (stream.startsWith('sol')) patchState(store, { liveSolPrice: price });
          }

          if (stream.includes('@depth5')) {
            const formatted = {
              asks: formatDepth(data.asks).reverse(),
              bids: formatDepth(data.bids),
              price: 0,
            };
            if (stream.startsWith('btc')) patchState(store, { btcOrderBook: formatted });
            if (stream.startsWith('eth')) patchState(store, { ethOrderBook: formatted });
            if (stream.startsWith('sol')) patchState(store, { solOrderBook: formatted });
          }
        };
      },

      startThrottling() {
        throttleInterval = setInterval(() => {
          if (store.btcPriceHistory().length > 0 && store.liveBtcPrice() > 0) {
            patchState(store, (state) => ({
              btcPriceHistory: updateHistory(state.btcPriceHistory, state.liveBtcPrice),
              ethPriceHistory: updateHistory(state.ethPriceHistory, state.liveEthPrice),
              solPriceHistory: updateHistory(state.solPriceHistory, state.liveSolPrice),
            }));
          }
        }, 2000);
      },

      stopThrottling() {
        clearInterval(throttleInterval);
        if (ws) ws.close();
      },
    };
  }),
  withHooks({
    onInit(store) {
      const saved = localStorage.getItem('aurora_market_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        patchState(store, { 
          searchQuery: parsed.searchQuery || '',
          selectedAsset: parsed.selectedAsset || 'BTC',
          btcPriceHistory: parsed.btcPriceHistory || [],
          ethPriceHistory: parsed.ethPriceHistory || [],
          solPriceHistory: parsed.solPriceHistory || []
        });
      }

      effect(() => {
        const stateToSave = {
          searchQuery: store.searchQuery(),
          selectedAsset: store.selectedAsset(),
          btcPriceHistory: store.btcPriceHistory(),
          ethPriceHistory: store.ethPriceHistory(),
          solPriceHistory: store.solPriceHistory()
        };
        localStorage.setItem('aurora_market_state', JSON.stringify(stateToSave));
      });

      store.loadRealHistory();
      store.connectToBinance();
      store.startThrottling();
    },
    onDestroy(store) {
      store.stopThrottling();
    },
  }),
);
