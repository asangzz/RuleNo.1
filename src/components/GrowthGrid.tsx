"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  metric: keyof HistoricalData;
  label: string;
}

export default function GrowthGrid({ data, metric, label }: GrowthGridProps) {
  // Sort data by year ascending
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  // Calculate growth rates
  const growthRates = sortedData.map((item, i) => {
    if (i === 0) return 0;
    const prev = sortedData[i - 1][metric] as number;
    const curr = item[metric] as number;
    if (prev <= 0) return 0;
    return (curr - prev) / prev;
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</h4>
        <span className="text-[10px] text-muted-foreground">10Y HISTORY</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {sortedData.slice(-10).map((item, i) => {
          const actualIndex = sortedData.length - Math.min(10, sortedData.length) + i;
          const growth = growthRates[actualIndex];

          return (
            <div
              key={item.year}
              className={cn(
                "h-8 rounded-sm transition-all hover:scale-110 cursor-help flex items-center justify-center text-[8px] font-bold",
                growth > 0.15 ? "bg-green-500 text-green-950" :
                growth > 0.10 ? "bg-green-500/60 text-green-900" :
                growth > 0 ? "bg-green-500/20 text-green-400" :
                growth === 0 ? "bg-slate-800 text-muted-foreground" : "bg-red-500/20 text-red-400"
              )}
              title={`${item.year}: ${growth > 0 ? '+' : ''}${(growth * 100).toFixed(1)}%`}
            >
              {item.year.toString().slice(-2)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
