"use server";

import { adminDb as db } from "@/lib/firebase-admin";
import { getStockData } from "@/lib/stock-service";
import { PortfolioTransaction, PortfolioData } from "@/lib/types";
import { calculatePortfolioPerformance } from "@/lib/rule-one";

export async function getPortfolio(userId: string): Promise<PortfolioData> {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    // Return mock data if no Firebase credentials are provided
    return {
      items: [
        {
          ticker: "AAPL",
          shares: 10,
          averageCost: 150,
          totalCost: 1500,
          currentPrice: 180,
          currentValue: 1800,
          totalGain: 300,
          totalGainPercentage: 20,
        },
        {
          ticker: "MSFT",
          shares: 5,
          averageCost: 300,
          totalCost: 1500,
          currentPrice: 350,
          currentValue: 1750,
          totalGain: 250,
          totalGainPercentage: 16.67,
        }
      ],
      totalValue: 3550,
      totalCost: 3000,
      totalGain: 550,
      totalGainPercentage: 18.33,
    };
  }

  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .orderBy("date", "asc")
      .get();

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as PortfolioTransaction[];

    const uniqueTickers = Array.from(new Set(transactions.map((tx) => tx.ticker)));

    // Fetch current prices in parallel
    const pricePromises = uniqueTickers.map(async (ticker) => {
      const data = await getStockData(ticker);
      return { ticker, price: data?.currentPrice || 0 };
    });

    const prices = await Promise.all(pricePromises);
    const priceMap = prices.reduce((acc, { ticker, price }) => {
      acc[ticker] = price;
      return acc;
    }, {} as Record<string, number>);

    return calculatePortfolioPerformance(transactions, priceMap);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return {
      items: [],
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercentage: 0,
    };
  }
}

export async function addTransaction(
  userId: string,
  transaction: Omit<PortfolioTransaction, "id">
) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return { success: true };
  }

  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .add({
        ...transaction,
        createdAt: new Date().toISOString(),
      });
    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

export async function deleteTransaction(userId: string, transactionId: string) {
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .doc(transactionId)
      .delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}
