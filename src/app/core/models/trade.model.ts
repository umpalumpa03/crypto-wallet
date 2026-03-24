export interface TradeHistoryItem {
  id: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';
  assetSymbol: string;
  amount: number;
  priceAtTime: number;
  createdAt: string;
}

export interface PortfolioResponse {
  usdBalance: number;
  cryptoPortfolio: Record<string, number>;
}
