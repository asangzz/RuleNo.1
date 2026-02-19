"use server";

import { getStockData, getHistoricalEPS } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  if (!ticker) {
    return { success: false, error: "Ticker is required" };
  }

  try {
    const data = await getStockData(ticker.toUpperCase());

    if (!data) {
      return { success: false, error: `Could not find data for ticker: ${ticker}` };
    }

    const historicalEPS = await getHistoricalEPS(ticker.toUpperCase());

    return {
      success: true,
      data: {
        ...data,
        historicalEPS
      }
    };
  } catch (error) {
    console.error("Error in fetchStockInfo action:", error);
    return { success: false, error: "Failed to fetch stock information" };
  }
}
