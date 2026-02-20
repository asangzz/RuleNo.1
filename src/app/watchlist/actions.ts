"use server";

import { getStockData, getHistoricalGrowth } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const tickerUpper = ticker.toUpperCase();
    const [data, historical] = await Promise.all([
      getStockData(tickerUpper),
      getHistoricalGrowth(tickerUpper)
    ]);

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    // Calculate a robust default historicalHighPE by averaging historical annual high PEs
    const validHighPEs = historical
      .map(h => h.highPE)
      .filter(pe => pe > 0 && pe < 100); // Filter out outliers

    const avgHighPE = validHighPEs.length > 0
      ? validHighPEs.reduce((sum, val) => sum + val, 0) / validHighPEs.length
      : 20; // Default to 20 if no data

    return {
      success: true,
      data,
      historical,
      avgHighPE: parseFloat(avgHighPE.toFixed(1))
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
