"use client";

import { useState, useEffect } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT, DEFAULT_GROWTH_RATE, DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";
import { cn, CURRENCY_SYMBOLS } from "@/lib/utils";
import { fetchStockInfo } from "../watchlist/actions";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { UserSettings } from "@/lib/types";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settings, setSettings] = useState<UserSettings>({
    currency: "USD",
    targetMOS: DEFAULT_MOS_PERCENTAGE,
  });

  const [inputs, setInputs] = useState({
    name: "Custom Analysis",
    price: 150,
    eps: 5,
    growthRate: DEFAULT_GROWTH_RATE,
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as UserSettings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    loadSettings();
  }, [user]);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || "$";

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === "name" ? value : (parseFloat(value) || 0),
    }));
  };

  const handleFetch = async () => {
    if (!ticker) return;
    setIsFetching(true);
    setMessage(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs({
          name: res.data.name,
          price: res.data.currentPrice,
          eps: res.data.eps,
          growthRate: inputs.growthRate, // Keep current growth rate or set to default
        });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to fetch stock info" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while fetching" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase() || "CUSTOM",
        name: inputs.name,
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.growthRate * 100 * 2, // Default heuristic
        createdAt: new Date().toISOString(),
      });
      setMessage({ type: "success", text: "Saved to watchlist!" });
    } catch (error) {
      console.error("Error saving:", error);
      setMessage({ type: "error", text: "Failed to save to watchlist" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Payback Time</h2>
          <p className="text-muted-foreground">
            How many years of earnings does it take to get your money back?
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ticker (e.g. AAPL)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent w-32"
          />
          <button
            onClick={handleFetch}
            disabled={isFetching || !ticker}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            {isFetching ? "..." : "Fetch"}
          </button>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        <section className="space-y-6 p-6 bg-card border border-border rounded-2xl h-fit">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Company/Analysis Name</label>
              <input
                type="text"
                name="name"
                value={inputs.name}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current Price ({currencySymbol})</label>
              <input
                type="number"
                name="price"
                value={inputs.price}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current EPS ({currencySymbol})</label>
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

          <button
            onClick={handleSaveToWatchlist}
            disabled={isSaving || !user}
            className="w-full py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg font-bold hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save to Watchlist"}
          </button>

          {message && (
            <p className={cn("text-xs text-center font-medium", message.type === "success" ? "text-green-500" : "text-red-500")}>
              {message.text}
            </p>
          )}
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
                      <td className="p-4 group-hover:font-medium">{currencySymbol}{row.eps.toFixed(2)}</td>
                      <td className="p-4 font-bold text-accent group-hover:scale-105 transition-transform origin-left">
                        {currencySymbol}{row.accumulated.toFixed(2)}
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
