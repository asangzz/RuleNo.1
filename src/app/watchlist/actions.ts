"use server";

import { getStockData, getHistoricalGrowth } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const [data, growth] = await Promise.all([
      getStockData(ticker.toUpperCase()),
      getHistoricalGrowth(ticker.toUpperCase())
    ]);

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    let historicalHighPE = 20;
    if (growth && growth.peHigh.length > 0) {
      // Average the historical high PEs to get a robust default
      const sum = growth.peHigh.reduce((acc, curr) => acc + curr.value, 0);
      historicalHighPE = sum / growth.peHigh.length;
    }

    return {
      success: true,
      data: {
        ...data,
        historicalHighPE
      }
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
