import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface StockInfo {
  price: number;
  eps: number;
  name: string;
  symbol: string;
}

export interface HistoricalData {
  date: number;
  revenue: number;
  earnings: number;
}

export async function getStockData(ticker: string): Promise<StockInfo> {
  try {
    const quote = await yahooFinance.quote(ticker);
    return {
      price: quote.regularMarketPrice ?? 0,
      eps: quote.epsTrailingTwelveMonths ?? 0,
      name: quote.longName || quote.shortName || quote.displayName || ticker,
      symbol: quote.symbol,
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    throw error;
  }
}

export async function getHistoricalData(ticker: string): Promise<HistoricalData[]> {
  try {
    const result = await yahooFinance.quoteSummary(ticker, { modules: ['earnings'] });
    return result.earnings?.financialsChart?.yearly || [];
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return [];
  }
}
