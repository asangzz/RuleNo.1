"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { getPortfolio } from "./portfolio/actions";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    wonderful: 0,
    watchlist: 0,
    portfolioValue: 0
  });
  const [onSaleTickers, setOnSaleTickers] = useState<{ticker: string, price: number, mosPrice: number}[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        // Mock stats
        setStats({
          wonderful: 2,
          watchlist: 5,
          portfolioValue: 1800.00
        });
        setOnSaleTickers([
          { ticker: 'AAPL', price: 150.00, mosPrice: 160.00 },
          { ticker: 'MSFT', price: 300.00, mosPrice: 310.00 }
        ]);
        setLoading(false);
        return;
      }

      // Fetch user settings
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      const targetMOS = settingsSnap.exists() ? settingsSnap.data().targetMOS : 50;

      const q = query(collection(db, "users", user.uid, "watchlist"));
      const querySnapshot = await getDocs(q);
      const watchlistCount = querySnapshot.docs.length;

      let wonderfulCount = 0;
      const onSale: {ticker: string, price: number, mosPrice: number}[] = [];

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const futurePE = estimateFuturePE(data.growthRate, data.historicalHighPE);
        const stickerPrice = calculateStickerPrice(data.eps, data.growthRate, futurePE);
        const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
        if (data.currentPrice <= mosPrice) {
          wonderfulCount++;
          onSale.push({
            ticker: data.ticker,
            price: data.currentPrice,
            mosPrice: mosPrice
          });
        }
      });

      setOnSaleTickers(onSale);

      // Fetch portfolio value
      const portfolioData = await getPortfolio();

      setStats({
        wonderful: wonderfulCount,
        watchlist: watchlistCount,
        portfolioValue: portfolioData.totalValue
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Mock data for the heatmap (last 12 months of market consistency)
  const heatmapData = Array.from({ length: 52 }, () => Math.random());

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h2>
        <p className="text-muted-foreground">Welcome back. Your investment journey is on track.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Wonderful Businesses</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-4xl font-bold">{loading ? "..." : stats.wonderful}</p>
            <span className="text-green-500 text-sm font-medium">ON SALE</span>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Watchlist</h3>
          <p className="text-4xl font-bold mt-2">{loading ? "..." : stats.watchlist}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Portfolio Value</h3>
          <p className="text-4xl font-bold mt-2">
            {loading ? "..." : `$${stats.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      <div className="p-8 bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold">Market Consistency</h3>
            <p className="text-sm text-muted-foreground">Tracking Rule No. 1 indicators over the last 52 weeks.</p>
          </div>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-accent/30 rounded-sm"></div>
            <div className="w-3 h-3 bg-accent/60 rounded-sm"></div>
            <div className="w-3 h-3 bg-accent rounded-sm"></div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-2 overflow-x-auto pb-4">
          {heatmapData.map((val, i) => (
            <div
              key={i}
              className={cn(
                "h-12 w-full rounded-md transition-all hover:scale-105 cursor-help",
                val < 0.25 ? "bg-slate-900" :
                val < 0.5 ? "bg-accent/20" :
                val < 0.75 ? "bg-accent/50" : "bg-accent"
              )}
              title={`Week ${i + 1}: ${(val * 100).toFixed(0)}% consistency`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
          <span>1 Year Ago</span>
          <span>Today</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {onSaleTickers.length > 0 && (
          <div className="p-6 bg-card border border-green-500/20 rounded-2xl ring-1 ring-green-500/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-500">Price Alerts</h3>
              <span className="text-[10px] font-black bg-green-500 text-green-950 px-2 py-0.5 rounded-full">BUY SIGNAL</span>
            </div>
            <div className="space-y-3">
              {onSaleTickers.map((item) => (
                <div key={item.ticker} className="flex items-center justify-between p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                  <div>
                    <p className="font-black text-lg">{item.ticker}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Current: ${item.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-500">MOS: ${item.mosPrice.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Under MOS</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 bg-card border border-border rounded-2xl">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <p className="text-sm">Added <span className="font-bold">AAPL</span> to Watchlist</p>
              <span className="ml-auto text-xs text-muted-foreground">2d ago</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className="text-sm"><span className="font-bold">MSFT</span> hit MOS Price</p>
              <span className="ml-auto text-xs text-muted-foreground">5d ago</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
              <p className="text-sm">Started analysis for <span className="font-bold">TSLA</span></p>
              <span className="ml-auto text-xs text-muted-foreground">1w ago</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-2xl">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-accent">Rule No. 1 Tip</h3>
          <p className="text-sm leading-relaxed">
            &ldquo;The first rule of investment is: Don&apos;t lose money. And the second rule of investment is: Don&apos;t forget the first rule. Everything else should be based on this.&rdquo;
          </p>
          <button className="mt-4 text-xs font-bold text-accent hover:underline">LEARN MORE →</button>
        </div>
      </div>
    </div>
  );
}
