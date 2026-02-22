"use client";

import { useState, useEffect } from "react";
import {
  calculatePaybackTime,
  PAYBACK_TIME_LIMIT,
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE,
  DEFAULT_MOS_PERCENTAGE,
  DEFAULT_GROWTH_RATE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [inputs, setInputs] = useState({
    ticker: "",
    name: "",
    price: 150,
    eps: 5,
    growthRate: DEFAULT_GROWTH_RATE,
    historicalHighPE: 20,
  });
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetMOS, setTargetMOS] = useState(DEFAULT_MOS_PERCENTAGE);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTargetMOS(docSnap.data().targetMOS || DEFAULT_MOS_PERCENTAGE);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    loadSettings();
  }, [user]);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const futurePE = estimateFuturePE(inputs.growthRate, inputs.historicalHighPE);
  const stickerPrice = calculateStickerPrice(inputs.eps, inputs.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'ticker' || name === 'name' ? value : (parseFloat(value) || 0),
    }));
  };

  const handleFetchInfo = async () => {
    if (!inputs.ticker) return;
    setFetching(true);
    setMessage(null);
    try {
      const res = await fetchStockInfo(inputs.ticker);
      if (res.success && res.data) {
        setInputs(prev => ({
          ...prev,
          name: res.data!.name,
          price: res.data!.currentPrice,
          eps: res.data!.eps,
        }));
      } else {
        setMessage({ type: 'error', text: res.error || "Failed to fetch stock info" });
      }
    } catch {
      setMessage({ type: 'error', text: "An error occurred" });
    } finally {
      setFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !inputs.ticker) return;
    setSaving(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: inputs.ticker.toUpperCase(),
        name: inputs.name || inputs.ticker.toUpperCase(),
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.historicalHighPE,
        createdAt: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: "Added to watchlist!" });
    } catch (error) {
      console.error("Error saving:", error);
      setMessage({ type: 'error', text: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Payback Time</h2>
        <p className="text-muted-foreground">
          How many years of earnings does it take to get your money back?
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        <section className="space-y-6 p-6 bg-card border border-border rounded-2xl h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
            {message && (
              <span className={cn(
                "text-[10px] font-bold uppercase",
                message.type === 'success' ? "text-green-500" : "text-red-500"
              )}>
                {message.text}
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  name="ticker"
                  value={inputs.ticker}
                  onChange={handleInputChange}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
                <button
                  onClick={handleFetchInfo}
                  disabled={fetching || !inputs.ticker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-bold hover:bg-secondary/80 disabled:opacity-50"
                >
                  {fetching ? "..." : "Fetch"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current Price ($)</label>
              <input
                type="number"
                name="price"
                value={inputs.price}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current EPS ($)</label>
              <input
                type="number"
                name="eps"
                value={inputs.eps}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Estimated Growth (decimal)</label>
              <input
                type="number"
                step="0.01"
                name="growthRate"
                value={inputs.growthRate}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Hist. High PE</label>
              <input
                type="number"
                step="0.1"
                name="historicalHighPE"
                value={inputs.historicalHighPE}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <button
              onClick={handleSaveToWatchlist}
              disabled={saving || !inputs.ticker}
              className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to Watchlist"}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-8 bg-accent/5 border border-accent/20 rounded-2xl flex flex-col justify-center">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Payback Time</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-6xl font-black tracking-tighter">
                  {result.years > PAYBACK_TIME_LIMIT ? `> ${PAYBACK_TIME_LIMIT}` : result.years}
                </p>
                <span className="text-xl font-medium text-muted-foreground uppercase tracking-widest">Years</span>
              </div>
              <div className={cn(
                "mt-4 w-fit px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                result.years <= 8 ? "bg-green-500/10 text-green-500" :
                result.years <= 10 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
              )}>
                {result.years <= 8 ? "Wonderful" : result.years <= 10 ? "Acceptable" : "Overpriced"}
              </div>
            </div>

            <div className="p-8 bg-card border border-border rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Valuation</h3>
                <span className="text-[10px] font-bold text-muted-foreground">{targetMOS}% MOS</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Sticker Price</p>
                  <p className="text-2xl font-bold tracking-tighter">${stickerPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-tighter">MOS Price</p>
                  <p className="text-2xl font-bold tracking-tighter text-accent">${mosPrice.toFixed(2)}</p>
                </div>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full bg-muted overflow-hidden mt-2",
                inputs.price <= mosPrice ? "bg-green-500/20" : "bg-muted"
              )}>
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    inputs.price <= mosPrice ? "bg-green-500" : "bg-accent/50"
                  )}
                  style={{ width: `${Math.min(100, (mosPrice / inputs.price) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                {inputs.price <= mosPrice ? "On Sale" : "Above MOS Price"}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Yearly Accumulation</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="p-4">Year</th>
                    <th className="p-4">Annual EPS</th>
                    <th className="p-4">Accumulated Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {result.breakdown.map((row) => (
                    <tr key={row.year} className="hover:bg-accent/5 transition-colors group">
                      <td className="p-4 font-medium text-muted-foreground group-hover:text-foreground">Year {row.year}</td>
                      <td className="p-4 group-hover:font-medium">${row.eps.toFixed(2)}</td>
                      <td className="p-4 font-bold text-accent group-hover:scale-105 transition-transform origin-left">
                        ${row.accumulated.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
