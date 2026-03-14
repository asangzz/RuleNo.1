/**
 * Rule No. 1 Investment Calculations
 * Based on Phil Town's investment philosophy.
 */

import { PortfolioTransaction, PortfolioData, PortfolioItem, WatchlistItem } from "./types";

export interface RuleOneMetrics {
  ticker: string;
  currentPrice: number;
  eps: number;
  growthRate: number; // as a decimal, e.g., 0.15 for 15%
  peRatio: number; // Estimated future PE
  stickerPrice: number;
  mosPrice: number;
  isWonderful: boolean;
}

/**
 * Calculates the Sticker Price of a stock.
 * Formula: (Future EPS * Future PE) / 4
 * The divisor 4 comes from the goal of a 15% annual return (1.15^10 ≈ 4).
 *
 * @param currentEPS Current Earnings Per Share
 * @param growthRate Estimated annual growth rate for the next 10 years (decimal)
 * @param futurePE Estimated Price-to-Earnings ratio in 10 years
 * @returns The Sticker Price (fair value)
 */
export function calculateStickerPrice(
  currentEPS: number,
  growthRate: number,
  futurePE: number
): number {
  const futureEPS = currentEPS * Math.pow(1 + growthRate, 10);
  const futurePrice = futureEPS * futurePE;
  return futurePrice / 4;
}

/**
 * Calculates the Margin of Safety (MOS) Price.
 * Rule No. 1: Buy at 50% of the Sticker Price by default.
 *
 * @param stickerPrice The calculated fair value of the stock
 * @param mosPercentage The Margin of Safety percentage (default: 50)
 * @returns The MOS Price
 */
export function calculateMOSPrice(stickerPrice: number, mosPercentage: number = 50): number {
  return stickerPrice * (1 - mosPercentage / 100);
}

/**
 * Estimates the future PE ratio.
 * Rule No. 1: Generally 2x the growth rate or historical high PE, whichever is lower.
 *
 * @param growthRate Estimated annual growth rate (decimal)
 * @param historicalHighPE Optional historical high PE ratio
 * @returns Estimated future PE
 */
export function estimateFuturePE(growthRate: number, historicalHighPE?: number): number {
  const growthBasedPE = growthRate * 100 * 2;
  if (historicalHighPE) {
    return Math.min(growthBasedPE, historicalHighPE);
  }
  return growthBasedPE;
}

export const PAYBACK_TIME_LIMIT = 20;

export interface PaybackTimeResult {
  years: number;
  breakdown: { year: number; eps: number; accumulated: number }[];
}

/**
 * Calculates Payback Time (in years).
 * How long it takes for the company's earnings to equal the current stock price.
 *
 * @param currentPrice Current stock price
 * @param currentEPS Current Earnings Per Share
 * @param growthRate Estimated annual growth rate (decimal)
 * @returns Payback Time result with years and breakdown
 */
export function calculatePaybackTime(
  currentPrice: number,
  currentEPS: number,
  growthRate: number
): PaybackTimeResult {
  const breakdown = [];
  let accumulatedEarnings = 0;
  let yearlyEPS = currentEPS;
  let years = 0;

  while (accumulatedEarnings < currentPrice && years < PAYBACK_TIME_LIMIT) {
    years++;
    yearlyEPS *= (1 + growthRate);
    accumulatedEarnings += yearlyEPS;
    breakdown.push({
      year: years,
      eps: yearlyEPS,
      accumulated: accumulatedEarnings
    });
  }

  return {
    years: accumulatedEarnings >= currentPrice ? years : PAYBACK_TIME_LIMIT + 1,
    breakdown
  };
}

/**
 * Helper to determine if a business is "Wonderful" based on Rule No. 1 criteria.
 * This is a simplified version; real analysis involves Moat and Management.
 */
export function analyzeWonderfulBusiness(
  currentPrice: number,
  mosPrice: number,
  hasMoat: boolean,
  hasManagement: boolean
): boolean {
  return currentPrice <= mosPrice && hasMoat && hasManagement;
}

/**
 * Calculates portfolio performance based on transactions and current prices.
 */
export function calculatePortfolioPerformance(
  transactions: PortfolioTransaction[],
  currentPrices: Record<string, { currentPrice: number; name: string }>,
  watchlist: Record<string, WatchlistItem>,
  targetMOS: number = 50
): PortfolioData {
  const holdings: Record<string, { shares: number; totalCost: number }> = {};

  // Group by ticker and calculate average cost
  transactions.forEach((t) => {
    if (!holdings[t.ticker]) {
      holdings[t.ticker] = { shares: 0, totalCost: 0 };
    }
    if (t.type === 'BUY') {
      holdings[t.ticker].shares += t.shares;
      holdings[t.ticker].totalCost += t.shares * t.price;
    } else {
      const avgCost = holdings[t.ticker].totalCost / holdings[t.ticker].shares;
      holdings[t.ticker].shares -= t.shares;
      holdings[t.ticker].totalCost -= t.shares * avgCost;
    }
  });

  const items: PortfolioItem[] = Object.entries(holdings)
    .filter(([_, data]) => data.shares > 0)
    .map(([ticker, data]) => {
      const currentData = currentPrices[ticker];
      const watchlistItem = watchlist[ticker];
      const currentPrice = currentData?.currentPrice || 0;

      let stickerPrice: number | undefined;
      let mosPrice: number | undefined;

      if (watchlistItem) {
        const futurePE = estimateFuturePE(watchlistItem.growthRate, watchlistItem.historicalHighPE);
        stickerPrice = calculateStickerPrice(watchlistItem.eps, watchlistItem.growthRate, futurePE);
        mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
      }

      const totalValue = data.shares * currentPrice;
      const totalGain = totalValue - data.totalCost;
      const totalGainPercentage = data.totalCost > 0 ? (totalGain / data.totalCost) * 100 : 0;

      return {
        ticker,
        name: currentData?.name || ticker,
        shares: data.shares,
        averageCost: data.totalCost / data.shares,
        currentPrice,
        totalValue,
        totalGain,
        totalGainPercentage,
        stickerPrice,
        mosPrice
      };
    });

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCost = Object.values(holdings).reduce((sum, data) => sum + (data.shares > 0 ? data.totalCost : 0), 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    items: items.sort((a, b) => b.totalValue - a.totalValue),
    totalValue,
    totalGain,
    totalGainPercentage
  };
}
