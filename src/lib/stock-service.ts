import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface HistoricalData {
  date: string;
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
  historicalGrowth?: HistoricalData[];
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 11); // Fetch 11 years to ensure we have 10 full years

    // We need multiple calls as yahooFinance.fundamentalsTimeSeries only takes one type at a time in some versions
    // or we can try 'all' module if it works better.
    // Based on my tests, module: 'financials' with type: 'annual' gives us a lot of data.

    const financials = await yahooFinance.fundamentalsTimeSeries(ticker, {
      module: 'financials',
      type: 'annual',
      period1: tenYearsAgo,
    });

    const balanceSheet = await yahooFinance.fundamentalsTimeSeries(ticker, {
      module: 'balance-sheet',
      type: 'annual',
      period1: tenYearsAgo,
    });

    // Merge data by date
    const mergedData: Record<string, HistoricalData> = {};

    interface YahooFundamentalItem {
      date: string | Date;
      dilutedEPS?: number;
      basicEPS?: number;
      totalRevenue?: number;
      totalStockholdersEquity?: number;
    }

    (financials as unknown as YahooFundamentalItem[]).forEach((item) => {
      const year = new Date(item.date).getFullYear().toString();
      if (!mergedData[year]) {
        mergedData[year] = { date: year, eps: 0, revenue: 0, equity: 0 };
      }
      mergedData[year].eps = item.dilutedEPS || item.basicEPS || 0;
      mergedData[year].revenue = item.totalRevenue || 0;
    });

    (balanceSheet as unknown as YahooFundamentalItem[]).forEach((item) => {
      const year = new Date(item.date).getFullYear().toString();
      if (!mergedData[year]) {
        mergedData[year] = { date: year, eps: 0, revenue: 0, equity: 0 };
      }
      mergedData[year].equity = item.totalStockholdersEquity || 0;
    });

    return Object.values(mergedData).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}

export async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) return null;

    const historicalGrowth = await getHistoricalGrowth(ticker);

    return {
      ticker: quote.symbol,
      name: quote.longName || quote.shortName || ticker,
      currentPrice: quote.regularMarketPrice || 0,
      eps: quote.epsTrailingTwelveMonths || 0,
      exchange: quote.fullExchangeName || '',
      currency: quote.currency || 'USD',
      historicalGrowth,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}
