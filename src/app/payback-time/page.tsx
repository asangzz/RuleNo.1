"use client";

import { useState, useEffect, useCallback } from "react";
import {
  calculatePaybackTime,
  PAYBACK_TIME_LIMIT,
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE,
  DEFAULT_MOS_PERCENTAGE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "@/app/watchlist/actions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [targetMOS, setTargetMOS] = useState(DEFAULT_MOS_PERCENTAGE);

  const [inputs, setInputs] = useState({
    name: "",
    price: 150,
    eps: 5,
    growthRate: 0.15,
    highPE: 15,
  });

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "settings", "profile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTargetMOS(docSnap.data().targetMOS || DEFAULT_MOS_PERCENTAGE);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);
  const futurePE = estimateFuturePE(inputs.growthRate, inputs.highPE);
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
    setFetching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs((prev) => ({
          ...prev,
          name: res.data.name,
          price: res.data.currentPrice,
          eps: res.data.eps,
        }));
        setSuccess(`Fetched data for ${res.data.name}`);
      } else {
        setError(res.error || "Failed to fetch stock info");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError("You must be logged in to save to watchlist");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase() || "MANUAL",
        name: inputs.name || "Manual Entry",
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.highPE,
        createdAt: new Date().toISOString()
      });
      setSuccess("Successfully saved to watchlist!");
      setTimeout(() => router.push("/watchlist"), 1500);
    } catch (err) {
      setError("Failed to save to watchlist");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
            className="bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent w-32 uppercase"
          />
          <button
            onClick={handleFetch}
            disabled={fetching || !ticker}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {fetching ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-sm">
          {success}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
        <section className="space-y-6 p-6 bg-card border border-border rounded-2xl h-fit">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={inputs.price}
                  onChange={handleInputChange}
                  className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">EPS ($)</label>
                <input
                  type="number"
                  name="eps"
                  value={inputs.eps}
                  onChange={handleInputChange}
                  className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Growth (decimal)</label>
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
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Historical High PE</label>
                <input
                  type="number"
                  name="highPE"
                  value={inputs.highPE}
                  onChange={handleInputChange}
                  className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !user}
            className="w-full mt-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-secondary/80 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Save to Watchlist"}
          </button>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl flex flex-col justify-center">
              <h3 className="text-[10px] font-semibold text-accent uppercase tracking-widest">Payback Time</h3>
              <p className="text-4xl font-black mt-1 tracking-tighter">
                {result.years > PAYBACK_TIME_LIMIT ? `> ${PAYBACK_TIME_LIMIT}` : result.years}
                <span className="text-lg ml-1 font-medium text-muted-foreground">Yrs</span>
              </p>
              <div className={cn(
                "mt-2 px-2 py-0.5 rounded-full font-bold text-[8px] uppercase tracking-wider w-fit",
                result.years <= 8 ? "bg-green-500/10 text-green-500" :
                result.years <= 10 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
              )}>
                {result.years <= 8 ? "Wonderful" : result.years <= 10 ? "Acceptable" : "Overpriced"}
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sticker Price</h3>
              <p className="text-3xl font-bold mt-1 tracking-tight">${stickerPrice.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Fair Value (15% ROI)</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">MOS Price ({targetMOS}%)</h3>
              <p className={cn(
                "text-3xl font-bold mt-1 tracking-tight",
                inputs.price <= mosPrice ? "text-green-500" : "text-foreground"
              )}>
                ${mosPrice.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Target Margin of Safety</p>
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
