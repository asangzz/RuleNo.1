"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio, addTransaction, deleteTransaction } from "./actions";
import { calculatePortfolioPerformance, calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { PortfolioData, PortfolioTransaction, WatchlistItem, UserSettings, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({});
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    ticker: "",
    type: "BUY" as TransactionType,
    shares: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch user settings
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      // 2. Fetch watchlist (for MOS/Sticker prices)
      const watchlistQuery = query(collection(db, "users", user.uid, "watchlist"));
      const watchlistSnap = await getDocs(watchlistQuery);
      const watchlistMap: Record<string, WatchlistItem> = {};
      watchlistSnap.docs.forEach(doc => {
        const data = doc.data() as WatchlistItem;
        watchlistMap[data.ticker] = data;
      });
      setWatchlist(watchlistMap);

      // 3. Fetch portfolio
      const result = await getPortfolio(user.uid);
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        const performance = calculatePortfolioPerformance(
          result.data.transactions,
          result.data.currentPrices
        );
        setPortfolio(performance);
      }
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await addTransaction(
        user.uid,
        formData.ticker,
        formData.type,
        formData.shares,
        formData.price,
        formData.date
      );

      if (res.success) {
        setIsAdding(false);
        setFormData({
          ticker: "",
          type: "BUY",
          shares: 0,
          price: 0,
          date: new Date().toISOString().split('T')[0]
        });
        loadData();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!user) return;
    try {
      const res = await deleteTransaction(user.uid, id);
      if (res.success) {
        loadData();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulate your path to financial freedom.</p>
        </div>
        <div className="flex gap-2">
           <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            {showTransactions ? "Show Holdings" : "Show Transactions"}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {isAdding ? "Cancel" : "Add Transaction"}
          </button>
        </div>
      </header>

      {/* Summary Stats */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Value" value={`$${portfolio.totalValue.toLocaleString()}`} />
          <StatCard title="Total Cost" value={`$${portfolio.totalCost.toLocaleString()}`} />
          <StatCard
            title="Total Gain/Loss"
            value={`$${portfolio.totalGainLoss.toLocaleString()}`}
            subValue={`${portfolio.totalGainLossPercentage.toFixed(2)}%`}
            isPositive={portfolio.totalGainLoss >= 0}
          />
          <StatCard title="Holdings" value={portfolio.items.length.toString()} />
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddTx} className="p-6 bg-card border border-border rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <label htmlFor="tx-ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
              <input
                id="tx-ticker"
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({...formData, ticker: e.target.value})}
                placeholder="AAPL"
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="tx-type" className="text-xs font-medium uppercase text-muted-foreground">Type</label>
              <select
                id="tx-type"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as TransactionType})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="tx-shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
              <input
                id="tx-shares"
                type="number"
                step="0.01"
                value={formData.shares}
                onChange={(e) => setFormData({...formData, shares: parseFloat(e.target.value)})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="tx-price" className="text-xs font-medium uppercase text-muted-foreground">Price</label>
              <input
                id="tx-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="tx-date" className="text-xs font-medium uppercase text-muted-foreground">Date</label>
              <input
                id="tx-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium">
            Save Transaction
          </button>
        </form>
      )}

      {showTransactions ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <th className="p-4">Ticker</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Shares</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="text-sm hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-bold">{tx.ticker}</td>
                  <td className="p-4">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold",
                      tx.type === 'BUY' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-4 text-right">{tx.shares}</td>
                  <td className="p-4 text-right">${tx.price.toFixed(2)}</td>
                  <td className="p-4 text-right text-muted-foreground">{tx.date}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4">
          {portfolio?.items.length === 0 ? (
            <div className="text-center p-12 bg-card border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">No holdings found. Add a transaction to see your portfolio performance.</p>
            </div>
          ) : (
            portfolio?.items.map((item) => {
              const watchInfo = watchlist[item.ticker];
              let signal = "Hold";
              let signalColor = "bg-slate-500/10 text-slate-500";

              if (watchInfo) {
                const futurePE = estimateFuturePE(watchInfo.growthRate, watchInfo.historicalHighPE);
                const stickerPrice = calculateStickerPrice(watchInfo.eps, watchInfo.growthRate, futurePE);
                const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);

                if (item.currentPrice <= mosPrice) {
                  signal = "Strong Buy";
                  signalColor = "bg-green-500/10 text-green-500";
                } else if (item.currentPrice >= stickerPrice) {
                  signal = "Overpriced";
                  signalColor = "bg-red-500/10 text-red-500";
                }
              }

              return (
                <div key={item.ticker} className="p-6 bg-card border border-border rounded-xl flex flex-col md:flex-row justify-between gap-6 hover:border-accent/50 transition-colors group">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent group-hover:border-accent transition-colors">
                      {item.ticker}
                    </div>
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.shares} shares @ ${item.averageCost.toFixed(2)} avg</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1 md:max-w-2xl">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Market Value</p>
                      <p className="font-bold">${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">${item.currentPrice.toFixed(2)} current</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gain / Loss</p>
                      <p className={cn("font-bold", item.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        {item.gainLoss >= 0 ? "+" : ""}{item.gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={cn("text-xs font-medium", item.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        {item.gainLossPercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Allocation</p>
                      <div className="mt-2 w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${(item.totalValue / portfolio.totalValue) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{((item.totalValue / portfolio.totalValue) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1 text-right">Rule No. 1 Signal</p>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        signalColor
                      )}>
                        {signal}
                      </span>
                      {!watchInfo && (
                        <p className="text-[8px] text-muted-foreground mt-1 text-right">Add to Watchlist for info</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subValue, isPositive }: { title: string, value: string, subValue?: string, isPositive?: boolean }) {
  return (
    <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {subValue && (
          <span className={cn("text-xs font-bold", isPositive ? "text-green-500" : "text-red-500")}>
            {isPositive ? "↑" : "↓"} {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
