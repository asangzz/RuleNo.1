"use server";

import { adminDb } from "@/lib/firebase-admin";
import { PortfolioTransaction } from "@/lib/types";
import { getStockData } from "@/lib/stock-service";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

async function getUserId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session");

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return "mock-user-123";
  }

  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function getPortfolio() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const transactionsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .orderBy("date", "desc")
      .get();

    const transactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    // Fetch current prices for all unique tickers
    const uniqueTickers = [...new Set(transactions.map(t => t.ticker))];
    const pricePromises = uniqueTickers.map(ticker => getStockData(ticker));
    const prices = await Promise.all(pricePromises);

    const priceMap: Record<string, number> = {};
    prices.forEach(data => {
      if (data) {
        priceMap[data.ticker] = data.currentPrice;
      }
    });

    return { success: true, data: { transactions, priceMap } };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio" };
  }
}

export async function addTransaction(transaction: Omit<PortfolioTransaction, 'id'>) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const docRef = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .add(transaction);

    return { success: true, id: docRef.id };
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
