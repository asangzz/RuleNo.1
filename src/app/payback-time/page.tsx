"use client";

import { useState, useEffect } from "react";
import {
  calculatePaybackTime,
  PAYBACK_TIME_LIMIT,
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [targetMOS, setTargetMOS] = useState(50);
  const [inputs, setInputs] = useState({
    name: "",
    price: 150,
    eps: 5,
    growthRate: 0.15,
    historicalHighPE: 20,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      try {
        const settingsRef = doc(db, "users", user.uid, "settings", "profile");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setTargetMOS(settingsSnap.data().targetMOS || 50);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    }
    fetchSettings();
  }, [user]);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);
  const futurePE = estimateFuturePE(inputs.growthRate, inputs.historicalHighPE);
  const stickerPrice = calculateStickerPrice(inputs.eps, inputs.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseFloat(value) || 0,
    }));
  };

  const handleFetch = async () => {
    if (!ticker) return;
    setIsFetching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs((prev) => ({
          ...prev,
          name: res.data!.name,
          price: res.data!.currentPrice,
          eps: res.data!.eps,
        }));
        setSuccess(`Fetched data for ${res.data.name}`);
      } else {
        setError(res.error || "Failed to fetch stock info");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !ticker) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase(),
        name: inputs.name || ticker.toUpperCase(),
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.historicalHighPE,
        createdAt: new Date().toISOString()
      });
      setSuccess("Added to watchlist!");
    } catch {
      setError("Failed to save to watchlist");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Payback Time</h2>
          <p className="text-muted-foreground">
            How many years of earnings does it take to get your money back?
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Ticker (e.g. AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent w-32 uppercase font-bold"
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={isFetching || !ticker}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
          >
            {isFetching ? "..." : "Fetch"}
          </button>
        </div>
      </header>

      {(error || success) && (
        <div className={cn(
          "p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2",
          error ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
        )}>
          {error || success}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        <section className="space-y-6 p-6 bg-card border border-border rounded-2xl h-fit">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
            {user && (
              <button
                onClick={handleSaveToWatchlist}
                disabled={isSaving || !ticker}
                className="text-[10px] font-bold text-accent hover:underline uppercase tracking-tighter disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save to Watchlist"}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Company Name</label>
              <input
                type="text"
                name="name"
                value={inputs.name}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
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
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-8 bg-accent/5 border border-accent/20 rounded-2xl flex flex-col justify-center">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Payback Time</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black mt-2 tracking-tighter">
                  {result.years > PAYBACK_TIME_LIMIT ? `> ${PAYBACK_TIME_LIMIT}` : result.years}
                </p>
                <span className="text-xl font-medium text-muted-foreground">Years</span>
              </div>
              <div className={cn(
                "mt-4 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider w-fit",
                result.years <= 8 ? "bg-green-500/10 text-green-500" :
                result.years <= 10 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
              )}>
                {result.years <= 8 ? "Wonderful" : result.years <= 10 ? "Acceptable" : "Overpriced"}
              </div>
            </div>

            <div className="p-8 bg-card border border-border rounded-2xl flex flex-col justify-center space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sticker Price</h3>
                <p className="text-3xl font-bold tracking-tight">${stickerPrice.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">MOS Price</h3>
                <p className={cn(
                  "text-3xl font-bold tracking-tight",
                  inputs.price <= mosPrice ? "text-green-500" : "text-foreground"
                )}>
                  ${mosPrice.toFixed(2)}
                </p>
              </div>
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
