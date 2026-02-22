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

interface YahooFundamentalItem {
  asOfDate: string | Date;
  reportedValue: number;
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60);

    const commonOptions = {
      period1: tenYearsAgo,
      period2: now,
      module: 'financials' as "financials",
      validateResult: false
    };

    const [epsRes, revRes, eqRes] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, { ...commonOptions, type: 'annualEarningsPerShare' }),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...commonOptions, type: 'annualTotalRevenue' }),
      yahooFinance.fundamentalsTimeSeries(ticker, { ...commonOptions, type: 'annualStockholdersEquity' })
    ]);

    const dataMap: Record<number, HistoricalData> = {};

    const process = (res: unknown, key: keyof HistoricalData) => {
      if (Array.isArray(res)) {
        (res as YahooFundamentalItem[]).forEach(item => {
          const date = new Date(item.asOfDate);
          const year = date.getFullYear();
          if (!dataMap[year]) {
            dataMap[year] = { year, eps: 0, revenue: 0, equity: 0 };
          }
          dataMap[year][key] = item.reportedValue || 0;
        });
      }
    };

    process(epsRes, 'eps');
    process(revRes, 'revenue');
    process(eqRes, 'equity');

    return Object.values(dataMap).sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return [];
  }
}
