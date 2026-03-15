"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolio, addTransaction } from "./actions";
import { PortfolioData, WatchlistItem, UserSettings } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { cn, formatCurrency } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({});
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txForm, setTxForm] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
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
      // In mock mode, we might want to skip real Firestore calls as they might hang
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        // Load portfolio (it has its own mock handling)
        const res = await getPortfolio();
        if (res.success && res.data) {
          setPortfolio(res.data);
        }
        setLoading(false);
        return;
      }

      // Load settings
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }

      // Load watchlist for MOS calculations
      const watchlistQuery = query(collection(db, "users", user.uid, "watchlist"));
      const watchlistSnap = await getDocs(watchlistQuery);
      const watchlistMap: Record<string, WatchlistItem> = {};
      watchlistSnap.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as WatchlistItem;
        watchlistMap[item.ticker] = item;
      });
      setWatchlist(watchlistMap);

      // Load portfolio
      const res = await getPortfolio();
      if (res.success && res.data) {
        setPortfolio(res.data);
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

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await addTransaction({
        ...txForm,
        ticker: txForm.ticker.toUpperCase(),
      });
      if (res.success) {
        setIsAdding(false);
        setTxForm({
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-bold">Please log in to view your portfolio.</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Track your holdings and Rule No. 1 performance.</p>
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
          <label htmlFor="tx-ticker" className="text-xs font-medium uppercase text-muted-foreground">Ticker</label>
          <input
            id="tx-ticker"
            type="text"
            value={txForm.ticker}
            onChange={(e) => setTxForm({ ...txForm, ticker: e.target.value })}
            placeholder="AAPL"
            className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label htmlFor="tx-type" className="text-xs font-medium uppercase text-muted-foreground">Type</label>
          <select
            id="tx-type"
            value={txForm.type}
            onChange={(e) => setTxForm({ ...txForm, type: e.target.value as "BUY" | "SELL" })}
            className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
        <div>
          <label htmlFor="tx-shares" className="text-xs font-medium uppercase text-muted-foreground">Shares</label>
          <input
            id="tx-shares"
            type="number"
            step="0.001"
            value={txForm.shares}
            onChange={(e) => setTxForm({ ...txForm, shares: parseFloat(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label htmlFor="tx-price" className="text-xs font-medium uppercase text-muted-foreground">Price</label>
          <input
            id="tx-price"
            type="number"
            step="0.01"
            value={txForm.price}
            onChange={(e) => setTxForm({ ...txForm, price: parseFloat(e.target.value) })}
            className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label htmlFor="tx-date" className="text-xs font-medium uppercase text-muted-foreground">Date</label>
          <input
            id="tx-date"
            type="date"
            value={txForm.date}
            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
            className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-medium disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Value"
              value={formatCurrency(portfolio?.totalValue || 0, settings.currency)}
              subtitle="Current market value"
            />
            <SummaryCard
              title="Total Gain/Loss"
              value={formatCurrency(portfolio?.totalGain || 0, settings.currency)}
              subtitle={`${portfolio?.totalGainPercentage.toFixed(2)}% overall`}
              trend={portfolio?.totalGain && portfolio.totalGain >= 0 ? 'up' : 'down'}
            />
            <SummaryCard
              title="Invested Capital"
              value={formatCurrency(portfolio?.totalCost || 0, settings.currency)}
              subtitle="Total cost basis"
            />
            <SummaryCard
              title="Holdings"
              value={(portfolio?.items.length || 0).toString()}
              subtitle="Unique businesses"
            />
          </div>

          {/* Holdings Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">Current Holdings</h3>
            </div>
            <div className="overflow-x-auto">
              {portfolio?.items.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No holdings yet. Add a transaction to start tracking.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-medium uppercase text-muted-foreground bg-muted/30">
                      <th className="p-4">Business</th>
                      <th className="p-4">Shares</th>
                      <th className="p-4">Avg Cost</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Market Value</th>
                      <th className="p-4">Gain/Loss</th>
                      <th className="p-4">Rule No. 1 Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {portfolio?.items.map((item) => {
                      const watchlistInfo = watchlist[item.ticker];
                      let signal = "N/A";
                      let signalColor = "text-muted-foreground";

                      if (watchlistInfo) {
                        const futurePE = estimateFuturePE(watchlistInfo.growthRate, watchlistInfo.historicalHighPE);
                        const stickerPrice = calculateStickerPrice(watchlistInfo.eps, watchlistInfo.growthRate, futurePE);
                        const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);

                        if (item.currentPrice <= mosPrice) {
                          signal = "Strong Buy (Under MOS)";
                          signalColor = "text-green-500";
                        } else if (item.currentPrice <= stickerPrice) {
                          signal = "Fair Value";
                          signalColor = "text-accent";
                        } else {
                          signal = "Overpriced";
                          signalColor = "text-red-500";
                        }
                      }

                      return (
                        <tr key={item.ticker} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-background border border-border rounded flex items-center justify-center font-bold text-xs text-accent">
                                {item.ticker}
                              </div>
                              <span className="font-medium">{watchlistInfo?.name || item.ticker}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{item.shares}</td>
                          <td className="p-4 text-sm">{formatCurrency(item.averageCost, settings.currency)}</td>
                          <td className="p-4 text-sm font-medium">{formatCurrency(item.currentPrice, settings.currency)}</td>
                          <td className="p-4 text-sm font-bold">{formatCurrency(item.marketValue, settings.currency)}</td>
                          <td className="p-4 text-sm">
                            <div className={cn("font-bold", item.gain >= 0 ? "text-green-500" : "text-red-500")}>
                              {item.gain >= 0 ? "+" : ""}{formatCurrency(item.gain, settings.currency)}
                            </div>
                            <div className={cn("text-[10px]", item.gain >= 0 ? "text-green-500/70" : "text-red-500/70")}>
                              {item.gainPercentage.toFixed(2)}%
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full bg-background border border-border", signalColor)}>
                              {signal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle: string; trend?: 'up' | 'down' }) {
  return (
    <div className="p-6 bg-card border border-border rounded-xl space-y-2">
      <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={cn(
          "text-2xl font-bold",
          trend === 'up' ? "text-green-500" : trend === 'down' ? "text-red-500" : ""
        )}>
          {value}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
