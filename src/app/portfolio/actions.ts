"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getStockData } from "@/lib/stock-service";
import { PortfolioTransaction, PortfolioItem, PortfolioData } from "@/lib/types";

export async function addTransaction(userId: string, transaction: Omit<PortfolioTransaction, 'id'>) {
  try {
    const res = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .add({
        ...transaction,
        createdAt: new Date().toISOString()
      });
    return { success: true, id: res.id };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

export async function getPortfolio(userId: string): Promise<{ success: boolean; data?: PortfolioData; error?: string }> {
  try {
    const snapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    // Sort by date to ensure cost basis is calculated correctly
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (transactions.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          totalCost: 0,
          totalMarketValue: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0
        }
      };
    }

    // Aggregate transactions by ticker
    const aggregated: Record<string, { shares: number; totalCost: number }> = {};

    transactions.forEach(t => {
      if (!aggregated[t.ticker]) {
        aggregated[t.ticker] = { shares: 0, totalCost: 0 };
      }

      if (t.type === 'buy') {
        aggregated[t.ticker].shares += t.shares;
        aggregated[t.ticker].totalCost += t.shares * t.price;
      } else {
        aggregated[t.ticker].shares -= t.shares;
        // For selling, we usually reduce cost proportionally to maintain average price,
        // but for simplicity here we just reduce shares.
        // A more complex model would track lots.
        const avgPrice = aggregated[t.ticker].totalCost / (aggregated[t.ticker].shares + t.shares);
        aggregated[t.ticker].totalCost -= t.shares * avgPrice;
      }
    });

    const tickers = Object.keys(aggregated).filter(ticker => aggregated[ticker].shares > 0);

    // Fetch current prices in parallel
    const pricePromises = tickers.map(ticker => getStockData(ticker));
    const prices = await Promise.all(pricePromises);

    const items: PortfolioItem[] = tickers.map((ticker, index) => {
      const agg = aggregated[ticker];
      const stockData = prices[index];
      const currentPrice = stockData?.currentPrice || 0;
      const marketValue = agg.shares * currentPrice;
      const gainLoss = marketValue - agg.totalCost;
      const gainLossPercentage = agg.totalCost > 0 ? (gainLoss / agg.totalCost) * 100 : 0;

      return {
        ticker,
        shares: agg.shares,
        averagePrice: agg.totalCost / agg.shares,
        totalCost: agg.totalCost,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercentage
      };
    });

    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const totalMarketValue = items.reduce((sum, item) => sum + item.marketValue, 0);
    const totalGainLoss = totalMarketValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      success: true,
      data: {
        items,
        totalCost,
        totalMarketValue,
        totalGainLoss,
        totalGainLossPercentage
      }
    };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio data" };
  }
}

export async function deleteTransaction(userId: string, transactionId: string) {
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
