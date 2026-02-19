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
  value: number;
}

export interface GrowthData {
  eps: HistoricalData[];
  revenue: HistoricalData[];
  equity: HistoricalData[];
  peHigh: HistoricalData[];
  peLow: HistoricalData[];
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

export async function getHistoricalGrowth(ticker: string): Promise<GrowthData | null> {
  try {
    const now = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 10);

    // Using fundamentalsTimeSeries for financial history
    // We cast to unknown then to a specific partial interface to handle the library's complex union response types safely
    // We disable validation because Yahoo's response often contains unexpected fields
    const [financials, balanceSheet, chartData] = await Promise.all([
      yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: tenYearsAgo,
        type: 'annual',
        module: 'financials'
      }, { validateResult: false }),
      yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: tenYearsAgo,
        type: 'annual',
        module: 'balance-sheet'
      }, { validateResult: false }),
      yahooFinance.chart(ticker, {
        period1: tenYearsAgo,
        interval: '1mo'
      })
    ]);

    const eps: HistoricalData[] = [];
    const revenue: HistoricalData[] = [];
    const equity: HistoricalData[] = [];
    const peHigh: HistoricalData[] = [];
    const peLow: HistoricalData[] = [];

    // Process Income Statement (EPS and Revenue)
    if (Array.isArray(financials)) {
      (financials as unknown[]).forEach((item) => {
        const i = item as { date?: Date | number | string; dilutedEPS?: number; totalRevenue?: number };
        if (!i.date) return;
        const year = new Date(i.date).getFullYear();
        if (i.dilutedEPS !== undefined && i.dilutedEPS !== null) eps.push({ year, value: i.dilutedEPS });
        if (i.totalRevenue !== undefined && i.totalRevenue !== null) revenue.push({ year, value: i.totalRevenue });
      });
    }

    // Process Balance Sheet (Equity)
    if (Array.isArray(balanceSheet)) {
      (balanceSheet as unknown[]).forEach((item) => {
        const i = item as { date?: Date | number | string; stockholdersEquity?: number };
        if (!i.date) return;
        const year = new Date(i.date).getFullYear();
        if (i.stockholdersEquity !== undefined && i.stockholdersEquity !== null) equity.push({ year, value: i.stockholdersEquity });
      });
    }

    // Process Price History to calculate Yearly High/Low PE
    const yearlyPrices: Record<number, { high: number; low: number }> = {};
    if (chartData && chartData.quotes) {
      chartData.quotes.forEach(quote => {
        if (!quote.date || quote.high === undefined || quote.high === null || quote.low === undefined || quote.low === null) return;

        const year = new Date(quote.date).getFullYear();
        const high = quote.high as number;
        const low = quote.low as number;

        if (!yearlyPrices[year]) {
          yearlyPrices[year] = { high, low };
        } else {
          yearlyPrices[year].high = Math.max(yearlyPrices[year].high, high);
          yearlyPrices[year].low = Math.min(yearlyPrices[year].low, low);
        }
      });
    }

    // Match Prices with EPS to calculate PE Ratios
    // We match by year
    eps.forEach(item => {
      const prices = yearlyPrices[item.year];
      if (prices && item.value > 0) {
        peHigh.push({ year: item.year, value: prices.high / item.value });
        peLow.push({ year: item.year, value: prices.low / item.value });
      }
    });

    return {
      eps: eps.sort((a, b) => a.year - b.year),
      revenue: revenue.sort((a, b) => a.year - b.year),
      equity: equity.sort((a, b) => a.year - b.year),
      peHigh: peHigh.sort((a, b) => a.year - b.year),
      peLow: peLow.sort((a, b) => a.year - b.year),
    };

  } catch (error) {
    console.error(`Error fetching historical growth for ${ticker}:`, error);
    return null;
  }
}
