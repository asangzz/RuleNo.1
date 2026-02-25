import YahooFinance from 'yahoo-finance2';
import { StockData, HistoricalData } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface YahooFundamentalItem {
  asOfDate: Date;
  [key: string]: number | Date | string;
}

export async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) return null;

    return {
      ticker: quote.symbol,
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
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 11);

  const queryOptions = {
    period1: Math.floor(start.getTime() / 1000),
    period2: Math.floor(end.getTime() / 1000),
    module: 'financials' as const,
  };

  const moduleOptions = { validateResult: false as const };

  try {
    const [epsData, revData, equityData] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualEarningsPerShare' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualTotalRevenue' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualStockholdersEquity' }, moduleOptions),
    ]);

    const resultsMap: Record<number, HistoricalData> = {};

    const process = (data: unknown, key: keyof HistoricalData) => {
      if (!Array.isArray(data)) return;
      data.forEach((item: YahooFundamentalItem) => {
        const year = item.asOfDate.getFullYear();
        if (!resultsMap[year]) {
          resultsMap[year] = { year, eps: 0, revenue: 0, equity: 0 };
        }
        const valueKey = Object.keys(item).find(k => k !== 'asOfDate') || '';
        const value = item[valueKey];
        if (typeof value === 'number') {
          resultsMap[year][key] = value;
        }
      });
    };

    process(epsData, 'eps');
    process(revData, 'revenue');
    process(equityData, 'equity');

    return Object.values(resultsMap).sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}

export async function getHistoricalHighPE(ticker: string): Promise<number> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 10);

  const queryOptions = {
    period1: Math.floor(start.getTime() / 1000),
    period2: Math.floor(end.getTime() / 1000),
    module: 'financials' as const,
  };

  const moduleOptions = { validateResult: false as const };

  try {
    // Try to get trailing PE as a fallback
    const quote = await yahooFinance.quote(ticker);
    const trailingPE = quote.trailingPE || 20;

    // Try to get historical PE data if available
    const peData = await yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'trailingPE' }, moduleOptions);

    if (Array.isArray(peData) && peData.length > 0) {
      const pes = peData.map((item: YahooFundamentalItem) => {
        const valueKey = Object.keys(item).find(k => k !== 'asOfDate') || '';
        const value = item[valueKey];
        return typeof value === 'number' ? value : 0;
      }).filter(v => v > 0);

      if (pes.length > 0) {
        return Math.max(...pes);
      }
    }

    return trailingPE;
  } catch (error) {
    console.error(`Error fetching historical PE for ${ticker}:`, error);
    return 20;
  }
}
