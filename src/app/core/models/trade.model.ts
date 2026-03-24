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

export interface DepositConfig {
  name: string;
  symbol: string;
  network: string;
  icon: string;
  iconClass: string;
  address: string;
  warning: string;
}
