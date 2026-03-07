"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { getStockData } from "@/lib/stock-service";
import { PortfolioItem, PortfolioData } from "@/lib/types";
import { cookies } from "next/headers";

async function getAuthenticatedUser() {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return { uid: "mock-user-123", email: "test@example.com" };
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export async function getPortfolioItems() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const portfolioRef = adminDb.collection("users").doc(user.uid).collection("portfolio");
    const snapshot = await portfolioRef.get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioItem[];

    if (items.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch real-time prices for all unique tickers
    const uniqueTickers = [...new Set(items.map(item => item.ticker))];
    const pricePromises = uniqueTickers.map(ticker => getStockData(ticker));
    const prices = await Promise.all(pricePromises);

    const priceMap = uniqueTickers.reduce((acc, ticker, index) => {
      const data = prices[index];
      acc[ticker] = data ? data.currentPrice : 0;
      return acc;
    }, {} as Record<string, number>);

    // Enrich portfolio items with performance metrics
    const portfolioData: PortfolioData[] = items.map(item => {
      const currentPrice = priceMap[item.ticker] || 0;
      const marketValue = currentPrice * item.shares;
      const costBasis = item.averageCost * item.shares;
      const gainLoss = marketValue - costBasis;
      const gainLossPercentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        ...item,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercentage
      };
    });

    return { success: true, data: portfolioData };
  } catch (error) {
    console.error("Error in getPortfolioItems action:", error);
    return { success: false, error: "Failed to fetch portfolio items" };
  }
}

export async function addPortfolioItem(item: Omit<PortfolioItem, "id">) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const portfolioRef = adminDb.collection("users").doc(user.uid).collection("portfolio");
    const docRef = await portfolioRef.add({
      ...item,
      ticker: item.ticker.toUpperCase()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error in addPortfolioItem action:", error);
    return { success: false, error: "Failed to add portfolio item" };
  }
}

export async function removePortfolioItem(itemId: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!itemId) {
    return { success: false, error: "Item ID is required" };
  }

  try {
    await adminDb.collection("users").doc(user.uid).collection("portfolio").doc(itemId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error in removePortfolioItem action:", error);
    return { success: false, error: "Failed to remove portfolio item" };
  }
}
