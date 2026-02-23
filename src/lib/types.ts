export interface UserSettings {
  preferredCurrency: string;
  targetMOS: number;
}

export interface HistoricalData {
  year: number;
  eps: number;
  revenue: number;
  equity: number;
}

export interface StockInfo {
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  exchange: string;
  currency: string;
}
