import yahooFinance from 'yahoo-finance2';

// The library handles its own global config, but for SSR we sometimes need to be careful
if (typeof window === 'undefined') {
  // yahooFinance.setGlobalConfig is not always available depending on version/import
}

export interface StockData {
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  exchange: string;
  currency: string;
}

export interface HistoricalData {
  year: number;
  eps: number;
  revenue: number;
}

interface YahooFundamentalResponse {
  asOfDate: string | Date;
  reportedValue: number;
}

export async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = (await yahooFinance.quote(ticker)) as any;

    if (!quote) return null;

    return {
      ticker: quote.symbol || ticker,
      name: quote.longName || quote.shortName || ticker,
      currentPrice: quote.regularMarketPrice || 0,
      eps: quote.epsTrailingTwelveMonths || 0,
      exchange: quote.fullExchangeName || '',
      currency: quote.currency || 'USD',
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 11);

    const queryOptions = {
      period1: startDate,
      period2: endDate,
      module: 'financials',
      validateResult: false
    };

    // Yahoo Finance API only supports one type per call in fundamentalsTimeSeries
    const epsResult = (await yahooFinance.fundamentalsTimeSeries(ticker, {
      ...queryOptions,
      type: 'annualBasicEPS'
    })) as unknown as YahooFundamentalResponse[];

    const revResult = (await yahooFinance.fundamentalsTimeSeries(ticker, {
      ...queryOptions,
      type: 'annualTotalRevenue'
    })) as unknown as YahooFundamentalResponse[];

    const merged: Record<number, HistoricalData> = {};

    if (Array.isArray(epsResult)) {
      epsResult.forEach((item) => {
        const year = new Date(item.asOfDate).getFullYear();
        if (!merged[year]) merged[year] = { year, eps: 0, revenue: 0 };
        merged[year].eps = item.reportedValue;
      });
    }

    if (Array.isArray(revResult)) {
      revResult.forEach((item) => {
        const year = new Date(item.asOfDate).getFullYear();
        if (!merged[year]) merged[year] = { year, eps: 0, revenue: 0 };
        merged[year].revenue = item.reportedValue;
      });
    }

    return Object.values(merged).sort((a, b) => b.year - a.year); // Newest first
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}

export async function getHistoricalHighPE(ticker: string): Promise<number[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 11);

    // Some tickers might have this under different types, but annualTrailingPE is common
    const peResult = (await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: startDate,
      period2: endDate,
      module: 'financials',
      type: 'annualTrailingPE',
      validateResult: false
    })) as unknown as YahooFundamentalResponse[];

    if (Array.isArray(peResult)) {
      return peResult
        .map((item) => item.reportedValue)
        .filter((v): v is number => typeof v === 'number');
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical PE for ${ticker}:`, error);
    return [];
  }
}
