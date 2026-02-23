"use client";

import { useState, useEffect } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT, calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "../watchlist/actions";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [targetMOS, setTargetMOS] = useState(50);

  const [inputs, setInputs] = useState({
    name: "",
    price: 150,
    eps: 5,
    growthRate: 0.15,
    historicalHighPE: 20
  });

  useEffect(() => {
    async function loadUserSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTargetMOS(docSnap.data().targetMOS || 50);
        }
      } catch (error) {
        console.error("Error loading user settings:", error);
      }
    }
    loadUserSettings();
  }, [user]);

  const futurePE = estimateFuturePE(inputs.growthRate, inputs.historicalHighPE);
  const stickerPrice = calculateStickerPrice(inputs.eps, inputs.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === "name" ? value : (parseFloat(value) || 0),
    }));
  };

  const handleFetchTicker = async () => {
    if (!ticker) return;
    setIsFetching(true);
    try {
      const result = await fetchStockInfo(ticker);
      if (result.success && result.data) {
        setInputs(prev => ({
          ...prev,
          name: result.data.name,
          price: result.data.currentPrice,
          eps: result.data.eps,
        }));
      }
    } catch (error) {
      console.error("Error fetching ticker:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user || !ticker) return;
    setIsSaving(true);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving to watchlist:", error);
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
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="TICKER"
            className="w-24 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent uppercase"
          />
          <button
            onClick={handleFetchTicker}
            disabled={isFetching || !ticker}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Historical High PE</label>
              <input
                type="number"
                name="historicalHighPE"
                value={inputs.historicalHighPE}
                onChange={handleInputChange}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          {user && (
            <button
              onClick={handleSaveToWatchlist}
              disabled={isSaving || !ticker}
              className="w-full py-2 mt-4 bg-accent/10 text-accent border border-accent/20 rounded-lg font-bold text-sm hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save to Watchlist"}
            </button>
          )}
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Payback Time</h3>
              <p className="text-4xl font-black mt-2 tracking-tighter">
                {result.years > PAYBACK_TIME_LIMIT ? `> ${PAYBACK_TIME_LIMIT}` : result.years}
                <span className="text-xl ml-1 font-medium text-muted-foreground text-nowrap">Years</span>
              </p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sticker Price</h3>
              <p className="text-4xl font-black mt-2 tracking-tighter">
                ${stickerPrice.toFixed(2)}
              </p>
            </div>
            <div className="p-6 bg-card border border-border rounded-2xl">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">MOS Price ({targetMOS}%)</h3>
              <p className={cn(
                "text-4xl font-black mt-2 tracking-tighter",
                inputs.price <= mosPrice ? "text-green-500" : "text-foreground"
              )}>
                ${mosPrice.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Yearly Accumulation</h3>
              <span className={cn(
                "px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                result.years <= 8 ? "bg-green-500/10 text-green-500" :
                result.years <= 10 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
              )}>
                {result.years <= 8 ? "Wonderful" : result.years <= 10 ? "Acceptable" : "Overpriced"}
              </span>
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
