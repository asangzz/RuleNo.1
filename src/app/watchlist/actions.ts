"use server";

import { getStockData, getHistoricalHighPE, getHistoricalGrowth } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const data = await getStockData(ticker.toUpperCase());

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    const historicalHighPE = await getHistoricalHighPE(ticker);
    const historicalGrowth = await getHistoricalGrowth(ticker);

    return { success: true, data: { ...data, historicalHighPE, historicalGrowth } };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
