"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo, fetchHistoricalData } from "./actions";
import { addTransaction } from "../portfolio/actions";
import { WatchlistItem, UserSettings, HistoricalData, HistoricalPoint } from "@/lib/types";

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [historicalData, setHistoricalData] = useState<Record<string, HistoricalData>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding a new ticker (simplified)
  const [formData, setFormData] = useState({
    name: "",
    currentPrice: 0,
    eps: 0,
    growthRate: 0.15,
    historicalHighPE: 20
  });

  const handleFetchStockInfo = async () => {
    if (!newTicker) return;
    setFetchingInfo(true);
    setError(null);
    try {
      const result = await fetchStockInfo(newTicker);
      if (result.success && result.data) {
        setFormData({
          ...formData,
          name: result.data.name,
          currentPrice: result.data.currentPrice,
          eps: result.data.eps,
        });
      } else {
        setError(result.error || "Failed to fetch stock info");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setFetchingInfo(false);
    }
  };

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch user settings
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      const q = query(collection(db, "users", user.uid, "watchlist"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WatchlistItem[];
      setItems(data);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWatchlist();
    } else {
      setLoading(false);
    }
  }, [user, fetchWatchlist]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker || !user) return;

    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: newTicker.toUpperCase(),
        ...formData,
        createdAt: new Date().toISOString()
      });
      setNewTicker("");
      setFormData({ name: "", currentPrice: 0, eps: 0, growthRate: 0.15, historicalHighPE: 20 });
      setIsAdding(false);
      fetchWatchlist();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "watchlist", id));
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const toggleExpand = async (item: WatchlistItem) => {
    const isExpanding = !expandedItems[item.id];
    setExpandedItems(prev => ({ ...prev, [item.id]: isExpanding }));

    if (isExpanding && !historicalData[item.id]) {
      setLoadingHistory(prev => ({ ...prev, [item.id]: true }));
      try {
        const res = await fetchHistoricalData(item.ticker);
        if (res.success && res.data) {
          setHistoricalData(prev => ({ ...prev, [item.id]: res.data }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(prev => ({ ...prev, [item.id]: false }));
      }
    }
  };

  const handleBuy = async (item: WatchlistItem) => {
    try {
      const result = await addTransaction({
        ticker: item.ticker,
        type: 'BUY',
        shares: buyAmount,
        price: item.currentPrice,
        date: new Date().toISOString()
      });

      if (result.success) {
        setIsBuying(null);
        alert(`Successfully bought ${buyAmount} shares of ${item.ticker}`);
      } else {
        alert(result.error || "Failed to buy stock");
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Watchlist</h2>
          <p className="text-muted-foreground">Monitor your wonderful businesses.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Ticker"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAddItem} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="new-ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  id="new-ticker"
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchStockInfo}
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
                placeholder="Apple Inc."
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="currentPrice" className="text-xs font-medium uppercase text-muted-foreground">Current Price</label>
              <input
                id="currentPrice"
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="eps" className="text-xs font-medium uppercase text-muted-foreground">EPS (TTM)</label>
              <input
                id="eps"
                type="number"
                step="0.01"
                value={formData.eps}
                onChange={(e) => setFormData({...formData, eps: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="growthRate" className="text-xs font-medium uppercase text-muted-foreground">Estimated Growth (decimal)</label>
              <input
                id="growthRate"
                type="number"
                step="0.01"
                value={formData.growthRate}
                onChange={(e) => setFormData({...formData, growthRate: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="historicalHighPE" className="text-xs font-medium uppercase text-muted-foreground">Historical High PE</label>
              <input
                id="historicalHighPE"
                type="number"
                step="0.1"
                value={formData.historicalHighPE}
                onChange={(e) => setFormData({...formData, historicalHighPE: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Save to Watchlist
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">Your watchlist is empty. Add a ticker to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
            const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
            const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);
            const isSale = item.currentPrice <= mosPrice;

            const isExpanded = expandedItems[item.id];
            const history = historicalData[item.id];
            const isHistoryLoading = loadingHistory[item.id];

            return (
              <div key={item.id} className="flex flex-col bg-card border border-border rounded-xl overflow-hidden transition-all duration-300">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={() => toggleExpand(item)}>
                  <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent group-hover:border-accent transition-colors">
                    {item.ticker}
                  </div>
                  <div>
                    <h3 className="font-bold group-hover:text-accent transition-colors">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">Price: ${item.currentPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Sticker Price</p>
                    <p className="font-bold">${stickerPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">MOS Price</p>
                    <p className={cn("font-bold", isSale ? "text-green-500" : "text-foreground")}>
                      ${mosPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-bold uppercase",
                      isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
                    )}>
                      {isSale ? "On Sale" : "Wait"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsBuying(item.id)}
                      className="px-3 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase hover:bg-green-500/20 transition-colors mr-2"
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => toggleExpand(item)}
                      className="text-xs font-bold uppercase text-accent hover:underline"
                    >
                      {isExpanded ? "Hide Details" : "Show Details"}
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors ml-4"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                </div>

                {isBuying === item.id && (
                  <div className="p-6 pt-0 border-t border-border bg-green-500/5 animate-in slide-in-from-top-2 duration-200">
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label htmlFor={`buy-shares-${item.id}`} className="text-xs font-bold uppercase text-muted-foreground">Shares to buy:</label>
                        <input
                          id={`buy-shares-${item.id}`}
                          type="number"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(parseInt(e.target.value) || 0)}
                          className="w-24 bg-background border border-border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <span className="text-sm font-medium">@ ${item.currentPrice.toFixed(2)} = <span className="font-bold text-accent">${(buyAmount * item.currentPrice).toFixed(2)}</span></span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsBuying(null)}
                          className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground hover:bg-muted rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleBuy(item)}
                          className="px-4 py-2 bg-green-500 text-white rounded text-xs font-bold uppercase hover:bg-green-600 shadow-sm"
                        >
                          Confirm Buy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-border bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                    {isHistoryLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                      </div>
                    ) : history ? (
                      <div className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <HistoryGrid title="Annual EPS" data={history.annualEarningsPerShare} />
                          <HistoryGrid title="Total Revenue" data={history.annualTotalRevenue} isLarge />
                          <HistoryGrid title="Equity" data={history.annualStockholdersEquity} isLarge />
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-8 text-sm text-muted-foreground">No historical data available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryGrid({ title, data, isLarge = false }: { title: string, data: HistoricalPoint[], isLarge?: boolean }) {
  // Take last 10 years
  const last10 = data.slice(-10);

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{title}</h4>
      <div className="grid grid-cols-5 gap-2">
        {last10.map((point, i) => {
          const prev = last10[i-1];
          const hasGrowth = prev && point.value > prev.value;
          const growth = prev ? ((point.value - prev.value) / Math.abs(prev.value)) * 100 : 0;

          return (
            <div key={point.year} className="group relative">
              <div className={cn(
                "h-10 rounded flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105",
                hasGrowth ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                i === 0 ? "bg-slate-500/10 text-slate-500 border border-slate-500/20" :
                "bg-red-500/10 text-red-500 border border-red-500/20"
              )}>
                {point.year.toString().slice(-2)}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded shadow-xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <p className="font-bold">{point.year}: {isLarge ? `$${(point.value / 1e9).toFixed(1)}B` : `$${point.value.toFixed(2)}`}</p>
                {prev && <p className={hasGrowth ? "text-green-500" : "text-red-500"}>{growth > 0 ? "+" : ""}{growth.toFixed(1)}% growth</p>}
              </div>
            </div>
          );
        })}
        {Array.from({ length: 10 - last10.length }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10 rounded bg-slate-900/50 border border-border/50 border-dashed" />
        ))}
      </div>
    </div>
  );
}
