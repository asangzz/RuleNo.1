"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { getStockData } from "@/lib/stock-service";
import { PortfolioTransaction, PortfolioItem, PortfolioData } from "@/lib/types";
import { cookies } from "next/headers";

async function getUserId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying session cookie:", error);
    return null;
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

export async function getPortfolio() {
  const userId = await getUserId();
  if (!userId && process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true') return { success: false, error: "Unauthorized" };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return {
      success: true,
      data: {
        items: [
          {
            ticker: "AAPL",
            name: "Apple Inc.",
            totalShares: 10,
            averageCost: 150,
            currentPrice: 180,
            totalValue: 1800,
            totalGainLoss: 300,
            totalGainLossPercentage: 20
          }
        ],
        totalValue: 1800,
        totalCost: 1500,
        totalGainLoss: 300,
        totalGainLossPercentage: 20
      } as PortfolioData
    };
  }

  try {
    const snapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .orderBy("date", "asc")
      .get();

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PortfolioTransaction[];

    if (transactions.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0,
        } as PortfolioData,
      };
    }

    // Aggregate holdings
    const holdings: Record<string, { totalShares: number; totalCost: number }> = {};
    const tickers = new Set<string>();

    transactions.forEach((tx) => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { totalShares: 0, totalCost: 0 };
        tickers.add(tx.ticker);
      }

      if (tx.type === "BUY") {
        holdings[tx.ticker].totalShares += tx.shares;
        holdings[tx.ticker].totalCost += tx.shares * tx.price;
      } else {
        // Simple average cost for SELL
        const avgCost = holdings[tx.ticker].totalCost / holdings[tx.ticker].totalShares;
        holdings[tx.ticker].totalShares -= tx.shares;
        holdings[tx.ticker].totalCost -= tx.shares * avgCost;
      }
    });

    // Fetch current prices
    const tickerList = Array.from(tickers);
    const pricePromises = tickerList.map((ticker) => getStockData(ticker));
    const stockDatas = await Promise.all(pricePromises);
    const priceMap: Record<string, { price: number; name: string }> = {};

    stockDatas.forEach((data) => {
      if (data) {
        priceMap[data.ticker] = { price: data.currentPrice, name: data.name };
      }
    });

    const items: PortfolioItem[] = [];
    let totalValue = 0;
    let totalCost = 0;

    for (const ticker in holdings) {
      const { totalShares, totalCost: itemTotalCost } = holdings[ticker];
      if (totalShares <= 0) continue;

      const currentPrice = priceMap[ticker]?.price || 0;
      const name = priceMap[ticker]?.name || ticker;
      const itemTotalValue = totalShares * currentPrice;
      const itemTotalGainLoss = itemTotalValue - itemTotalCost;
      const itemTotalGainLossPercentage = itemTotalCost > 0 ? (itemTotalGainLoss / itemTotalCost) * 100 : 0;

      items.push({
        ticker,
        name,
        totalShares,
        averageCost: itemTotalCost / totalShares,
        currentPrice,
        totalValue: itemTotalValue,
        totalGainLoss: itemTotalGainLoss,
        totalGainLossPercentage: itemTotalGainLossPercentage,
      });

      totalValue += itemTotalValue;
      totalCost += itemTotalCost;
    }

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      success: true,
      data: {
        items,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercentage,
      } as PortfolioData,
    };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio" };
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
