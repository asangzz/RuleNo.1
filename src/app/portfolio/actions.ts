"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getUserId } from "@/lib/auth-utils";
import { PortfolioTransaction, PortfolioItem, PortfolioData } from "@/lib/types";
import { getStockData } from "@/lib/stock-service";
import { revalidatePath } from "next/cache";

export async function addTransaction(transaction: Omit<PortfolioTransaction, "id">) {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const portfolioRef = adminDb.collection("users").doc(userId).collection("portfolio");
    await portfolioRef.add({
      ...transaction,
      date: new Date().toISOString(),
    });

    revalidatePath("/portfolio");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

export async function getPortfolio(): Promise<{ success: boolean; data?: PortfolioData; error?: string }> {
  const userId = await getUserId();

  // Provide mock data if mock auth is enabled and we're missing Firebase credentials
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  const hasFirebaseCreds = !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_CLIENT_EMAIL;

  if (isMockMode && !hasFirebaseCreds) {
    return {
      success: true,
      data: {
        items: [
          {
            ticker: "AAPL",
            name: "Apple Inc.",
            shares: 10,
            averageCost: 150,
            currentPrice: 180,
            totalValue: 1800,
            gainLoss: 300,
            gainLossPercentage: 20
          },
          {
            ticker: "MSFT",
            name: "Microsoft Corp.",
            shares: 5,
            averageCost: 300,
            currentPrice: 420,
            totalValue: 2100,
            gainLoss: 600,
            gainLossPercentage: 40
          }
        ],
        totalValue: 3900,
        totalCostBasis: 3000,
        totalGainLoss: 900,
        totalGainLossPercentage: 30
      }
    };
  }

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const portfolioRef = adminDb.collection("users").doc(userId).collection("portfolio");
    const snapshot = await portfolioRef.orderBy("date", "asc").get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    if (transactions.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0
        }
      };
    }

    // Aggregate holdings
    const holdings: Record<string, { shares: number; totalCost: number }> = {};
    for (const tx of transactions) {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { shares: 0, totalCost: 0 };
      }

      if (tx.type === "BUY") {
        holdings[tx.ticker].shares += tx.shares;
        holdings[tx.ticker].totalCost += tx.shares * tx.price;
      } else {
        // Average cost basis for selling
        const avgCost = holdings[tx.ticker].totalCost / holdings[tx.ticker].shares;
        holdings[tx.ticker].shares -= tx.shares;
        holdings[tx.ticker].totalCost -= tx.shares * avgCost;
      }
    }

    const items: PortfolioItem[] = [];
    let totalValue = 0;
    let totalCostBasis = 0;

    const tickers = Object.keys(holdings).filter(t => holdings[t].shares > 0);

    // Fetch current prices in parallel
    const pricePromises = tickers.map(ticker => getStockData(ticker));
    const priceResults = await Promise.all(pricePromises);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const stockData = priceResults[i];
      const holding = holdings[ticker];

      const currentPrice = stockData?.currentPrice || 0;
      const itemValue = holding.shares * currentPrice;
      const itemCost = holding.totalCost;
      const gainLoss = itemValue - itemCost;
      const gainLossPercentage = itemCost > 0 ? (gainLoss / itemCost) * 100 : 0;

      items.push({
        ticker,
        name: stockData?.name || ticker,
        shares: holding.shares,
        averageCost: holding.totalCost / holding.shares,
        currentPrice,
        totalValue: itemValue,
        gainLoss,
        gainLossPercentage
      });

      totalValue += itemValue;
      totalCostBasis += itemCost;
    }

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return {
      success: true,
      data: {
        items,
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercentage
      }
    };
  } catch (error) {
    console.error("Error getting portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio" };
  }
}
