"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { PortfolioTransaction, PortfolioData, PortfolioItem } from "@/lib/types";
import { getStockData } from "@/lib/stock-service";

async function getUserId() {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return "mock-user-123";
  }

  const sessionCookie = (await cookies()).get("__session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function getPortfolio(): Promise<{ success: boolean; data?: PortfolioData; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  // Return mock data for development if no real firebase
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return {
      success: true,
      data: {
        items: [
          {
            ticker: "AAPL",
            shares: 10,
            averageCost: 150,
            currentPrice: 180,
            marketValue: 1800,
            gain: 300,
            gainPercentage: 20
          },
          {
            ticker: "MSFT",
            shares: 5,
            averageCost: 300,
            currentPrice: 400,
            marketValue: 2000,
            gain: 500,
            gainPercentage: 25
          }
        ],
        totalValue: 3800,
        totalCost: 3000,
        totalGain: 800,
        totalGainPercentage: 26.67
      }
    };
  }

  try {
    const transactionsSnapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .orderBy("date", "asc")
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    if (transactions.length === 0) {
      return {
        success: true,
        data: { items: [], totalValue: 0, totalCost: 0, totalGain: 0, totalGainPercentage: 0 }
      };
    }

    // Group by ticker
    const holdings: Record<string, { shares: number; totalCost: number }> = {};
    transactions.forEach(tx => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { shares: 0, totalCost: 0 };
      }

      if (tx.type === 'BUY') {
        holdings[tx.ticker].shares += tx.shares;
        holdings[tx.ticker].totalCost += tx.shares * tx.price;
      } else {
        if (holdings[tx.ticker].shares > 0) {
          const avgCost = holdings[tx.ticker].totalCost / holdings[tx.ticker].shares;
          holdings[tx.ticker].shares -= tx.shares;
          holdings[tx.ticker].totalCost -= tx.shares * avgCost;
        } else {
          holdings[tx.ticker].shares -= tx.shares;
          // If selling with no shares, we don't adjust cost basis since it's already 0
        }
      }
    });

    const tickers = Object.keys(holdings).filter(t => holdings[t].shares > 0);
    const stockDataPromises = tickers.map(ticker => getStockData(ticker));
    const stockDatas = await Promise.all(stockDataPromises);

    const items: PortfolioItem[] = [];
    let totalValue = 0;
    let totalCost = 0;

    tickers.forEach((ticker, index) => {
      const stock = stockDatas[index];
      const holding = holdings[ticker];
      const currentPrice = stock?.currentPrice || 0;
      const marketValue = holding.shares * currentPrice;
      const avgCost = holding.shares > 0 ? holding.totalCost / holding.shares : 0;
      const gain = marketValue - holding.totalCost;
      const gainPercentage = holding.totalCost > 0 ? (gain / holding.totalCost) * 100 : 0;

      items.push({
        ticker,
        shares: holding.shares,
        averageCost: avgCost,
        currentPrice,
        marketValue,
        gain,
        gainPercentage
      });

      totalValue += marketValue;
      totalCost += holding.totalCost;
    });

    const totalGain = totalValue - totalCost;
    const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return {
      success: true,
      data: {
        items,
        totalValue,
        totalCost,
        totalGain,
        totalGainPercentage
      }
    };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio data" };
  }
}

export async function addTransaction(transaction: Omit<PortfolioTransaction, 'id'>) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .add(transaction);
    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

export async function deleteTransaction(transactionId: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await adminDb
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
