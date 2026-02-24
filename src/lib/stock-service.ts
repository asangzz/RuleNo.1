import YahooFinance from 'yahoo-finance2';
import { StockInfo, HistoricalData } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function getStockData(ticker: string): Promise<StockInfo | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) return null;

    const historicalData = await getHistoricalGrowth(ticker);

    return {
      ticker: quote.symbol,
      name: quote.longName || quote.shortName || ticker,
      currentPrice: quote.regularMarketPrice || 0,
      eps: quote.epsTrailingTwelveMonths || 0,
      exchange: quote.fullExchangeName || '',
      currency: quote.currency || 'USD',
      historicalData,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}

interface YahooFundamentalItem {
  asOfDate: Date | string;
  reportedValue: number;
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60);

    const queryOptions = {
      period1: tenYearsAgo,
      period2: now,
      module: 'financials',
    };

    // We need to make separate calls because the API often doesn't like multiple types in one call
    // or the library handles it better this way.
    const [epsData, revData, equityData] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualEarningsPerShare' }, { validateResult: false }) as Promise<YahooFundamentalItem[]>,
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualTotalRevenue' }, { validateResult: false }) as Promise<YahooFundamentalItem[]>,
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualStockholdersEquity' }, { validateResult: false }) as Promise<YahooFundamentalItem[]>,
    ]);

    const historicalMap: Record<number, HistoricalData> = {};

    const processResults = (results: YahooFundamentalItem[], field: keyof HistoricalData) => {
      results.forEach((item: YahooFundamentalItem) => {
        const year = new Date(item.asOfDate).getFullYear();
        if (!historicalMap[year]) {
          historicalMap[year] = { year, eps: 0, revenue: 0, equity: 0 };
        }
        historicalMap[year][field] = item.reportedValue || 0;
      });
    };

    processResults(epsData, 'eps');
    processResults(revData, 'revenue');
    processResults(equityData, 'equity');

    return Object.values(historicalMap).sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}
