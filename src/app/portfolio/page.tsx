"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio, addTransaction } from "./actions";
import { PortfolioData, WatchlistItem, UserSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({});
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });

  const [formData, setFormData] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
    shares: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        const portfolioRes = await getPortfolio();
        if (portfolioRes.success && portfolioRes.data) {
          setPortfolio(portfolioRes.data);
        }
        setLoading(false);
        return;
      }

      const [portfolioRes, settingsSnap, watchlistSnap] = await Promise.all([
        getPortfolio(),
        getDoc(doc(db, "users", user.uid, "settings", "profile")),
        getDocs(query(collection(db, "users", user.uid, "watchlist")))
      ]);

      if (portfolioRes.success && portfolioRes.data) {
        setPortfolio(portfolioRes.data);
      }

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      const watchlistData: Record<string, WatchlistItem> = {};
      watchlistSnap.docs.forEach(doc => {
        const data = doc.data() as WatchlistItem;
        watchlistData[data.ticker] = data;
      });
      setWatchlist(watchlistData);

    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await addTransaction({
        ...formData,
        ticker: formData.ticker.toUpperCase()
      });
      if (res.success) {
        setIsAdding(false);
        setFormData({
          ticker: "",
          type: "BUY",
          shares: 0,
          price: 0,
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulate and track your Rule No. 1 investments.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Transaction"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAddTransaction} className="p-6 bg-card border border-border rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({...formData, ticker: e.target.value})}
                placeholder="AAPL"
                className="w-full mt-1 bg-background border border-border rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as "BUY" | "SELL"})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                type="number"
                step="0.001"
                value={formData.shares}
                onChange={(e) => setFormData({...formData, shares: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Record Transaction
          </button>
        </form>
      )}

      {portfolio && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
            <p className="text-3xl font-bold mt-2">${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={cn("text-3xl font-bold", portfolio.totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                {portfolio.totalGainLoss >= 0 ? "+" : ""}${Math.abs(portfolio.totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className={cn("text-sm font-medium", portfolio.totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                ({portfolio.totalGainLossPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cost Basis</h3>
            <p className="text-3xl font-bold mt-2">${portfolio.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Holdings</h3>
            <p className="text-3xl font-bold mt-2">{portfolio.items.length}</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ticker</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Shares</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Avg Cost</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Price</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Value</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Gain/Loss</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Rule No. 1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolio?.items.map((item) => {
                const watchlistItem = watchlist[item.ticker];
                let signals = "No Data";
                let signalColor = "text-muted-foreground";

                if (watchlistItem) {
                  const futurePE = estimateFuturePE(watchlistItem.growthRate, watchlistItem.historicalHighPE);
                  const stickerPrice = calculateStickerPrice(watchlistItem.eps, watchlistItem.growthRate, futurePE);
                  const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);

                  if (item.currentPrice <= mosPrice) {
                    signals = "Strong Buy";
                    signalColor = "text-green-500";
                  } else if (item.currentPrice >= stickerPrice) {
                    signals = "Overpriced";
                    signalColor = "text-red-500";
                  } else {
                    signals = "Hold";
                    signalColor = "text-accent";
                  }
                }

                return (
                  <tr key={item.ticker} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold">{item.ticker}</p>
                        <p className="text-xs text-muted-foreground">{item.name}</p>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{item.totalShares}</td>
                    <td className="p-4 font-medium">${item.averageCost.toFixed(2)}</td>
                    <td className="p-4 font-medium">${item.currentPrice.toFixed(2)}</td>
                    <td className="p-4 font-bold">${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4">
                      <div className={cn("font-bold", item.totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        {item.totalGainLoss >= 0 ? "+" : ""}{item.totalGainLoss.toFixed(2)}
                      </div>
                      <div className={cn("text-xs font-medium", item.totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        {item.totalGainLossPercentage.toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("text-xs font-bold uppercase", signalColor)}>
                        {signals}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!portfolio || portfolio.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    No holdings found. Add a transaction to start tracking.
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
