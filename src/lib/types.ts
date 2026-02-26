export interface UserSettings {
  currency: string;
  targetMOS: number;
}

export interface StockData {
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  exchange?: string;
  currency?: string;
}

export interface HistoricalPoint {
  year: number;
  value: number;
}

export interface HistoricalData {
  annualEarningsPerShare: HistoricalPoint[];
  annualTotalRevenue: HistoricalPoint[];
  annualStockholdersEquity: HistoricalPoint[];
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
  createdAt: string;
}
