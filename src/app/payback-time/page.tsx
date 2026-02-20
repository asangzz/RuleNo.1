"use client";

import { useState } from "react";
import { calculatePaybackTime, PAYBACK_TIME_LIMIT, calculateStickerPrice, calculateMOSPrice, estimateFuturePE } from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchStockInfo } from "../watchlist/actions";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PaybackTimePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [inputs, setInputs] = useState({
    name: "Custom Calculation",
    price: 150,
    eps: 5,
    growthRate: 0.15,
    historicalHighPE: 20
  });

  const result = calculatePaybackTime(inputs.price, inputs.eps, inputs.growthRate);
  const futurePE = estimateFuturePE(inputs.growthRate, inputs.historicalHighPE);
  const stickerPrice = calculateStickerPrice(inputs.eps, inputs.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice);

  const handleFetch = async () => {
    if (!ticker) return;
    setIsFetching(true);
    setMessage(null);
    try {
      const res = await fetchStockInfo(ticker);
      if (res.success && res.data) {
        // Estimate growth rate from historical EPS if available
        let estimatedGrowth = 0.15;
        if (res.historical && res.historical.length >= 5) {
          const valid = res.historical.filter(h => h.eps > 0);
          if (valid.length >= 2) {
            const first = valid[0].eps;
            const last = valid[valid.length - 1].eps;
            const years = valid.length - 1;
            estimatedGrowth = Math.pow(last / first, 1 / years) - 1;
            // Cap at a reasonable 30% and floor at 5% for safety
            estimatedGrowth = Math.min(0.3, Math.max(0.05, estimatedGrowth));
          }
        }

        setInputs({
          name: res.data.name,
          price: res.data.currentPrice,
          eps: res.data.eps,
          growthRate: parseFloat(estimatedGrowth.toFixed(3)),
          historicalHighPE: res.avgHighPE || 20
        });
      } else {
        setMessage({ type: 'error', text: res.error || "Failed to fetch stock info" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "An error occurred" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ticker: ticker.toUpperCase() || "CUSTOM",
        name: inputs.name,
        currentPrice: inputs.price,
        eps: inputs.eps,
        growthRate: inputs.growthRate,
        historicalHighPE: inputs.historicalHighPE,
        createdAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: "Added to watchlist!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "Failed to save" });
    } finally {
      setIsSaving(false);
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ticker (Optional)</label>
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
                  disabled={isFetching || !ticker}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-[10px] font-bold uppercase disabled:opacity-50"
                >
                  {isFetching ? "..." : "Fetch"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Company Name</label>
              <input
                type="text"
                name="name"
                value={inputs.name}
                onChange={(e) => setInputs(prev => ({ ...prev, name: e.target.value }))}
                className="w-full mt-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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
                className="w-full mt-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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
                className="w-full mt-1 bg-background border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <button
              onClick={handleSaveToWatchlist}
              disabled={isSaving}
              className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save to Watchlist"}
            </button>

            {message && (
              <p className={cn(
                "text-[10px] font-bold text-center uppercase tracking-tight",
                message.type === 'success' ? "text-green-500" : "text-red-500"
              )}>
                {message.text}
              </p>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sticker Price</h4>
            <p className="text-xl font-bold mt-1">${stickerPrice.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MOS Price</h4>
            <p className={cn("text-xl font-bold mt-1", inputs.price <= mosPrice ? "text-green-500" : "text-foreground")}>
              ${mosPrice.toFixed(2)}
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
