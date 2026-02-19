"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "./actions";
import { GrowthGrid } from "@/components/GrowthGrid";
import { HistoricalData } from "@/lib/stock-service";

interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
  historicalEPS?: HistoricalData[];
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding a new ticker (simplified)
  const [formData, setFormData] = useState<{
    name: string;
    currentPrice: number;
    eps: number;
    growthRate: number;
    historicalHighPE: number;
    historicalEPS: HistoricalData[];
  }>({
    name: "",
    currentPrice: 0,
    eps: 0,
    growthRate: 0.15,
    historicalHighPE: 20,
    historicalEPS: []
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
          historicalEPS: result.data.historicalEPS || [],
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
      setFormData({
        name: "",
        currentPrice: 0,
        eps: 0,
        growthRate: 0.15,
        historicalHighPE: 20,
        historicalEPS: []
      });
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
              <label className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
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
              <label className="text-xs font-medium uppercase text-muted-foreground">Company Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Apple Inc."
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Current Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({...formData, currentPrice: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">EPS (TTM)</label>
              <input
                type="number"
                step="0.01"
                value={formData.eps}
                onChange={(e) => setFormData({...formData, eps: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Estimated Growth (decimal)</label>
              <input
                type="number"
                step="0.01"
                value={formData.growthRate}
                onChange={(e) => setFormData({...formData, growthRate: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Historical High PE</label>
              <input
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
            const mosPrice = calculateMOSPrice(stickerPrice);
            const isSale = item.currentPrice <= mosPrice;

            return (
              <div key={item.id} className="p-6 bg-card border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent">
                      {item.ticker}
                    </div>
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">Price: ${item.currentPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {item.historicalEPS && item.historicalEPS.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">EPS Growth</p>
                      <GrowthGrid data={item.historicalEPS} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:min-w-[300px]">
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
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
