"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { getPortfolio, addTransaction } from "./actions";
import {
  PortfolioData,
  WatchlistItem,
  UserSettings
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

// Re-importing from rule-one since utils might not have them
import {
  calculateStickerPrice as calcSticker,
  calculateMOSPrice as calcMOS,
  estimateFuturePE as estPE
} from "@/lib/rule-one";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
    shares: 0,
    price: 0,
    date: new Date().toISOString().split("T")[0]
  });

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [portfolioData, watchlistSnapshot, settingsSnap] = await Promise.all([
        getPortfolio(user.uid),
        getDocs(query(collection(db, "users", user.uid, "watchlist"))),
        getDoc(doc(db, "users", user.uid, "settings", "profile"))
      ]);

      setPortfolio(portfolioData);
      setWatchlist(watchlistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WatchlistItem[]);
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
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await addTransaction(user.uid, {
      ticker: formData.ticker.toUpperCase(),
      type: formData.type,
      shares: formData.shares,
      price: formData.price,
      date: formData.date
    });

    if (res.success) {
      setIsAdding(false);
      setFormData({
        ticker: "",
        type: "BUY",
        shares: 0,
        price: 0,
        date: new Date().toISOString().split("T")[0]
      });
      loadData();
    }
  };

  const getRuleOneMetrics = (ticker: string) => {
    const watchItem = watchlist.find(item => item.ticker === ticker);
    if (!watchItem) return null;

    const futurePE = estPE(watchItem.growthRate, watchItem.historicalHighPE);
    const stickerPrice = calcSticker(watchItem.eps, watchItem.growthRate, futurePE);
    const mosPrice = calcMOS(stickerPrice, settings.targetMOS);

    return { stickerPrice, mosPrice };
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground">Simulate and track your Rule No. 1 holdings.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "Record Transaction"}
        </button>
      </header>

      {portfolio && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Value" value={portfolio.totalValue} currency={settings.currency} />
          <StatCard title="Total Cost" value={portfolio.totalCost} currency={settings.currency} />
          <StatCard
            title="Total Gain"
            value={portfolio.totalGain}
            currency={settings.currency}
            subValue={`${portfolio.totalGainPercentage.toFixed(2)}%`}
            isTrend
          />
          <StatCard title="Holdings" value={portfolio.items.length} isRaw />
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddTransaction} className="p-6 bg-card border border-border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <label htmlFor="ticker" className="text-xs font-bold uppercase text-muted-foreground mb-1">Ticker</label>
              <input
                id="ticker"
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="AAPL"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="type" className="text-xs font-bold uppercase text-muted-foreground mb-1">Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "BUY" | "SELL" })}
                className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="shares" className="text-xs font-bold uppercase text-muted-foreground mb-1">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.01"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) })}
                className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="price" className="text-xs font-bold uppercase text-muted-foreground mb-1">Price</label>
              <input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="date" className="text-xs font-bold uppercase text-muted-foreground mb-1">Date</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
            Add to Portfolio
          </button>
        </form>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Ticker</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Shares</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Avg Cost</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Current Price</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Market Value</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Gain/Loss</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                </td>
              </tr>
            ) : portfolio?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  No holdings found. Start by recording a transaction.
                </td>
              </tr>
            ) : (
              portfolio?.items.map((item) => {
                const metrics = getRuleOneMetrics(item.ticker);
                const isUnderMOS = metrics && item.currentPrice <= metrics.mosPrice;
                const isExpanded = expandedItems[item.ticker];

                return (
                  <>
                    <tr
                      key={item.ticker}
                      className="border-b border-border hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => setExpandedItems({ ...expandedItems, [item.ticker]: !isExpanded })}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-accent">{item.ticker}</span>
                          {isUnderMOS && (
                            <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase">Strong Buy</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{item.shares.toFixed(2)}</td>
                      <td className="p-4 text-sm">${item.averageCost.toFixed(2)}</td>
                      <td className="p-4 text-sm">${item.currentPrice.toFixed(2)}</td>
                      <td className="p-4 text-sm font-bold text-right">${item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={cn(
                        "p-4 text-sm font-bold text-right",
                        item.totalGain >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {item.totalGain >= 0 ? "+" : ""}{item.totalGain.toFixed(2)}
                        <span className="block text-[10px] opacity-80">{item.totalGainPercentage.toFixed(2)}%</span>
                      </td>
                      <td className="p-4">
                        <svg className={cn("w-4 h-4 transition-transform", isExpanded ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/5 border-b border-border">
                        <td colSpan={7} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-4">Rule No. 1 Metrics</h4>
                              {metrics ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Sticker Price:</span>
                                    <span className="font-bold">${metrics.stickerPrice.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">MOS Price:</span>
                                    <span className="font-bold text-green-500">${metrics.mosPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Add to watchlist to see Rule No. 1 metrics.</p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-4">Allocation</h4>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-accent h-full"
                                  style={{ width: `${(item.currentValue / portfolio.totalValue) * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-xs mt-2 text-muted-foreground">
                                {( (item.currentValue / portfolio.totalValue) * 100 ).toFixed(1)}% of total portfolio
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  currency?: string;
  subValue?: string;
  isTrend?: boolean;
  isRaw?: boolean;
}

function StatCard({ title, value, currency, subValue, isTrend, isRaw }: StatCardProps) {
  return (
    <div className="p-6 bg-card border border-border rounded-2xl">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-3xl font-bold">
          {isRaw ? value : formatCurrency(value, currency)}
        </p>
        {subValue && (
          <span className={cn(
            "text-sm font-medium",
            isTrend && (parseFloat(subValue) >= 0 ? "text-green-500" : "text-red-500")
          )}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
