"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_GROWTH_RATE,
  DEFAULT_HIGH_PE,
  DEFAULT_MOS_PERCENTAGE
} from "@/lib/rule-one";
import { fetchStockInfo } from "./actions";
import { StockData } from "@/lib/stock-service";
import { WatchlistItemCard, WatchlistItemData } from "@/components/WatchlistItemCard";

interface UserSettings {
  mosPercentage: number;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>({ mosPercentage: DEFAULT_MOS_PERCENTAGE });

  // Form states for adding a new ticker
  const [formData, setFormData] = useState({
    name: "",
    currentPrice: 0,
    eps: 0,
    growthRate: DEFAULT_GROWTH_RATE,
    historicalHighPE: DEFAULT_HIGH_PE
  });

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "settings", "profile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserSettings(docSnap.data() as UserSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, [user]);

  const handleFetchStockInfo = async () => {
    if (!newTicker) return;
    setFetchingInfo(true);
    setError(null);
    try {
      const result = await fetchStockInfo(newTicker);
      if (result.success && result.data) {
        const stockInfo = result.data as StockData & { historicalHighPE?: number };
        setFormData({
          ...formData,
          name: stockInfo.name,
          currentPrice: stockInfo.currentPrice,
          eps: stockInfo.eps,
          historicalHighPE: stockInfo.historicalHighPE || DEFAULT_HIGH_PE
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
      })) as WatchlistItemData[];
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
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user, fetchWatchlist, loadSettings]);

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
        growthRate: DEFAULT_GROWTH_RATE,
        historicalHighPE: DEFAULT_HIGH_PE
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
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Ticker"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAddItem} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchStockInfo}
                  disabled={fetchingInfo || !newTicker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-bold uppercase hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  {fetchingInfo ? "..." : "Fetch"}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Company Name</label>
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Current Price</label>
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">EPS (TTM)</label>
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Estimated Growth (decimal)</label>
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Historical High PE</label>
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
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
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
              onRemove={removeItem}
              mosPercentage={userSettings.mosPercentage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
