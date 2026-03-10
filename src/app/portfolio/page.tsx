"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getPortfolio,
  addTransaction,
  deleteTransaction
} from "./actions";
import {
  calculatePortfolioPerformance,
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import {
  PortfolioTransaction,
  PortfolioData,
  WatchlistItem,
  UserSettings
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const [newTx, setNewTx] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
    shares: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const loadPortfolio = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch Watchlist & Settings for MOS Comparison
      const [watchlistSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, "users", user.uid, "watchlist"))),
        getDoc(doc(db, "users", user.uid, "settings", "profile"))
      ]);

      const watchlistData = watchlistSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WatchlistItem[];
      setWatchlist(watchlistData);

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      const result = await getPortfolio();
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        const performance = calculatePortfolioPerformance(
          result.data.transactions,
          result.data.priceMap
        );
        setData(performance);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wrap in setTimeout to avoid synchronous state update in effect warning
    const timer = setTimeout(() => {
      if (user) {
        loadPortfolio();
      } else {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user, loadPortfolio]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const result = await addTransaction({
      ...newTx,
      ticker: newTx.ticker.toUpperCase()
    });

    if (result.success) {
      setNewTx({
        ticker: "",
        type: "BUY",
        shares: 0,
        price: 0,
        date: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
      loadPortfolio();
    } else {
      setLoading(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!user) return;
    setLoading(true);
    const result = await deleteTransaction(id);
    if (result.success) {
      loadPortfolio();
    } else {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulate and track your Rule No. 1 holdings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            {showTransactions ? "Hide Transactions" : "View History"}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {isAdding ? "Cancel" : "Add Transaction"}
          </button>
        </div>
      </header>

      {isAdding && (
        <form onSubmit={handleAddTx} className="p-6 bg-card border border-border rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <label htmlFor="ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <input
                id="ticker"
                type="text"
                value={newTx.ticker}
                onChange={(e) => setNewTx({...newTx, ticker: e.target.value})}
                placeholder="AAPL"
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="type" className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                id="type"
                value={newTx.type}
                onChange={(e) => setNewTx({...newTx, type: e.target.value as "BUY" | "SELL"})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.001"
                value={newTx.shares}
                onChange={(e) => setNewTx({...newTx, shares: parseFloat(e.target.value)})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="price" className="text-xs font-medium uppercase text-muted-foreground">Price</label>
              <input
                id="price"
                type="number"
                step="0.01"
                value={newTx.price}
                onChange={(e) => setNewTx({...newTx, price: parseFloat(e.target.value)})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="date" className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                id="date"
                type="date"
                value={newTx.date}
                onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Record Transaction
          </button>
        </form>
      )}

      {data && data.items.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Total Value"
              value={`$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatsCard
              label="Total Cost Basis"
              value={`$${data.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatsCard
              label="Total Gain/Loss"
              value={`$${data.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subValue={`${data.totalGainLossPercentage.toFixed(2)}%`}
              trend={data.totalGainLoss >= 0 ? "up" : "down"}
            />
            <StatsCard
              label="Holdings"
              value={data.items.length.toString()}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Ticker</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Shares</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Avg Cost</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Current Price</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Value</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Gain/Loss</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Rule No. 1 Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((item) => {
                    const watchlistItem = watchlist.find(w => w.ticker === item.ticker);
                    let mosPrice = 0;
                    let stickerPrice = 0;

                    if (watchlistItem) {
                      const futurePE = estimateFuturePE(watchlistItem.growthRate, watchlistItem.historicalHighPE);
                      stickerPrice = calculateStickerPrice(watchlistItem.eps, watchlistItem.growthRate, futurePE);
                      mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);
                    }

                    const isOverpriced = item.currentPrice >= stickerPrice && stickerPrice > 0;
                    const isOnSale = item.currentPrice <= mosPrice && mosPrice > 0;

                    return (
                      <tr key={item.ticker} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4 font-bold text-accent">{item.ticker}</td>
                        <td className="px-6 py-4 text-sm">{item.shares.toFixed(3)}</td>
                        <td className="px-6 py-4 text-sm">${(item.costBasis / item.shares).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">${item.currentPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium">${item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={cn(
                          "px-6 py-4 text-sm font-bold",
                          item.gainLoss >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {item.gainLoss >= 0 ? "+" : ""}{item.gainLossPercentage.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4">
                          {watchlistItem ? (
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase w-fit",
                                isOnSale ? "bg-green-500/10 text-green-500" :
                                isOverpriced ? "bg-red-500/10 text-red-500" :
                                "bg-slate-500/10 text-slate-500"
                              )}>
                                {isOnSale ? "Strong Buy" : isOverpriced ? "Consider Sell" : "Hold"}
                              </span>
                              <div className="mt-1 w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                <div
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    isOnSale ? "bg-green-500" : isOverpriced ? "bg-red-500" : "bg-accent"
                                  )}
                                  style={{ width: `${Math.min(100, (item.currentPrice / (stickerPrice || 1)) * 100)}%` }}
                                />
                              </div>
                              <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">
                                Target MOS: ${mosPrice.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Add to Watchlist for analysis</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">Your portfolio is empty. Add a transaction to start simulation.</p>
        </div>
      )}

      {showTransactions && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-bold">Transaction History</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Ticker</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Shares</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Price</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground">Total</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">{tx.date}</td>
                    <td className="px-6 py-3 font-medium">{tx.ticker}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        tx.type === 'BUY' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">{tx.shares}</td>
                    <td className="px-6 py-3">${tx.price.toFixed(2)}</td>
                    <td className="px-6 py-3">${(tx.shares * tx.price).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ label, value, subValue, trend }: { label: string, value: string, subValue?: string, trend?: 'up' | 'down' }) {
  return (
    <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</h3>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-3xl font-bold">{value}</p>
        {subValue && (
          <span className={cn(
            "text-sm font-medium",
            trend === 'up' ? "text-green-500" : "text-red-500"
          )}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
