"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio } from "./actions";
import { PortfolioData, PortfolioItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPortfolio();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load portfolio");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user || process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, loadData]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-500 font-medium">{error}</p>
        <button onClick={loadData} className="mt-4 text-sm font-bold text-accent hover:underline uppercase">Retry</button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Track your simulations and real holdings.</p>
        </header>
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">Your portfolio is currently empty. Start by buying a &quot;Wonderful Business&quot; from your watchlist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
        <p className="text-muted-foreground">Simulated holdings based on Rule No. 1 principles.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
          <p className="text-3xl font-bold mt-2">${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cost Basis</h3>
          <p className="text-3xl font-bold mt-2">${data.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Gain/Loss</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={cn("text-3xl font-bold", data.totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
              {data.totalGainLoss >= 0 ? "+" : ""}${Math.abs(data.totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total ROI</h3>
          <p className={cn("text-3xl font-bold mt-2", data.totalGainLossPercentage >= 0 ? "text-green-500" : "text-red-500")}>
            {data.totalGainLossPercentage >= 0 ? "+" : ""}{data.totalGainLossPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Ticker</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Shares</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Avg Cost</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Current Price</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Market Value</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest text-right">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <PortfolioRow key={item.ticker} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PortfolioRow({ item }: { item: PortfolioItem }) {
  const isPositive = item.gainLoss >= 0;

  return (
    <tr className="border-b border-border hover:bg-muted/10 transition-colors group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-background border border-border rounded flex items-center justify-center font-bold text-xs text-accent">
            {item.ticker}
          </div>
          <div>
            <p className="font-bold text-sm">{item.name}</p>
          </div>
        </div>
      </td>
      <td className="p-4 text-sm font-medium">{item.shares}</td>
      <td className="p-4 text-sm font-medium">${item.averageCost.toFixed(2)}</td>
      <td className="p-4 text-sm font-medium">${item.currentPrice.toFixed(2)}</td>
      <td className="p-4 text-sm font-bold">${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="p-4 text-right">
        <div className={cn("inline-flex flex-col items-end", isPositive ? "text-green-500" : "text-red-500")}>
          <span className="text-sm font-bold">{isPositive ? "+" : ""}{item.gainLossPercentage.toFixed(2)}%</span>
          <span className="text-xs opacity-80">{isPositive ? "+" : "-"}${Math.abs(item.gainLoss).toFixed(2)}</span>
        </div>
      </td>
    </tr>
  );
}
