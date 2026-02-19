"use client";

import { GrowthData, HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: GrowthData;
  className?: string;
}

export default function GrowthGrid({ data, className }: GrowthGridProps) {
  const years = Array.from(new Set([
    ...data.eps.map(d => d.year),
    ...data.revenue.map(d => d.year),
    ...data.equity.map(d => d.year),
  ])).sort((a, b) => a - b);

  const renderRow = (label: string, items: HistoricalData[], format: (v: number) => string) => {
    return (
      <div className="group flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
        <div className="w-24 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">
            {label}
          </span>
        </div>
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {years.map((year, idx) => {
            const item = items.find(d => d.year === year);
            const prevItem = idx > 0 ? items.find(d => d.year === years[idx - 1]) : null;

            let growth = 0;
            if (item && prevItem && prevItem.value !== 0) {
              growth = ((item.value - prevItem.value) / Math.abs(prevItem.value)) * 100;
            }

            const isPositive = growth > 10;
            const isNegative = growth < 0;

            return (
              <div key={year} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div
                  className={cn(
                    "w-full h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all border",
                    !item ? "bg-muted/10 border-border/20 text-muted-foreground" :
                    isPositive ? "bg-green-500/10 border-green-500/20 text-green-500" :
                    isNegative ? "bg-red-500/10 border-red-500/20 text-red-500" :
                    "bg-blue-500/10 border-blue-500/20 text-blue-500"
                  )}
                >
                  {item ? format(item.value) : "N/A"}
                </div>
                <span className="text-[8px] font-medium text-muted-foreground">{year}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-6 space-y-2", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold tracking-tight">Historical Growth</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{">"}10% Growth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Steady</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Declining</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {renderRow("EPS", data.eps, (v) => `$${v.toFixed(2)}`)}
        {renderRow("Revenue", data.revenue, (v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`)}
        {renderRow("Equity", data.equity, (v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`)}
        {renderRow("PE High", data.peHigh, (v) => v.toFixed(1))}
        {renderRow("PE Low", data.peLow, (v) => v.toFixed(1))}
      </div>
    </div>
  );
}
