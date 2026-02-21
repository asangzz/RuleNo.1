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
  revenue?: number;
  equity?: number;
  highPE?: number;
  lowPE?: number;
}

interface YahooFundamentalItem {
  asOfDate: string | Date;
  reportedValue: number;
}

export async function getHistoricalGrowth(ticker: string): Promise<HistoricalData[]> {
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 10);

    const fetchMetric = async (type: string): Promise<YahooFundamentalItem[]> => {
      try {
        const result = await yahooFinance.fundamentalsTimeSeries(ticker, {
          module: 'financials',
          type,
          period1: tenYearsAgo,
          period2: now
        }, { validateResult: false }) as unknown as Record<string, YahooFundamentalItem[]>;
        return result[type] || [];
      } catch (e) {
        console.warn(`Failed to fetch ${type} for ${ticker}:`, e);
        return [];
      }
    };

    const [epsData, revenueData, equityData] = await Promise.all([
      fetchMetric('DilutedEPS'),
      fetchMetric('TotalRevenue'),
      fetchMetric('StockholdersEquity'),
    ]);

    // Fetch historical prices for PE calculation
    let historicalPrices: { high: number; low: number; date: string | Date }[] = [];
    try {
      const prices = await yahooFinance.historical(ticker, {
        period1: tenYearsAgo,
        interval: '1d'
      });
      historicalPrices = prices.map(p => ({
        high: p.high,
        low: p.low,
        date: p.date
      }));
    } catch (e) {
      console.warn(`Failed to fetch historical prices for ${ticker}:`, e);
    }

    const yearlyHighs: Record<number, number> = {};
    const yearlyLows: Record<number, number> = {};

    historicalPrices.forEach(p => {
      const year = new Date(p.date).getFullYear();
      if (!yearlyHighs[year] || p.high > yearlyHighs[year]) yearlyHighs[year] = p.high;
      if (!yearlyLows[year] || p.low < yearlyLows[year]) yearlyLows[year] = p.low;
    });

    const historicalMap: Record<number, HistoricalData> = {};

    epsData.forEach((item) => {
      const year = new Date(item.asOfDate).getFullYear();
      const eps = item.reportedValue;
      const highPrice = yearlyHighs[year];
      const lowPrice = yearlyLows[year];

      historicalMap[year] = {
        ...historicalMap[year],
        year,
        eps,
        highPE: (highPrice && eps > 0) ? parseFloat((highPrice / eps).toFixed(2)) : undefined,
        lowPE: (lowPrice && eps > 0) ? parseFloat((lowPrice / eps).toFixed(2)) : undefined
      };
    });

    revenueData.forEach((item) => {
      const year = new Date(item.asOfDate).getFullYear();
      historicalMap[year] = { ...historicalMap[year], year, revenue: item.reportedValue };
    });

    equityData.forEach((item) => {
      const year = new Date(item.asOfDate).getFullYear();
      historicalMap[year] = { ...historicalMap[year], year, equity: item.reportedValue };
    });

    return Object.values(historicalMap).sort((a, b) => a.year - b.year);

  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return [];
  }
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
