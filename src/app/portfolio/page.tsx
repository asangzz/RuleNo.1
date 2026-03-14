"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio, addTransaction, deleteTransaction } from "./actions";
import { fetchStockInfo } from "../watchlist/actions";
import { PortfolioTransaction, UserSettings, WatchlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import {
  calculatePortfolioPerformance
} from "@/lib/rule-one";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [prices, setPrices] = useState<Record<string, { currentPrice: number; name: string }>>({});
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({});
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
    shares: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      // Fetch user settings
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      // Fetch watchlist to get MOS/Sticker prices
      const watchlistQuery = query(collection(db, "users", user.uid, "watchlist"));
      const watchlistSnap = await getDocs(watchlistQuery);
      const watchlistData: Record<string, WatchlistItem> = {};
      watchlistSnap.docs.forEach(doc => {
        const item = doc.data() as WatchlistItem;
        watchlistData[item.ticker.toUpperCase()] = item;
      });
      setWatchlist(watchlistData);

      // Fetch portfolio
      const result = await getPortfolio();
      if (result.success) {
        setTransactions(result.transactions || []);
        setPrices(result.prices || {});
      }
    } catch (err) {
      console.error("Error loading portfolio data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const portfolioData = useMemo(() => {
    return calculatePortfolioPerformance(transactions, prices, watchlist, settings.targetMOS);
  }, [transactions, prices, watchlist, settings.targetMOS]);

  const handleFetchInfo = async () => {
    if (!newTransaction.ticker) return;
    setFetchingInfo(true);
    setError(null);
    try {
      const result = await fetchStockInfo(newTransaction.ticker);
      if (result.success && result.data) {
        setNewTransaction(prev => ({
          ...prev,
          price: result.data!.currentPrice
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    try {
      const result = await addTransaction({
        ...newTransaction,
        ticker: newTransaction.ticker.toUpperCase(),
        shares: Number(newTransaction.shares),
        price: Number(newTransaction.price)
      });

      if (result.success) {
        setNewTransaction({
          ticker: "",
          type: "BUY",
          shares: 0,
          price: 0,
          date: new Date().toISOString().split('T')[0]
        });
        setIsAdding(false);
        loadData();
      } else {
        setError(result.error || "Failed to add transaction");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    const result = await deleteTransaction(id);
    if (result.success) {
      loadData();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Track your skin in the game.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Add Transaction"}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAddTransaction} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newTransaction.ticker}
                  onChange={(e) => setNewTransaction({...newTransaction, ticker: e.target.value.toUpperCase()})}
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchInfo}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                >
                  {fetchingInfo ? "..." : "Price"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as "BUY" | "SELL"})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.shares}
                onChange={(e) => setNewTransaction({...newTransaction, shares: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Price</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.price}
                onChange={(e) => setNewTransaction({...newTransaction, price: parseFloat(e.target.value)})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Save Transaction
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Value</h3>
              <p className="text-3xl font-bold mt-2">${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className={cn("text-3xl font-bold", portfolioData.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                  {portfolioData.totalGain >= 0 ? "+" : ""}${Math.abs(portfolioData.totalGain).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className={cn("text-sm font-medium", portfolioData.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                  ({portfolioData.totalGainPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Holdings</h3>
              <p className="text-3xl font-bold mt-2">{portfolioData.items.length}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Company</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Shares</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Avg Cost</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Current</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Total Value</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Gain/Loss</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Rule No. 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portfolioData.items.map((item) => {
                    const isSale = item.mosPrice && item.currentPrice <= item.mosPrice;
                    const isOverpriced = item.stickerPrice && item.currentPrice >= item.stickerPrice;

                    return (
                      <tr key={item.ticker} className="hover:bg-muted/30 transition-colors group">
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
                        <td className="p-4 text-right font-medium text-sm">{item.shares.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-sm">${item.averageCost.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-sm">${item.currentPrice.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold text-sm">${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right">
                          <p className={cn("font-bold text-sm", item.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                            {item.totalGain >= 0 ? "+" : ""}{item.totalGain.toFixed(2)}
                          </p>
                          <p className={cn("text-[10px] font-bold", item.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                            {item.totalGainPercentage.toFixed(2)}%
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {isSale ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full w-fit">Strong Buy</span>
                            ) : isOverpriced ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full w-fit">Overpriced</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-500/10 text-slate-500 rounded-full w-fit">Hold</span>
                            )}
                            <p className="text-[10px] text-muted-foreground font-medium">MOS: ${item.mosPrice?.toFixed(2) || 'N/A'}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {portfolioData.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No active holdings. Add your first transaction above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            <div className="grid gap-4">
              {transactions.slice().reverse().map((t) => (
                <div key={t.id} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                      t.type === 'BUY' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {t.type}
                    </div>
                    <div>
                      <p className="font-bold">{t.ticker}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-8">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Shares</p>
                      <p className="font-bold">{t.shares}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Price</p>
                      <p className="font-bold">${t.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
                      <p className="font-bold">${(t.shares * t.price).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
