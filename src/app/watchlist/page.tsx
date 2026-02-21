"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_MOS_PERCENTAGE
} from "@/lib/rule-one";
import { fetchStockInfo } from "./actions";
import { WatchlistItemCard } from "@/components/WatchlistItemCard";

interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetMOS, setTargetMOS] = useState(DEFAULT_MOS_PERCENTAGE);

  // Form states for adding a new ticker (simplified)
  const [formData, setFormData] = useState({
    name: "",
    currentPrice: 0,
    eps: 0,
    growthRate: 0.15,
    historicalHighPE: 20
  });

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "settings", "profile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTargetMOS(docSnap.data().targetMOS || DEFAULT_MOS_PERCENTAGE);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, [user]);

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
      fetchSettings();
      fetchWatchlist();
    } else {
      setLoading(false);
    }
  }, [user, fetchWatchlist, fetchSettings]);

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
        <div className="grid gap-6">
          {items.map((item) => (
            <WatchlistItemCard
              key={item.id}
              item={item}
              targetMOS={targetMOS}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
