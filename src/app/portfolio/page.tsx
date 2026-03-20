"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { PortfolioData, PortfolioItem, PortfolioTransaction, WatchlistItem, UserSettings } from "@/lib/types";
import { getPortfolio, addTransaction } from "./actions";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { fetchStockInfo } from "../watchlist/actions";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Omit<PortfolioTransaction, 'id'>>({
    ticker: "",
    type: "BUY",
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
      const [portfolioRes, watchlistSnap, settingsSnap] = await Promise.all([
        getPortfolio(),
        getDocs(query(collection(db, "users", user.uid, "watchlist"))),
        getDoc(doc(db, "users", user.uid, "settings", "profile"))
      ]);

      if (portfolioRes.success) {
        setPortfolio(portfolioRes.data);
      }

      setWatchlist(watchlistSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WatchlistItem)));

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFetchInfo = async () => {
    if (!newTransaction.ticker) return;
    setFetchingInfo(true);
    try {
      const res = await fetchStockInfo(newTransaction.ticker);
      if (res.success && res.data) {
        setNewTransaction(prev => ({ ...prev, price: res.data!.currentPrice }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addTransaction(newTransaction);
    if (res.success) {
      setIsAdding(false);
      setNewTransaction({
        ticker: "",
        type: "BUY",
        shares: 0,
        price: 0,
        date: new Date().toISOString().split('T')[0]
      });
      loadData();
    }
  };

  const getRuleOneStatus = (item: PortfolioItem) => {
    const watchlistItem = watchlist.find(w => w.ticker === item.ticker);
    if (!watchlistItem) return null;

    const futurePE = estimateFuturePE(watchlistItem.growthRate, watchlistItem.historicalHighPE);
    const stickerPrice = calculateStickerPrice(watchlistItem.eps, watchlistItem.growthRate, futurePE);
    const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);

    if (item.currentPrice <= mosPrice) return { label: "Strong Buy", color: "text-green-500" };
    if (item.currentPrice >= stickerPrice) return { label: "Overpriced", color: "text-red-500" };
    return { label: "Hold", color: "text-slate-400" };
  };

  return (
    <div className="space-y-8 pb-12">
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
            <div className="flex flex-col">
              <label htmlFor="ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  id="ticker"
                  type="text"
                  value={newTransaction.ticker}
                  onChange={(e) => setNewTransaction({ ...newTransaction, ticker: e.target.value.toUpperCase() })}
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchInfo}
                  disabled={fetchingInfo}
                  className="px-2 bg-secondary text-secondary-foreground rounded-md text-xs"
                >
                  {fetchingInfo ? "..." : "Fetch"}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="type" className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                id="type"
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as 'BUY' | 'SELL' })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label htmlFor="shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.01"
                value={newTransaction.shares}
                onChange={(e) => setNewTransaction({ ...newTransaction, shares: parseFloat(e.target.value) })}
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
                value={newTransaction.price}
                onChange={(e) => setNewTransaction({ ...newTransaction, price: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="date" className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                id="date"
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Save Transaction
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : portfolio && portfolio.items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Portfolio Value</h3>
              <p className="text-4xl font-bold mt-2">${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Gain/Loss</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className={cn("text-4xl font-bold", portfolio.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                  {portfolio.totalGain >= 0 ? "+" : ""}${Math.abs(portfolio.totalGain).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className={cn("text-sm font-medium", portfolio.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                  ({portfolio.totalGainPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Rule No. 1 Score</h3>
              <p className="text-4xl font-bold mt-2 text-accent">
                {portfolio.items.filter(item => getRuleOneStatus(item)?.label === "Strong Buy").length}/{portfolio.items.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">On-Sale Holdings</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Ticker</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Holdings</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Avg Cost</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Market Price</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Total Value</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Gain/Loss</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest text-right">Rule No. 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portfolio.items.map((item) => {
                    const status = getRuleOneStatus(item);
                    return (
                      <tr key={item.ticker} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="font-bold">{item.ticker}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{item.shares.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">shares</div>
                        </td>
                        <td className="p-4 font-medium">${item.averageCost.toFixed(2)}</td>
                        <td className="p-4 font-medium">${item.currentPrice.toFixed(2)}</td>
                        <td className="p-4 font-bold">${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-4">
                          <div className={cn("font-bold", item.totalGain >= 0 ? "text-green-500" : "text-red-500")}>
                            {item.totalGain >= 0 ? "+" : ""}{item.totalGainPercent.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${Math.abs(item.totalGain).toFixed(2)}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {status ? (
                            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded border", status.color, "border-current bg-current/5")}>
                              {status.label}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border border-slate-700 text-slate-500 bg-slate-500/5">
                              Unanalyzed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-8 bg-card border border-border rounded-2xl">
                <h3 className="text-lg font-bold mb-6">Allocation Breakdown</h3>
                <div className="space-y-4">
                  {portfolio.items.sort((a,b) => b.totalValue - a.totalValue).map(item => (
                    <div key={item.ticker} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span>{item.ticker}</span>
                        <span>{((item.totalValue / portfolio.totalValue) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-1000"
                          style={{ width: `${(item.totalValue / portfolio.totalValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="p-8 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-accent">Rule No. 1 Strategy</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your portfolio should consist of &quot;Wonderful Businesses&quot; bought at a &quot;Margin of Safety&quot;.
                  Currently, <span className="text-accent font-bold">{portfolio.items.filter(item => getRuleOneStatus(item)?.label === "Strong Buy").length}</span> of your holdings are at or below their MOS price.
                </p>
                <div className="mt-6 p-4 bg-background/50 rounded-xl border border-border/50">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Recommended Action</p>
                  <p className="text-sm">
                    {portfolio.items.some(item => getRuleOneStatus(item)?.label === "Overpriced")
                      ? "Consider trimming positions in companies marked as 'Overpriced' to lock in gains."
                      : "Look for more 'Strong Buy' opportunities in your watchlist to deploy remaining cash."}
                  </p>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-24 bg-card border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">Your portfolio is currently empty. Record your first transaction to start tracking performance.</p>
        </div>
      )}
    </div>
  );
}
