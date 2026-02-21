"use server";

import { getStockData, getHistoricalGrowth, getHistoricalHighPE } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const data = await getStockData(ticker.toUpperCase());

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    // Fetch historical high PEs to provide a robust default
    const highPEs = await getHistoricalHighPE(ticker.toUpperCase());
    let averageHighPE = 15; // Conservative default
    if (highPEs.length > 0) {
      averageHighPE = highPEs.reduce((a, b) => a + b, 0) / highPEs.length;
    }

    return {
      success: true,
      data: {
        ...data,
        historicalHighPE: parseFloat(averageHighPE.toFixed(2))
      }
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}

export async function fetchHistoricalData(ticker: string) {
  if (!ticker) return { success: false, error: "Ticker is required" };
  try {
    const data = await getHistoricalGrowth(ticker.toUpperCase());
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return { success: false, error: "Failed to fetch historical data" };
  }
}
