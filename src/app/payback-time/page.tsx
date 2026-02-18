"use client";

import { useState, useMemo } from "react";
import { calculatePaybackTimeBreakdown, PAYBACK_TIME_LIMIT } from "@/lib/rule-one";
import { cn } from "@/lib/utils";

export default function PaybackTimePage() {
  const [price, setPrice] = useState<number>(150);
  const [eps, setEps] = useState<number>(5.0);
  const [growth, setGrowth] = useState<number>(0.15);

  const breakdown = useMemo(() => {
    return calculatePaybackTimeBreakdown(price, eps, growth);
  }, [price, eps, growth]);

  const lastYear = breakdown.length > 0 ? breakdown[breakdown.length - 1] : null;
  const hasPaidBack = lastYear ? lastYear.accumulatedEarnings >= price : false;
  const paybackTime = hasPaidBack ? (lastYear?.year || 0) : 0;
  const isGoodInvestment = hasPaidBack && paybackTime <= 8; // Rule No. 1: Payback time <= 8 years is ideal

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payback Time Calculator</h2>
        <p className="text-muted-foreground">
          How many years will it take for the company&apos;s earnings to pay you back?
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Price ($)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current EPS ($)</label>
          <input
            type="number"
            value={eps}
            onChange={(e) => setEps(parseFloat(e.target.value) || 0)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Growth Rate (%)</label>
          <input
            type="number"
            value={growth * 100}
            onChange={(e) => setGrowth((parseFloat(e.target.value) || 0) / 100)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          />
        </div>
      </div>

      <div className="p-8 bg-card border border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estimated Payback Time</h3>
        <div className={cn(
          "text-7xl font-black",
          isGoodInvestment ? "text-green-500" : "text-accent"
        )}>
          {hasPaidBack ? paybackTime : `>${PAYBACK_TIME_LIMIT}`} <span className="text-2xl font-bold">YEARS</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          {isGoodInvestment
            ? "Excellent! This business pays for itself in less than 8 years, meeting the Rule No. 1 gold standard."
            : hasPaidBack
              ? "This business takes longer than 8 years to pay back. Look for higher growth or a better entry price."
              : `This business does not pay for itself within ${PAYBACK_TIME_LIMIT} years at the current growth rate.`}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Earnings Growth Trajectory</h3>
        <div className="overflow-hidden border border-border rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-muted-foreground uppercase text-[10px] font-bold tracking-tighter">
              <tr>
                <th className="px-6 py-4">Year</th>
                <th className="px-6 py-4">Annual EPS</th>
                <th className="px-6 py-4">Accumulated Earnings</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdown.map((row) => (
                <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium">Year {row.year}</td>
                  <td className="px-6 py-4 text-muted-foreground">${row.eps.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold">${row.accumulatedEarnings.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {row.accumulatedEarnings >= price ? (
                      <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-black uppercase">Paid Back</span>
                    ) : (
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-1000"
                          style={{ width: `${price > 0 ? Math.min(100, (row.accumulatedEarnings / price) * 100) : 0}%` }}
                        ></div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
