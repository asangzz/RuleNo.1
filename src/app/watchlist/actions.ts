"use strict";
"use server";

import { getStockData, getHistoricalData } from "@/lib/stock-service";

export async function fetchStockInfo(ticker: string) {
  try {
    const data = await getStockData(ticker);
    return { success: true, data };
  } catch (error) {
    console.error("fetchStockInfo error:", error);
    return { success: false, error: "Could not fetch stock data. Please check the ticker." };
  }
}

export async function fetchHistoricalData(ticker: string) {
  try {
    const data = await getHistoricalData(ticker);
    return { success: true, data };
  } catch (error) {
    console.error("fetchHistoricalData error:", error);
    return { success: false, error: "Could not fetch historical data." };
  }
}
