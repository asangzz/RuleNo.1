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

export const DEFAULT_MOS_PERCENTAGE = 50;

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
 * Rule No. 1: Buy at a discount (default 50%) of the Sticker Price.
 *
 * @param stickerPrice The calculated fair value of the stock
 * @param mosPercentage The desired margin of safety percentage (default 50)
 * @returns The MOS Price
 */
export function calculateMOSPrice(stickerPrice: number, mosPercentage: number = DEFAULT_MOS_PERCENTAGE): number {
  return stickerPrice * (mosPercentage / 100);
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
