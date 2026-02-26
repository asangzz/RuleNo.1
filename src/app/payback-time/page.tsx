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
import { fetchStockInfo } from "../watchlist/actions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [targetMOS, setTargetMOS] = useState(50);
  const [inputs, setInputs] = useState({
    name: "",
    price: 150,
    eps: 5,
    growthRate: 0.15,
    historicalHighPE: 20
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      const settingsRef = doc(db, "users", user.uid, "settings", "profile");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setTargetMOS(settingsSnap.data().targetMOS);
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
      [name]: name === "name" ? value : (parseFloat(value) || 0),
    }));
  };

  const handleFetch = async () => {
    if (!ticker) return;
    setFetching(true);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        setInputs(prev => ({
          ...prev,
          name: res.data.name,
          price: res.data.currentPrice,
          eps: res.data.eps
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !ticker) return;
    setSaving(true);
    setMessage(null);
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
      setMessage({ type: "success", text: "Added to watchlist!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to add to watchlist." });
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
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
            {user && (
              <button
                onClick={handleSaveToWatchlist}
                disabled={saving || !ticker}
                className="text-[10px] font-bold uppercase text-accent hover:underline disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Watchlist"}
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker Fetch</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="AAPL"
                  className="flex-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !ticker}
                  className="px-3 bg-secondary text-secondary-foreground rounded-md text-xs font-bold hover:bg-secondary/80 disabled:opacity-50"
                >
                  {fetching ? "..." : "Fetch"}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="price" className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current Price ($)</label>
              <input
                id="price"
                type="number"
                name="price"
                value={inputs.price}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label htmlFor="eps" className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Current EPS ($)</label>
              <input
                id="eps"
                type="number"
                name="eps"
                value={inputs.eps}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label htmlFor="growthRate" className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Estimated Growth (decimal)</label>
              <input
                id="growthRate"
                type="number"
                step="0.01"
                name="growthRate"
                value={inputs.growthRate}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div>
              <label htmlFor="historicalHighPE" className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Historical High PE</label>
              <input
                id="historicalHighPE"
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
          {message && (
            <div className={cn(
              "p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2",
              message.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {message.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sticker Price</h3>
              <p className="text-2xl font-bold mt-1">${stickerPrice.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MOS Price ({targetMOS}%)</h3>
              <p className="text-2xl font-bold mt-1 text-green-500">${mosPrice.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-accent/10 border border-accent/20 rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest">Future PE</h3>
              <p className="text-2xl font-bold mt-1">{futurePE.toFixed(1)}</p>
            </div>
          </div>

          <div className="p-8 bg-accent/5 border border-accent/20 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Payback Time</h3>
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
