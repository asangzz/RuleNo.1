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

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 11); // Get 11 years to ensure 10 years of growth

    // Note: yahoo-finance2 fundamentalsTimeSeries requires separate calls for different types
    // or handles them in a specific way. For simplicity and reliability, we'll try to get
    // the annual financials.

    // Since the API can be tricky with types, we'll fetch a few common ones
    // and consolidate them. In a real app, we'd handle more types.

    // This is a simplified implementation for now.
    // In many cases, yahooFinance.fundamentalsTimeSeries returns an array of objects.

    // Mocking for now if API fails or returns unexpected format,
    // but the structure will be ready for the UI.
    // In a real environment, we'd parse the 'result' into the HistoricalData interface.

    // We'll fetch multiple metrics and merge them by year
    const types = ['annualEarningsPerShare', 'annualTotalRevenue', 'annualStockholdersEquity'];
    const results = await Promise.all(types.map(type =>
      yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: Math.floor(start.getTime() / 1000),
        period2: Math.floor(end.getTime() / 1000),
        type,
        module: 'financials',
      }, { validateResult: false }).catch(() => [])
    ));

    const dataByYear: Record<number, HistoricalData> = {};

    results.forEach((result, index) => {
      const type = types[index];
      if (Array.isArray(result)) {
        result.forEach((item) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = item as any;
          const date = new Date(data.asOfDate);
          const year = date.getFullYear();
          if (!dataByYear[year]) {
            dataByYear[year] = { year, eps: 0, revenue: 0, equity: 0 };
          }

          const value = data.reportedValue || 0;
          if (type === 'annualEarningsPerShare') dataByYear[year].eps = value;
          if (type === 'annualTotalRevenue') dataByYear[year].revenue = value;
          if (type === 'annualStockholdersEquity') dataByYear[year].equity = value;
        });
      }
    });

    return Object.values(dataByYear).sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return [];
  }
}
