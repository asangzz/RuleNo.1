import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  equity: number;
}

interface YahooFundamentalItem {
  asOfDate: Date | string;
  reportedValue?: {
    raw: number;
  };
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
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 11);

    const period1 = Math.floor(tenYearsAgo.getTime() / 1000);
    const period2 = Math.floor(now.getTime() / 1000);

    const options = {
      period1,
      period2,
      module: 'financials',
      validateResult: false
    };

    // Yahoo Finance API for fundamentalsTimeSeries often requires separate calls for different types
    const epsData = await yahooFinance.fundamentalsTimeSeries(ticker, { ...options, type: 'annualDilutedEPS' }) as unknown as YahooFundamentalItem[];
    const revenueData = await yahooFinance.fundamentalsTimeSeries(ticker, { ...options, type: 'annualTotalRevenue' }) as unknown as YahooFundamentalItem[];
    const equityData = await yahooFinance.fundamentalsTimeSeries(ticker, { ...options, type: 'annualStockholdersEquity' }) as unknown as YahooFundamentalItem[];

    const yearsMap = new Map<number, Partial<HistoricalData>>();

    const process = (data: YahooFundamentalItem[], key: keyof Omit<HistoricalData, 'year'>) => {
      data.forEach(item => {
        if (item && item.asOfDate) {
          const year = new Date(item.asOfDate).getFullYear();
          const current = yearsMap.get(year) || { year };
          current[key] = item.reportedValue?.raw || 0;
          yearsMap.set(year, current);
        }
      });
    };

    process(epsData, 'eps');
    process(revenueData, 'revenue');
    process(equityData, 'equity');

    return Array.from(yearsMap.values())
      .filter(d => d.eps !== undefined || d.revenue !== undefined || d.equity !== undefined)
      .sort((a, b) => (a.year || 0) - (b.year || 0)) as HistoricalData[];

  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}
