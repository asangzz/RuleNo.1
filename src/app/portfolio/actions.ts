'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { PortfolioTransaction, PortfolioData, PortfolioItem } from '@/lib/types';
import YahooFinance from 'yahoo-finance2';
import { revalidatePath } from 'next/cache';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function getUserId() {
  const sessionCookie = (await cookies()).get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function addTransaction(transaction: Omit<PortfolioTransaction, 'id'>) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const docRef = await adminDb
    .collection('users')
    .doc(userId)
    .collection('portfolio')
    .add({
      ...transaction,
      createdAt: new Date().toISOString(),
    });

  revalidatePath('/portfolio');
  revalidatePath('/');
  return docRef.id;
}

export async function deleteTransaction(transactionId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  await adminDb
    .collection('users')
    .doc(userId)
    .collection('portfolio')
    .doc(transactionId)
    .delete();

  revalidatePath('/portfolio');
  revalidatePath('/');
}

export async function getPortfolio(): Promise<PortfolioData> {
  const userId = await getUserId();

  // If we're in a mock environment or userId is missing, return mock/empty data
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' || !userId) {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return {
        holdings: [
          {
            ticker: 'AAPL',
            shares: 10,
            averageCost: 150,
            currentPrice: 180,
            totalValue: 1800,
            gainLoss: 300,
            gainLossPercentage: 20
          }
        ],
        totalValue: 1800,
        totalGainLoss: 300,
        totalGainLossPercentage: 20
      };
    }
    return { holdings: [], totalValue: 0, totalGainLoss: 0, totalGainLossPercentage: 0 };
  }

  const snapshot = await adminDb
    .collection('users')
    .doc(userId)
    .collection('portfolio')
    .orderBy('date', 'asc')
    .get();

  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PortfolioTransaction[];

  if (transactions.length === 0) {
    return { holdings: [], totalValue: 0, totalGainLoss: 0, totalGainLossPercentage: 0 };
  }

  // Aggregate holdings
  const holdingsMap = new Map<string, { shares: number; totalCost: number }>();

  for (const tx of transactions) {
    const current = holdingsMap.get(tx.ticker) || { shares: 0, totalCost: 0 };
    if (tx.type === 'BUY') {
      holdingsMap.set(tx.ticker, {
        shares: current.shares + tx.shares,
        totalCost: current.totalCost + (tx.shares * tx.price)
      });
    } else {
      // For simplicity, we use average cost for sells
      const avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
      holdingsMap.set(tx.ticker, {
        shares: Math.max(0, current.shares - tx.shares),
        totalCost: Math.max(0, current.totalCost - (tx.shares * avgCost))
      });
    }
  }

  const tickers = Array.from(holdingsMap.keys());

  // Fetch current prices
  const pricePromises = tickers.map(async (ticker) => {
    try {
      const quote = await yahooFinance.quote(ticker);
      return { ticker, price: quote?.regularMarketPrice || 0 };
    } catch {
      return { ticker, price: 0 };
    }
  });

  const prices = await Promise.all(pricePromises);
  const priceMap = new Map(prices.map(p => [p.ticker, p.price]));

  const holdings: PortfolioItem[] = [];
  let totalValue = 0;
  let totalCost = 0;

  for (const [ticker, data] of holdingsMap.entries()) {
    if (data.shares <= 0) continue;

    const currentPrice = priceMap.get(ticker) || 0;
    const value = data.shares * currentPrice;
    const gainLoss = value - data.totalCost;
    const gainLossPercentage = data.totalCost > 0 ? (gainLoss / data.totalCost) * 100 : 0;

    holdings.push({
      ticker,
      shares: data.shares,
      averageCost: data.totalCost / data.shares,
      currentPrice,
      totalValue: value,
      gainLoss,
      gainLossPercentage
    });

    totalValue += value;
    totalCost += data.totalCost;
  }

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return {
    holdings,
    totalValue,
    totalGainLoss,
    totalGainLossPercentage
  };
}
