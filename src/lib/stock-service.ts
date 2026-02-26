import YahooFinance from 'yahoo-finance2';
import { StockData, HistoricalData, HistoricalPoint } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData | null> {
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 11); // Fetch 11 years to ensure 10 growth points

    const period1 = Math.floor(tenYearsAgo.getTime() / 1000);
    const period2 = Math.floor(now.getTime() / 1000);

    const queryOptions = {
      module: 'financials' as const,
      period1,
      period2,
    };

    const moduleOptions = { validateResult: false as const };

    // We need to make separate calls for each metric because the API
    // often only returns one type per call or has inconsistent results for multiple types
    interface YahooFundamentalItem {
      asOfDate: string | Date;
      reportedValue: number;
    }

    const [epsRes, revRes, equityRes] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualEarningsPerShare' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualTotalRevenue' }, moduleOptions),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...queryOptions, type: 'annualStockholdersEquity' }, moduleOptions),
    ]);

    const formatData = (data: YahooFundamentalItem[]): HistoricalPoint[] => {
      if (!data) return [];
      return data
        .map((item) => ({
          year: new Date(item.asOfDate).getFullYear(),
          value: item.reportedValue || 0,
        }))
        .sort((a, b) => a.year - b.year);
    };

    return {
      annualEarningsPerShare: formatData(epsRes as unknown as YahooFundamentalItem[]),
      annualTotalRevenue: formatData(revRes as unknown as YahooFundamentalItem[]),
      annualStockholdersEquity: formatData(equityRes as unknown as YahooFundamentalItem[]),
    };
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return null;
  }
}
