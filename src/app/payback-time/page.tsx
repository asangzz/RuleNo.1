"use client";

import { useState } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT } from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputs, setInputs] = useState({
    price: 150,
    eps: 5,
    growthRate: 0.15,
  });

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const handleFetchInfo = async () => {
    if (!ticker) return;
    setFetching(true);
    setError(null);
    try {
      const result = await fetchStockInfo(ticker);
      if (result.success && result.data) {
        setInputs({
          ...inputs,
          price: result.data.currentPrice,
          eps: result.data.eps,
        });
      } else {
        setError(result.error || "Failed to fetch stock info");
      }
    } catch {
      setError("An error occurred while fetching stock data");
    } finally {
      setFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !ticker) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase(),
        name: ticker.toUpperCase(), // Default to ticker if name not available
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.growthRate * 100 * 2, // Default Rule No. 1 estimate
        createdAt: new Date().toISOString()
      });
      router.push("/watchlist");
    } catch (err) {
      console.error("Error saving to watchlist:", err);
      setError("Failed to save to watchlist");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
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
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker (optional fetch)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={handleFetchInfo}
                  disabled={fetching || !ticker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-secondary/80 disabled:opacity-50"
                >
                  {fetching ? "..." : "Fetch"}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
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

            {user && (
              <button
                onClick={handleSaveToWatchlist}
                disabled={saving || !ticker}
                className="w-full mt-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : "Save to Watchlist"}
              </button>
            )}
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
