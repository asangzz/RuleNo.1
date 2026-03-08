"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio, addTransaction } from "./actions";
import { fetchStockInfo } from "../watchlist/actions";
import { PortfolioData, PortfolioItem, UserSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [watchlist, setWatchlist] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ticker: "",
    type: "buy" as "buy" | "sell",
    shares: 0,
    price: 0,
    date: new Date().toISOString().split("T")[0]
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [portfolioRes, settingsSnap, watchlistSnap] = await Promise.all([
        getPortfolio(user.uid),
        getDoc(doc(db, "users", user.uid, "settings", "profile")),
        getDocs(query(collection(db, "users", user.uid, "watchlist")))
      ]);

      if (portfolioRes.success && portfolioRes.data) {
        setPortfolio(portfolioRes.data);
      }

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      const watchlistData: Record<string, any> = {};
      watchlistSnap.docs.forEach(doc => {
        const data = doc.data();
        watchlistData[data.ticker] = data;
      });
      setWatchlist(watchlistData);

    } catch (err) {
      console.error("Error fetching portfolio data:", err);
      setError("Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleFetchPrice = async () => {
    if (!formData.ticker) return;
    setFetchingStock(true);
    try {
      const res = await fetchStockInfo(formData.ticker);
      if (res.success && res.data) {
        setFormData(prev => ({ ...prev, price: res.data.currentPrice }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingStock(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await addTransaction(user.uid, {
        ticker: formData.ticker.toUpperCase(),
        type: formData.type,
        shares: formData.shares,
        price: formData.price,
        date: formData.date
      });

      if (res.success) {
        setIsAdding(false);
        setFormData({
          ticker: "",
          type: "buy",
          shares: 0,
          price: 0,
          date: new Date().toISOString().split("T")[0]
        });
        fetchData();
      } else {
        setError(res.error || "Failed to add transaction");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulate and track your Rule No. 1 positions.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Transaction"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  id="ticker"
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchPrice}
                  disabled={fetchingStock || !formData.ticker}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-medium"
                >
                  {fetchingStock ? "..." : "Price"}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="type" className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "buy" | "sell" })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label htmlFor="shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="price" className="text-xs font-medium uppercase text-muted-foreground">Price</label>
              <input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="date" className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Record Transaction
          </button>
        </form>
      )}

      {loading && !portfolio ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
              <p className="text-3xl font-bold mt-2">${portfolio?.totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Cost</h3>
              <p className="text-3xl font-bold mt-2">${portfolio?.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Gain / Loss</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className={cn("text-3xl font-bold", (portfolio?.totalGainLoss || 0) >= 0 ? "text-green-500" : "text-red-500")}>
                  {(portfolio?.totalGainLoss || 0) >= 0 ? "+" : ""}${portfolio?.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Return</h3>
              <p className={cn("text-3xl font-bold mt-2", (portfolio?.totalGainLossPercentage || 0) >= 0 ? "text-green-500" : "text-red-500")}>
                {(portfolio?.totalGainLossPercentage || 0) >= 0 ? "+" : ""}{portfolio?.totalGainLossPercentage.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ticker</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Shares</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Avg Price</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Current</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Market Value</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portfolio?.items.map((item) => {
                    const wlData = watchlist[item.ticker];
                    let mosPrice = 0;
                    if (wlData) {
                        const futurePE = estimateFuturePE(wlData.growthRate, wlData.historicalHighPE);
                        const stickerPrice = calculateStickerPrice(wlData.eps, wlData.growthRate, futurePE);
                        mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);
                    }

                    return (
                      <tr key={item.ticker} className="hover:bg-muted/10 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-background border border-border rounded flex items-center justify-center font-bold text-accent text-xs">
                              {item.ticker}
                            </div>
                            <div>
                                <p className="font-bold">{item.ticker}</p>
                                {mosPrice > 0 && (
                                    <p className={cn("text-[10px] font-bold uppercase", item.currentPrice <= mosPrice ? "text-green-500" : "text-muted-foreground")}>
                                        {item.currentPrice <= mosPrice ? "On Sale" : "Above MOS"}
                                    </p>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium">{item.shares}</td>
                        <td className="p-4 text-sm font-medium">${item.averagePrice.toFixed(2)}</td>
                        <td className="p-4 text-sm font-medium">${item.currentPrice.toFixed(2)}</td>
                        <td className="p-4 text-sm font-medium">${item.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right">
                          <p className={cn("text-sm font-bold", item.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                            {item.gainLoss >= 0 ? "+" : ""}{item.gainLoss.toFixed(2)}
                          </p>
                          <p className={cn("text-[10px] font-bold", item.gainLossPercentage >= 0 ? "text-green-500" : "text-red-500")}>
                            {item.gainLossPercentage >= 0 ? "+" : ""}{item.gainLossPercentage.toFixed(2)}%
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {(!portfolio || portfolio.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        No positions found. Record a transaction to see your portfolio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
