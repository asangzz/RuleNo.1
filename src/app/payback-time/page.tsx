"use client";

import { useState } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT } from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [inputs, setInputs] = useState({
    price: 150,
    eps: 5,
    growthRate: 0.15,
  });
  const [stockInfo, setStockInfo] = useState<{ name: string; ticker: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleFetch = async () => {
    if (!ticker) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs({
          price: res.data.currentPrice,
          eps: res.data.eps,
          growthRate: 0.15, // Default growth
        });
        setStockInfo({ name: res.data.name, ticker: res.data.ticker });
      } else {
        setError(res.error || "Failed to fetch stock info");
      }
    } catch (err) {
      console.error("Error fetching stock info:", err);
      setError("An unexpected error occurred");
    } finally {
      setFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !stockInfo) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: stockInfo.ticker,
        name: stockInfo.name,
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: 20, // Default
        createdAt: new Date().toISOString()
      });
      alert("Added to watchlist!");
    } catch (err) {
      console.error("Error saving to watchlist:", err);
      alert("Failed to save to watchlist.");
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
            {stockInfo && (
              <button
                onClick={handleSaveToWatchlist}
                disabled={saving}
                className="text-[10px] font-bold uppercase text-accent hover:underline disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Watchlist"}
              </button>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker Search</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !ticker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-bold hover:bg-secondary/80 disabled:opacity-50"
                >
                  {fetching ? "..." : "FETCH"}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
              {stockInfo && <p className="text-[10px] text-accent mt-1 font-bold">{stockInfo.name}</p>}
            </div>

            <div className="pt-4 border-t border-border space-y-4">
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
          </div>
        </div>
      </section>

        <section className="space-y-6">
          <div className="p-8 bg-accent/5 border border-accent/20 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Result</h3>
              <p className="text-6xl font-black mt-2 tracking-tighter">
                {result.years > PAYBACK_TIME_LIMIT ? `> ${PAYBACK_TIME_LIMIT}` : result.years}
                <span className="text-2xl ml-2 font-medium text-muted-foreground">Years</span>
              </p>
            </div>
            <div className={cn(
              "px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider",
              result.years <= 8 ? "bg-green-500/10 text-green-500" :
              result.years <= 10 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
            )}>
              {result.years <= 8 ? "Wonderful" : result.years <= 10 ? "Acceptable" : "Overpriced"}
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
