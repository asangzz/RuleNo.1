"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchPortfolio, removePortfolioItem, addPortfolioItem } from "./actions";
import { fetchStockInfo } from "../watchlist/actions";
import { PortfolioItem, WatchlistItem } from "@/lib/types";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [watchlistMap, setWatchlistMap] = useState<Record<string, WatchlistItem>>({});
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    shares: 0,
    averagePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const fetchCurrentPrices = useCallback(async (portfolioItems: PortfolioItem[]) => {
    const tickers = Array.from(new Set(portfolioItems.map(item => item.ticker)));
    const prices: Record<string, number> = {};

    await Promise.all(tickers.map(async (ticker) => {
      try {
        const result = await fetchStockInfo(ticker);
        if (result.success && result.data) {
          prices[ticker] = result.data.currentPrice;
        }
      } catch (err) {
        console.error(`Error fetching price for ${ticker}:`, err);
      }
    }));

    setCurrentPrices(prices);
  }, []);

  const loadPortfolio = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch watchlist to get Rule No. 1 parameters
    const wq = query(collection(db, "users", user.uid, "watchlist"));
    const wSnapshot = await getDocs(wq);
    const wMap: Record<string, WatchlistItem> = {};
    wSnapshot.docs.forEach(doc => {
      const data = doc.data() as WatchlistItem;
      wMap[data.ticker] = data;
    });
    setWatchlistMap(wMap);

    const result = await fetchPortfolio(user.uid);
    if (result.success && result.data) {
      setItems(result.data);
      await fetchCurrentPrices(result.data);
    }
    setLoading(false);
  }, [user, fetchCurrentPrices]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleFetchInfo = async () => {
    if (!newTicker) return;
    setFetchingInfo(true);
    setError(null);
    try {
      const result = await fetchStockInfo(newTicker);
      if (result.success && result.data) {
        setFormData({
          ...formData,
          name: result.data.name,
          averagePrice: result.data.currentPrice
        });
      } else {
        setError(result.error || "Ticker not found");
      }
    } catch (error) {
      console.error(error);
      setError("Error fetching ticker info");
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTicker) return;

    const result = await addPortfolioItem(user.uid, {
      ticker: newTicker.toUpperCase(),
      name: formData.name,
      shares: formData.shares,
      averagePrice: formData.averagePrice,
      purchaseDate: formData.purchaseDate,
      createdAt: new Date().toISOString()
    });

    if (result.success) {
      setIsAdding(false);
      setNewTicker("");
      setFormData({ name: "", shares: 0, averagePrice: 0, purchaseDate: new Date().toISOString().split('T')[0] });
      loadPortfolio();
    } else {
      setError(result.error || "Failed to add item");
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user) return;
    const result = await removePortfolioItem(user.uid, id);
    if (result.success) {
      loadPortfolio();
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (item.shares * item.averagePrice), 0);
  const totalValue = items.reduce((sum, item) => {
    const currentPrice = currentPrices[item.ticker] || item.averagePrice;
    return sum + (item.shares * currentPrice);
  }, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulated holdings and performance.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Transaction"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAddItem} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  id="ticker"
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="TSLA"
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchInfo}
                  disabled={fetchingInfo || !newTicker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  {fetchingInfo ? "..." : "Fetch"}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div>
              <label htmlFor="name" className="text-xs font-medium uppercase text-muted-foreground">Company Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
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
              <label htmlFor="averagePrice" className="text-xs font-medium uppercase text-muted-foreground">Purchase Price</label>
              <input
                id="averagePrice"
                type="number"
                step="0.01"
                value={formData.averagePrice}
                onChange={(e) => setFormData({...formData, averagePrice: parseFloat(e.target.value)})}
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
            Record Purchase
          </button>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
          <p className="text-4xl font-bold mt-2">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={cn("text-4xl font-bold", totalGain >= 0 ? "text-green-500" : "text-red-500")}>
              {totalGain >= 0 ? "+" : ""}${Math.abs(totalGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={cn("text-sm font-medium", totalGain >= 0 ? "text-green-500" : "text-red-500")}>
              ({totalGainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Holdings</h3>
          <p className="text-4xl font-bold mt-2">{items.length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Asset</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Shares</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Avg Price</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Market Price</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-center">Rule No. 1</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Value</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Gain/Loss</th>
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No holdings yet. Add a transaction to track your portfolio.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const currentPrice = currentPrices[item.ticker] || item.averagePrice;
                  const value = item.shares * currentPrice;
                  const cost = item.shares * item.averagePrice;
                  const gain = value - cost;
                  const gainPercent = (gain / cost) * 100;

                  const watchlistData = watchlistMap[item.ticker];
                  let stickerPrice = 0;
                  let mosPrice = 0;
                  if (watchlistData) {
                    const futurePE = estimateFuturePE(watchlistData.growthRate, watchlistData.historicalHighPE);
                    stickerPrice = calculateStickerPrice(watchlistData.eps, watchlistData.growthRate, futurePE);
                    mosPrice = calculateMOSPrice(stickerPrice, 50); // Default to 50 for now
                  }

                  return (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="font-bold">{item.ticker}</div>
                        <div className="text-xs text-muted-foreground">{item.name}</div>
                      </td>
                      <td className="p-4 text-sm">{item.shares.toLocaleString()}</td>
                      <td className="p-4 text-sm">${item.averagePrice.toFixed(2)}</td>
                      <td className="p-4 text-sm">${currentPrice.toFixed(2)}</td>
                      <td className="p-4 text-sm">
                        {watchlistData ? (
                          <div className="text-center">
                            <div className="text-xs font-bold text-green-500">MOS: ${mosPrice.toFixed(2)}</div>
                            <div className="text-[10px] text-muted-foreground">Fair: ${stickerPrice.toFixed(2)}</div>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-muted-foreground italic">No analysis</div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={cn("p-4 text-sm font-bold text-right", gain >= 0 ? "text-green-500" : "text-red-500")}>
                        <div>{gain >= 0 ? "+" : ""}{gain.toFixed(2)}</div>
                        <div className="text-[10px]">({gainPercent.toFixed(2)}%)</div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
