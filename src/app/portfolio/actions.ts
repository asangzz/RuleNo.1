"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getStockData } from "@/lib/stock-service";
import { PortfolioTransaction, TransactionType } from "@/lib/types";
import { revalidatePath } from "next/cache";

/**
 * Fetches all portfolio transactions for a user and gets current stock info.
 */
export async function getPortfolio(userId: string) {
  if (!userId) return { success: false, error: "User ID is required" };

  try {
    const transactionsRef = adminDb.collection("users").doc(userId).collection("portfolio");
    const snapshot = await transactionsRef.orderBy("date", "desc").get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    // Get unique tickers to fetch current prices
    const tickers = [...new Set(transactions.map(t => t.ticker))];
    const stockInfoPromises = tickers.map(ticker => getStockData(ticker));
    const stockInfos = await Promise.all(stockInfoPromises);

    const currentPrices: Record<string, { price: number; name: string }> = {};
    stockInfos.forEach(info => {
      if (info) {
        currentPrices[info.ticker] = {
          price: info.currentPrice,
          name: info.name
        };
      }
    });

    return {
      success: true,
      data: {
        transactions,
        currentPrices
      }
    };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio data" };
  }
}

/**
 * Adds a new transaction to the user's portfolio.
 */
export async function addTransaction(
  userId: string,
  ticker: string,
  type: TransactionType,
  shares: number,
  price: number,
  date: string
) {
  if (!userId) return { success: false, error: "User ID is required" };

  try {
    const transaction = {
      ticker: ticker.toUpperCase(),
      type,
      shares,
      price,
      date,
      createdAt: new Date().toISOString()
    };

    await adminDb.collection("users").doc(userId).collection("portfolio").add(transaction);

    revalidatePath("/portfolio");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

/**
 * Deletes a transaction from the user's portfolio.
 */
export async function deleteTransaction(userId: string, transactionId: string) {
  if (!userId || !transactionId) return { success: false, error: "IDs are required" };

  try {
    await adminDb.collection("users").doc(userId).collection("portfolio").doc(transactionId).delete();

    revalidatePath("/portfolio");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}
