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

export async function getHistoricalEPS(ticker: string): Promise<HistoricalData[]> {
  try {
    const result = await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: '2014-01-01',
      type: 'annual',
      module: 'all'
    });

    if (!result || !Array.isArray(result)) return [];

    // Map and filter for dilutedEPS, then sort by year
    const epsData = (result as unknown as { date: string | Date; dilutedEPS?: number }[])
      .filter((item) => item.dilutedEPS !== undefined)
      .map((item) => ({
        year: new Date(item.date).getFullYear(),
        value: item.dilutedEPS as number
      }))
      .sort((a, b) => a.year - b.year);

    return epsData;
  } catch (error) {
    console.error(`Error fetching historical EPS for ${ticker}:`, error);
    return [];
  }
}
