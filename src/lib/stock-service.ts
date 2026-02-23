import YahooFinance from 'yahoo-finance2';
import { StockData, HistoricalData } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) return null;

    // Fetch historical high PE (mocked/simplified for this implementation)
    const historicalHighPE = await getHistoricalHighPE(ticker);

    return {
      ticker: quote.symbol,
      name: quote.longName || quote.shortName || ticker,
      currentPrice: quote.regularMarketPrice || 0,
      eps: quote.epsTrailingTwelveMonths || 0,
      exchange: quote.fullExchangeName || '',
      currency: quote.currency || 'USD',
      historicalHighPE,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}

export async function getHistoricalHighPE(ticker: string): Promise<number> {
  try {
    // In a real scenario, we would fetch historical annual high prices and divide by annual EPS.
    // For this implementation, we'll fetch the trailing PE and add a buffer,
    // or use summaryDetail if available.
    const summary = await yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail'] });
    const trailingPE = summary?.summaryDetail?.trailingPE || 20;
    const forwardPE = summary?.summaryDetail?.forwardPE || 20;

    // Simple average of trailing and forward as a "robust" default
    return parseFloat(((trailingPE + forwardPE) / 2).toFixed(2));
  } catch {
    return 20;
  }
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 10 * 365 * 24 * 60 * 60; // 10 years ago

  try {
    // The API only supports a single type string per call
    const [eps, revenue, equity] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annualEarningsPerShare', module: 'financials' }, { validateResult: false }),
      yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annualTotalRevenue', module: 'financials' }, { validateResult: false }),
      yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annualStockholdersEquity', module: 'financials' }, { validateResult: false })
    ]);

    const merged: Record<number, HistoricalData> = {};

    interface YahooFundamentalItem {
      timestamp: Date;
      reportedValue: number;
    }

    (eps as unknown as YahooFundamentalItem[]).forEach((item) => {
      const year = new Date(item.timestamp).getFullYear();
      merged[year] = { year, eps: item.reportedValue || 0, revenue: 0, equity: 0 };
    });

    (revenue as unknown as YahooFundamentalItem[]).forEach((item) => {
      const year = new Date(item.timestamp).getFullYear();
      if (merged[year]) merged[year].revenue = item.reportedValue || 0;
    });

    (equity as unknown as YahooFundamentalItem[]).forEach((item) => {
      const year = new Date(item.timestamp).getFullYear();
      if (merged[year]) merged[year].equity = item.reportedValue || 0;
    });

    return Object.values(merged).sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}
