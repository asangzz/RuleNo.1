"use client";

import { useState, useEffect } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT, calculateStickerPrice, calculateMOSPrice } from "@/lib/rule-one";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { UserSettings } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({ currency: "USD", targetMOS: 50 });
  const [ticker, setTicker] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputs, setInputs] = useState({
    name: "Custom Asset",
    price: 150,
    eps: 5,
    growthRate: 0.15,
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as UserSettings);
      }
    }
    fetchSettings();
  }, [user]);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);
  const stickerPrice = calculateStickerPrice(inputs.eps, inputs.growthRate, inputs.growthRate * 100 * 2);
  const mosPrice = calculateMOSPrice(stickerPrice, settings.targetMOS);
  const currencySymbol = getCurrencySymbol(settings.currency);

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
    setError(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs({
          name: res.data.name,
          price: res.data.currentPrice,
          eps: res.data.eps,
          growthRate: 0.15, // Default growth
        });
      } else {
        setError(res.error || "Failed to fetch stock data");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase() || "CUSTOM",
        name: inputs.name,
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.growthRate * 100 * 2, // Simple estimate
        createdAt: new Date().toISOString(),
      });
      router.push("/watchlist");
    } catch {
      setError("Failed to save to watchlist");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Payback Time</h2>
        <p className="text-muted-foreground">
          How many years of earnings does it take to get your money back?
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr,2fr]">
        <section className="space-y-6">
          <div className="p-6 bg-card border border-border rounded-2xl h-fit space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fetch Data</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ticker (e.g. AAPL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="flex-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleFetch}
                disabled={isFetching || !ticker}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
              >
                {isFetching ? "..." : "Fetch"}
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="p-6 bg-card border border-border rounded-2xl h-fit space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Asset Name</label>
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
              className="w-full mt-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save to Watchlist"}
            </button>
          </div>

          <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl space-y-3">
             <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Rule No. 1 Values</h3>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Sticker Price</p>
                   <p className="text-lg font-bold">{currencySymbol}{stickerPrice.toFixed(2)}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">MOS Price</p>
                   <p className="text-lg font-bold text-green-500">{currencySymbol}{mosPrice.toFixed(2)}</p>
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
