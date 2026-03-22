"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { PortfolioData, TransactionType } from "@/lib/types";
import { getPortfolio, addTransaction } from "./actions";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    ticker: "",
    type: "BUY" as TransactionType,
    shares: "",
    price: "",
    date: new Date().toISOString().split("T")[0]
  });

  const loadData = useCallback(async () => {
    if (!user && process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true') {
      setLoading(false);
      return;
    }
    try {
      const portfolioData = await getPortfolio();
      setData(portfolioData);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addTransaction({
        ticker: formData.ticker.toUpperCase(),
        type: formData.type,
        shares: parseFloat(formData.shares),
        price: parseFloat(formData.price),
        date: formData.date
      });
      setIsAdding(false);
      setFormData({
        ticker: "",
        type: "BUY",
        shares: "",
        price: "",
        date: new Date().toISOString().split("T")[0]
      });
      loadData();
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Simulator</h2>
          <p className="text-muted-foreground">Track your simulated holdings and performance.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {isAdding ? "CANCEL" : "ADD TRANSACTION"}
        </button>
      </header>

      {isAdding && (
        <div className="p-6 bg-card border border-border rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold mb-4">New Transaction</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label htmlFor="ticker" className="text-xs font-bold uppercase text-muted-foreground">Ticker</label>
              <input
                id="ticker"
                type="text"
                placeholder="AAPL"
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="type" className="text-xs font-bold uppercase text-muted-foreground">Type</label>
              <select
                id="type"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="shares" className="text-xs font-bold uppercase text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                step="any"
                placeholder="10"
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price" className="text-xs font-bold uppercase text-muted-foreground">Price</label>
              <input
                id="price"
                type="number"
                step="0.01"
                placeholder="150.00"
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-foreground text-background font-bold py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                SAVE
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
          <p className="text-4xl font-bold mt-2">${data?.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={cn(
              "text-4xl font-bold",
              (data?.totalGainLoss || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(data?.totalGainLoss || 0) >= 0 ? "+" : ""}${Math.abs(data?.totalGainLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={cn(
              "text-sm font-medium",
              (data?.totalGainLossPercentage || 0) >= 0 ? "text-green-500/80" : "text-red-500/80"
            )}>
              ({(data?.totalGainLossPercentage || 0).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Positions</h3>
          <p className="text-4xl font-bold mt-2">{data?.holdings.length || 0}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Ticker</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Shares</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Avg Cost</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Current Price</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Value</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.holdings.map((holding) => (
                <tr key={holding.ticker} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{holding.ticker}</td>
                  <td className="px-6 py-4 text-right text-sm">{holding.shares.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm">${holding.averageCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm">${holding.currentPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold">${holding.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={cn(
                    "px-6 py-4 text-right text-sm font-medium",
                    holding.gainLoss >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {holding.gainLoss >= 0 ? "+" : ""}{holding.gainLoss.toFixed(2)} ({holding.gainLossPercentage.toFixed(2)}%)
                  </td>
                </tr>
              ))}
              {(!data?.holdings || data.holdings.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                    No holdings found. Add a transaction to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
