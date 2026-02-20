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
  highPE: number;
  lowPE: number;
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
    const tenYearsAgo = new Date(now.getFullYear() - 11, 0, 1);

    // 1. Fetch Fundamentals
    const fundamentals = await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: tenYearsAgo,
      period2: now,
      type: 'annual',
      module: 'all'
    }, { validateResult: false }) as unknown[];

    // 2. Fetch Chart for High/Low prices
    const chart = await yahooFinance.chart(ticker, {
      period1: tenYearsAgo,
      interval: '1d'
    });

    const yearlyData: Map<number, HistoricalData> = new Map();

    // Process fundamentals
    // Note: yahoo-finance2 returns a mix of entries. We need to group by year.
    fundamentals.forEach((rawItem: unknown) => {
      const item = rawItem as {
        date?: string | Date;
        basicEPS?: number;
        totalRevenue?: number;
        stockholdersEquity?: number;
      };
      if (!item.date) return;
      const date = new Date(item.date);
      const year = date.getFullYear();

      if (!yearlyData.has(year)) {
        yearlyData.set(year, { year, eps: 0, revenue: 0, equity: 0, highPE: 0, lowPE: 0 });
      }

      const data = yearlyData.get(year)!;
      if (item.basicEPS !== undefined) data.eps = item.basicEPS;
      if (item.totalRevenue !== undefined) data.revenue = item.totalRevenue;
      if (item.stockholdersEquity !== undefined) data.equity = item.stockholdersEquity;
    });

    // Process prices for PE
    if (chart && chart.quotes) {
      const pricesByYear: Map<number, { high: number, low: number }> = new Map();

      chart.quotes.forEach(quote => {
        if (!quote.date || quote.high === undefined || quote.low === undefined || quote.high === null || quote.low === null) return;
        const year = new Date(quote.date).getFullYear();

        const high = quote.high as number;
        const low = quote.low as number;

        if (!pricesByYear.has(year)) {
          pricesByYear.set(year, { high, low });
        } else {
          const current = pricesByYear.get(year)!;
          current.high = Math.max(current.high, high);
          current.low = Math.min(current.low, low);
        }
      });

      // Calculate high/low PE
      yearlyData.forEach((data, year) => {
        const prices = pricesByYear.get(year);
        if (prices && data.eps > 0) {
          data.highPE = prices.high / data.eps;
          data.lowPE = prices.low / data.eps;
        }
      });
    }

    return Array.from(yearlyData.values())
      .filter(d => d.eps !== 0 || d.revenue !== 0 || d.equity !== 0)
      .sort((a, b) => a.year - b.year);

  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
}
