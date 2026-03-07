"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems, addPortfolioItem, removePortfolioItem } from "./actions";
import { PortfolioData, WatchlistItem, UserSettings } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<PortfolioData[]>([]);
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({});
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Form states
  const [formData, setFormData] = useState({
    ticker: "",
    name: "",
    shares: 0,
    averageCost: 0,
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [portfolioRes, watchlistSnap, settingsSnap] = await Promise.all([
        getPortfolioItems(),
        getDocs(query(collection(db, "users", user.uid, "watchlist"))),
        getDoc(doc(db, "users", user.uid, "settings", "profile"))
      ]);

      if (portfolioRes.success && portfolioRes.data) {
        setHoldings(portfolioRes.data);
      }

      const watchlistData: Record<string, WatchlistItem> = {};
      watchlistSnap.docs.forEach(doc => {
        const data = doc.data() as WatchlistItem;
        watchlistData[data.ticker] = data;
      });
      setWatchlist(watchlistData);

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    try {
      const res = await addPortfolioItem(formData);
      if (res.success) {
        setIsAdding(false);
        setFormData({ ticker: "", name: "", shares: 0, averageCost: 0, purchaseDate: new Date().toISOString().split('T')[0] });
        fetchData();
      } else {
        setError(res.error || "Failed to add item");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user) return;
    try {
      const res = await removePortfolioItem(id);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalValue = holdings.reduce((acc, item) => acc + item.marketValue, 0);
  const totalCost = holdings.reduce((acc, item) => acc + (item.averageCost * item.shares), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Track your simulated trades and performance.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Trade"}
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddItem} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <input
                id="ticker"
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({...formData, ticker: e.target.value})}
                placeholder="AAPL"
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="name" className="text-xs font-medium uppercase text-muted-foreground">Company Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Apple Inc."
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.0001"
                value={formData.shares}
                onChange={(e) => setFormData({...formData, shares: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="averageCost" className="text-xs font-medium uppercase text-muted-foreground">Average Cost</label>
              <input
                id="averageCost"
                type="number"
                step="0.01"
                value={formData.averageCost}
                onChange={(e) => setFormData({...formData, averageCost: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="purchaseDate" className="text-xs font-medium uppercase text-muted-foreground">Purchase Date</label>
              <input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Record Trade
          </button>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Market Value</h3>
          <p className="text-2xl font-bold mt-2">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Cost</h3>
          <p className="text-2xl font-bold mt-2">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={cn("text-2xl font-bold", totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
              ${totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={cn("text-sm font-medium", totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
              ({totalGainLossPercentage.toFixed(2)}%)
            </p>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Holdings</h3>
          <p className="text-2xl font-bold mt-2">{holdings.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">Your portfolio is empty. Add a trade to track performance.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Holding</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Shares</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Avg Cost</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Price</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Gain/Loss</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">MOS Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holdings.map((item) => {
                  const watchlistInfo = watchlist[item.ticker];
                  let mosPrice = 0;
                  let isSale = false;

                  if (watchlistInfo) {
                    const futurePE = estimateFuturePE(watchlistInfo.growthRate, watchlistInfo.historicalHighPE);
                    const stickerPrice = calculateStickerPrice(watchlistInfo.eps, watchlistInfo.growthRate, futurePE);
                    mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);
                    isSale = item.currentPrice <= mosPrice;
                  }

                  const isExpanded = expandedItems[item.id];

                  return (
                    <React.Fragment key={item.id}>
                    <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold">{item.ticker}</p>
                          <p className="text-xs text-muted-foreground">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">{item.shares}</td>
                      <td className="px-6 py-4 text-right">${item.averageCost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">${item.currentPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className={cn("font-medium", item.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                          <p>${item.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs">{item.gainLossPercentage.toFixed(2)}%</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {watchlistInfo ? (
                          <span className={cn(
                            "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                            isSale ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {isSale ? "Buy Zone" : "Overvalued"}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-slate-500/10 text-slate-500">
                            No Rule #1 Data
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/10 border-t border-border animate-in fade-in slide-in-from-top-2">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-8">
                              <div>
                                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">Portfolio Allocation</h4>
                                <div className="w-full bg-background border border-border rounded-lg h-2 flex overflow-hidden min-w-[200px]">
                                  <div
                                    className="bg-accent h-full"
                                    style={{ width: `${(item.marketValue / totalValue * 100).toFixed(1)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 font-bold">{(item.marketValue / totalValue * 100).toFixed(1)}% OF TOTAL</p>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">Purchase Insight</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Cost Basis</p>
                                    <p className="text-sm font-bold">${(item.averageCost * item.shares).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Market Value</p>
                                    <p className="text-sm font-bold">${item.marketValue.toLocaleString()}</p>
                                  </div>
                                  {watchlistInfo && (
                                    <>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">MOS Price</p>
                                        <p className="text-sm font-bold">${mosPrice.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Growth Rate</p>
                                        <p className="text-sm font-bold">{(watchlistInfo.growthRate * 100).toFixed(1)}%</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
