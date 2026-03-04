"use server";

import { adminDb } from "@/lib/firebase-admin";
import { PortfolioItem } from "@/lib/types";

// In a real app, we would verify the session token from cookies
// For this simulation, we'll assume the userId is passed but we'll use firebase-admin
// to ensure the backend operations are isolated from the client-side Firebase SDK constraints.

export async function addPortfolioItem(userId: string, item: Omit<PortfolioItem, "id">) {
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const docRef = await adminDb.collection("users").doc(userId).collection("portfolio").add({
      ...item,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding portfolio item:", error);
    return { success: false, error: "Failed to add portfolio item" };
  }
}

export async function removePortfolioItem(userId: string, itemId: string) {
  if (!userId || !itemId) return { success: false, error: "Unauthorized or missing ID" };

  try {
    await adminDb.collection("users").doc(userId).collection("portfolio").doc(itemId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error removing portfolio item:", error);
    return { success: false, error: "Failed to remove portfolio item" };
  }
}

export async function fetchPortfolio(userId: string) {
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("portfolio")
      .orderBy("createdAt", "desc")
      .get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioItem[];
    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return { success: false, error: "Failed to fetch portfolio" };
  }
}
