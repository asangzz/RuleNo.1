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

export interface AnalysisResult {
  ticker: string;
  meaning: string;
  moat: string;
  management: string;
  isWonderful: boolean;
  riskScore: number;
  summary: string;
}

export interface ComparisonResult {
  comparisons: AnalysisResult[];
  winnerTicker: string;
  winnerReasoning: string;
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  averagePrice: number;
  purchaseDate: string;
  createdAt: string;
}
