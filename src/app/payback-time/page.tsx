"use client";

import { useState } from "react";
import {
  calculatePaybackTime,
  PAYBACK_TIME_LIMIT,
  DEFAULT_GROWTH_RATE,
  DEFAULT_HIGH_PE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { fetchStockInfo } from "@/app/watchlist/actions";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [inputs, setInputs] = useState({
    ticker: "",
    price: 150,
    eps: 5,
    growthRate: DEFAULT_GROWTH_RATE,
  });
  const [companyName, setCompanyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === "ticker" ? value.toUpperCase() : parseFloat(value) || 0,
    }));
  };

  const handleFetch = async () => {
    if (!inputs.ticker) return;
    setIsFetching(true);
    setSaveMessage("");
    try {
      const res = await fetchStockInfo(inputs.ticker);
      if (res.success && res.data) {
        setInputs(prev => ({
          ...prev,
          price: res.data.currentPrice,
          eps: res.data.eps,
        }));
        setCompanyName(res.data.name);
      }
    } catch (error) {
      console.error("Error fetching stock info:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !inputs.ticker) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      // Default historicalHighPE based on growth rate, capped at DEFAULT_HIGH_PE if not fetched
      const historicalHighPE = Math.min(DEFAULT_HIGH_PE, Math.max(10, inputs.growthRate * 100 * 2));

      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: inputs.ticker,
        name: companyName || inputs.ticker,
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: historicalHighPE,
        createdAt: new Date().toISOString()
      });
      setSaveMessage("Saved to watchlist!");
    } catch (error) {
      console.error("Error saving to watchlist:", error);
      setSaveMessage("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Payback Time</h2>
          <p className="text-muted-foreground">
            How many years of earnings does it take to get your money back?
          </p>
        </div>
        {user && inputs.ticker && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSaveToWatchlist}
              disabled={isSaving}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save to Watchlist"}
            </button>
            {saveMessage && (
              <p className={cn("text-[10px] font-bold uppercase", saveMessage.includes("Saved") ? "text-green-500" : "text-red-500")}>
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        <section className="space-y-6 p-6 bg-card border border-border rounded-2xl h-fit shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker (Optional)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  name="ticker"
                  value={inputs.ticker}
                  onChange={handleInputChange}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all uppercase"
                />
                <button
                  onClick={handleFetch}
                  disabled={isFetching || !inputs.ticker}
                  className="px-3 bg-secondary text-secondary-foreground rounded-md text-xs font-bold uppercase hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  {isFetching ? "..." : "Fetch"}
                </button>
              </div>
              {companyName && <p className="text-[10px] text-accent mt-1 font-medium">{companyName}</p>}
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
