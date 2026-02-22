import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface HistoricalData {
  year: number;
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
  historicalData?: HistoricalData[];
}

export async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) return null;

    // Fetch historical fundamentals (10 years)
    let historicalData: HistoricalData[] = [];
    try {
      const period1 = Math.floor((Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) / 1000);
      const period2 = Math.floor(Date.now() / 1000);

      // yahoo-finance2 fundamentalsTimeSeries can be tricky.
      // Sometimes it's better to use multiple calls for different types if they aren't returned together.

      const epsData = await yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, module: 'financials', type: 'annualEarningsPerShare' }, { validateResult: false });
      const revData = await yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, module: 'financials', type: 'annualTotalRevenue' }, { validateResult: false });
      const equityData = await yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, module: 'financials', type: 'annualStockholdersEquity' }, { validateResult: false });

      // Merge data by year
      const yearsMap = new Map<number, HistoricalData>();

      interface YahooFundamentalItem {
        asOfDate: string | Date;
        reportedValue?: { raw: number } | number;
      }

      const processData = (data: unknown[], key: keyof Omit<HistoricalData, 'year'>) => {
        if (!data || !Array.isArray(data)) return;
        (data as YahooFundamentalItem[]).forEach(item => {
          const year = new Date(item.asOfDate).getFullYear();
          if (!yearsMap.has(year)) {
            yearsMap.set(year, { year, eps: 0, revenue: 0, equity: 0 });
          }
          const entry = yearsMap.get(year)!;
          const val = typeof item.reportedValue === 'object' ? item.reportedValue?.raw : item.reportedValue;
          entry[key] = val || 0;
        });
      };

      processData(epsData, 'eps');
      processData(revData, 'revenue');
      processData(equityData, 'equity');

      historicalData = Array.from(yearsMap.values()).sort((a, b) => b.year - a.year);

    } catch (hError) {
      console.warn(`Could not fetch historical data for ${ticker}:`, hError);
    }

    return {
      ticker: quote.symbol,
      name: quote.longName || quote.shortName || ticker,
      currentPrice: quote.regularMarketPrice || 0,
      eps: quote.epsTrailingTwelveMonths || 0,
      exchange: quote.fullExchangeName || '',
      currency: quote.currency || 'USD',
      historicalData: historicalData.length > 0 ? historicalData : undefined,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}
