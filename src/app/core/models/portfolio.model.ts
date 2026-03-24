export enum TxType {
  BUY = 'BUY',
  SELL = 'SELL',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export interface MarketTick {
  BTC?: number;
  ETH?: number;
  SOL?: number;
}

export enum TxStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Asset {
  id: string;
  symbol: string;
  amount: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  assetSymbol: string;
  amount: number;
  priceAtTime: number;
  fee: number;
  status: TxStatus;
  createdAt: string;
}

export interface OrderBookLevel {
  p: number;
  size: number;
  sum: number;
  width: string;
}
export interface OrderBookData {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  price: number;
}

export interface InstitutionalProfile {
  id: string;
  email: string;
  fullName: string;
  usdBalance: number;
  assets: Asset[];
  transactions: Transaction[];
  updatedAt: string;
}
