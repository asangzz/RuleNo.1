"use server";

import * as admin from 'firebase-admin';
import { getStockData } from '@/lib/stock-service';
import {
  PortfolioTransaction,
  PortfolioData,
  PortfolioItem,
  WatchlistItem
} from '@/lib/types';
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from '@/lib/rule-one';
import { cookies } from 'next/headers';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

async function getAuthenticatedUserId() {
  // In a real Firebase app, we'd verify the ID token from cookies
  // For this implementation, we'll try to get it from a session cookie
  // Since we have a mock auth environment, we'll allow a fallback if NEXT_PUBLIC_MOCK_AUTH is true

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return "mock-user-123";
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    throw new Error('Unauthorized');
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    throw new Error('Unauthorized');
  }
}

export async function addTransaction(transaction: PortfolioTransaction) {
  try {
    const userId = await getAuthenticatedUserId();
    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('portfolio')
      .add({
        ...transaction,
        createdAt: new Date().toISOString(),
      });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding transaction:', error);
    return { success: false, error: 'Failed to add transaction' };
  }
}

export async function getPortfolio(): Promise<PortfolioData> {
  try {
    const userId = await getAuthenticatedUserId();
    const transactionsSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('portfolio')
      .orderBy('date', 'asc')
      .get();

    const transactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PortfolioTransaction[];

    // Fetch user settings for MOS
    const settingsSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('profile')
      .get();

    const targetMOS = settingsSnap.exists ? settingsSnap.data()?.targetMOS : 50;

    // Fetch watchlist to get growth rate and high PE for Rule No. 1 calcs
    const watchlistSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('watchlist')
      .get();

    const watchlistItems: Record<string, WatchlistItem> = {};
    watchlistSnap.docs.forEach(doc => {
      const data = doc.data();
      watchlistItems[data.ticker] = data as WatchlistItem;
    });

    const holdings: Record<string, { shares: number; totalCost: number }> = {};

    transactions.forEach(t => {
      if (!holdings[t.ticker]) {
        holdings[t.ticker] = { shares: 0, totalCost: 0 };
      }

      if (t.type === 'BUY') {
        holdings[t.ticker].shares += t.shares;
        holdings[t.ticker].totalCost += t.shares * t.price;
      } else {
        if (holdings[t.ticker].shares > 0) {
          const ratio = Math.min(1, t.shares / holdings[t.ticker].shares);
          holdings[t.ticker].totalCost -= holdings[t.ticker].totalCost * ratio;
          holdings[t.ticker].shares -= t.shares;
        }
      }
    });

    const tickers = Object.keys(holdings).filter(ticker => holdings[ticker].shares > 0);

    // Fetch current prices for all held tickers
    const stockDataResults = await Promise.all(
      tickers.map(ticker => getStockData(ticker))
    );

    const items: PortfolioItem[] = tickers.map((ticker, index) => {
      const stock = stockDataResults[index];
      const holding = holdings[ticker];
      const currentPrice = stock?.currentPrice || 0;
      const totalValue = holding.shares * currentPrice;
      const totalGainLoss = totalValue - holding.totalCost;
      const gainLossPercentage = holding.totalCost > 0 ? (totalGainLoss / holding.totalCost) * 100 : 0;

      let stickerPrice, mosPrice;
      const watchItem = watchlistItems[ticker];
      if (watchItem) {
        const futurePE = estimateFuturePE(watchItem.growthRate, watchItem.historicalHighPE);
        stickerPrice = calculateStickerPrice(watchItem.eps, watchItem.growthRate, futurePE);
        mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
      }

      return {
        ticker,
        name: stock?.name || ticker,
        shares: holding.shares,
        averageCost: holding.shares > 0 ? holding.totalCost / holding.shares : 0,
        currentPrice,
        totalValue,
        totalGainLoss,
        gainLossPercentage,
        stickerPrice,
        mosPrice
      };
    });

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const totalCostBasis = items.reduce((sum, item) => sum + (holdings[item.ticker]?.totalCost || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const gainLossPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return {
      items,
      totalValue,
      totalCostBasis,
      totalGainLoss,
      gainLossPercentage
    };
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return {
      items: [],
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      gainLossPercentage: 0
    };
  }
}
