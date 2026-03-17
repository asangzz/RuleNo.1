/**
 * Rule No. 1 Investment Calculations
 * Based on Phil Town's investment philosophy.
 */

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

import { PortfolioTransaction, PortfolioData, PortfolioItem } from "./types";

/**
 * Calculates portfolio performance metrics from a list of transactions.
 * Uses the average cost basis method.
 *
 * @param transactions List of portfolio transactions
 * @param currentPrices Map of ticker to current price
 * @returns Portfolio performance data
 */
export function calculatePortfolioPerformance(
  transactions: PortfolioTransaction[],
  currentPrices: Record<string, { price: number; name: string }>
): PortfolioData {
  const holdings: Record<string, { shares: number; totalCost: number }> = {};

  // Sort transactions by date to ensure correct cost basis calculation
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const tx of sortedTransactions) {
    if (!holdings[tx.ticker]) {
      holdings[tx.ticker] = { shares: 0, totalCost: 0 };
    }

    if (tx.type === "BUY") {
      holdings[tx.ticker].shares += tx.shares;
      holdings[tx.ticker].totalCost += tx.shares * tx.price;
    } else if (tx.type === "SELL") {
      if (holdings[tx.ticker].shares > 0) {
        const avgCost = holdings[tx.ticker].totalCost / holdings[tx.ticker].shares;
        const sellShares = Math.min(tx.shares, holdings[tx.ticker].shares);
        holdings[tx.ticker].shares -= sellShares;
        holdings[tx.ticker].totalCost -= sellShares * avgCost;
      }
    }
  }

  const items: PortfolioItem[] = [];
  let totalValue = 0;
  let totalCostBasis = 0;

  for (const ticker in holdings) {
    const holding = holdings[ticker];
    if (holding.shares <= 0) continue;

    const currentData = currentPrices[ticker] || { price: 0, name: ticker };
    const currentPrice = currentData.price;
    const itemValue = holding.shares * currentPrice;
    const itemCost = holding.totalCost;
    const gainLoss = itemValue - itemCost;
    const gainLossPercentage = itemCost > 0 ? (gainLoss / itemCost) * 100 : 0;

    items.push({
      ticker,
      name: currentData.name,
      shares: holding.shares,
      averageCost: holding.totalCost / holding.shares,
      currentPrice,
      totalValue: itemValue,
      gainLoss,
      gainLossPercentage,
    });

    totalValue += itemValue;
    totalCostBasis += itemCost;
  }

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercentage =
    totalCostBasis > 0 && isFinite(totalGainLoss / totalCostBasis)
      ? (totalGainLoss / totalCostBasis) * 100
      : 0;

  return {
    items,
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercentage,
  };
}
