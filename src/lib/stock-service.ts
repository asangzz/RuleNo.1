import YahooFinance from 'yahoo-finance2';
import { StockInfo, HistoricalData } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function getStockData(ticker: string): Promise<StockInfo | null> {
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

interface YahooFundamentalItem {
  asOfDate: Date;
  reportedValue?: { raw: number } | number;
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 11);

    const queryOptions = {
      period1: Math.floor(tenYearsAgo.getTime() / 1000),
      period2: Math.floor(now.getTime() / 1000),
      module: 'financials',
    };

    const moduleOptions = { validateResult: false } as const;

    // Fetching different metrics separately as suggested by memory
    const [epsData, revenueData, equityData] = (await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualEarningsPerShare' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualTotalRevenue' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualStockholdersEquity' }, moduleOptions),
    ])) as unknown as YahooFundamentalItem[][];

    // Consolidate data by year
    const yearlyMap: Record<number, Partial<HistoricalData>> = {};

    const processData = (data: YahooFundamentalItem[], key: keyof HistoricalData) => {
      data.forEach((item) => {
        if (item && item.asOfDate) {
          const year = new Date(item.asOfDate).getFullYear();
          if (!yearlyMap[year]) yearlyMap[year] = { year };
          const value = item.reportedValue;
          yearlyMap[year][key] = (typeof value === 'object' ? value?.raw : value) || 0;
        }
      });
    };

    processData(epsData, 'eps');
    processData(revenueData, 'revenue');
    processData(equityData, 'equity');

    return Object.values(yearlyMap)
      .filter((d): d is HistoricalData => d.eps !== undefined || d.revenue !== undefined || d.equity !== undefined)
      .sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}
