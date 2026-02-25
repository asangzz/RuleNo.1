export interface UserSettings {
  currency: string;
  targetMOS: number;
}

export interface HistoricalData {
  year: number;
  eps: number;
  revenue: number;
  equity: number;
}

export interface StockData {
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  exchange: string;
  currency: string;
  historicalHighPE?: number;
  historicalGrowth?: HistoricalData[];
}
