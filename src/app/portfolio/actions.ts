"use server";

import { adminDb } from "@/lib/firebase-admin";
import { PortfolioTransaction } from "@/lib/types";
import { getStockData } from "@/lib/stock-service";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

// Helper to get userId from session cookie
async function getUserId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        return "mock-user-123";
    }
    throw new Error("Unauthorized");
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error) {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        return "mock-user-123";
    }
    throw new Error("Unauthorized");
  }
}

export async function getPortfolio() {
  let userId: string;
  try {
    userId = await getUserId();
  } catch (e) {
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
        return { success: true, transactions: [], prices: {} };
    }

    const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
    const prices: Record<string, { currentPrice: number; name: string }> = {};

    await Promise.all(uniqueTickers.map(async (ticker) => {
      const data = await getStockData(ticker);
      if (data) {
        prices[ticker] = {
          currentPrice: data.currentPrice,
          name: data.name
        };
      }
    }));

    return { success: true, transactions, prices };
  } catch (error) {
    console.error("Error getting portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio" };
  }
}

export async function addTransaction(transaction: Omit<PortfolioTransaction, "id">) {
  let userId: string;
  try {
    userId = await getUserId();
  } catch (e) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const docRef = await adminDb.collection("users").doc(userId).collection("portfolio").add(transaction);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
}

export async function deleteTransaction(transactionId: string) {
  let userId: string;
  try {
    userId = await getUserId();
  } catch (e) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await adminDb.collection("users").doc(userId).collection("portfolio").doc(transactionId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}
