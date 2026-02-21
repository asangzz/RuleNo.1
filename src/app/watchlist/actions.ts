"use server";

import { getStockData, getHistoricalGrowth } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const data = await getStockData(ticker.toUpperCase());

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    const historicalData = await getHistoricalGrowth(ticker.toUpperCase());

    // Calculate average historical high PE
    const highPEs = historicalData
      .map(h => h.highPE)
      .filter((pe): pe is number => pe !== undefined && pe > 0);

    const avgHighPE = highPEs.length > 0
      ? parseFloat((highPEs.reduce((a, b) => a + b, 0) / highPEs.length).toFixed(2))
      : 20; // Default if no data

    return {
      success: true,
      data: {
        ...data,
        historicalHighPE: avgHighPE,
        historicalData
      }
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
