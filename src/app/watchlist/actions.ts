"use server";

import { getStockData, getHistoricalGrowth } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const tickerUpper = ticker.toUpperCase();
    const data = await getStockData(tickerUpper);
    const historical = await getHistoricalGrowth(tickerUpper);

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    // Calculate historical high PE
    let historicalHighPE = 20; // default
    if (historical && historical.length > 0) {
      const peValues = historical.map(h => h.highPE).filter(p => p && p > 0);
      if (peValues.length > 0) {
        historicalHighPE = peValues.reduce((a, b) => a + b, 0) / peValues.length;
      }
    }

    return {
      success: true,
      data: {
        ...data,
        historicalHighPE,
        historical
      }
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
