"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
}

export const GrowthGrid = ({ data }: GrowthGridProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/10">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">No historical data available</p>
      </div>
    );
  }

  const metrics = [
    { label: "EPS", key: "eps" as keyof HistoricalData },
    { label: "REV", key: "revenue" as keyof HistoricalData },
    { label: "EQTY", key: "equity" as keyof HistoricalData },
  ];

  const calculateGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[30px_1fr] gap-2">
        <div></div>
        <div className="flex justify-between px-1">
          {data.map((d) => (
            <span key={d.year} className="text-[8px] font-bold text-muted-foreground uppercase">
              {d.year.toString().slice(-2)}
            </span>
          ))}
        </div>
      </div>

      {metrics.map((metric) => (
        <div key={metric.key} className="grid grid-cols-[30px_1fr] gap-2 items-center">
          <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">
            {metric.label}
          </span>
          <div className="flex gap-1">
            {data.map((d, i) => {
              const val = d[metric.key] as number;
              const prev = i > 0 ? (data[i - 1][metric.key] as number) : undefined;
              const growth = prev !== undefined ? calculateGrowth(val, prev) : 0;

              return (
                <div
                  key={d.year}
                  className={cn(
                    "h-6 flex-1 rounded-sm transition-all hover:scale-110 cursor-help relative group",
                    prev === undefined ? "bg-slate-800" :
                    growth >= 15 ? "bg-green-500" :
                    growth >= 10 ? "bg-green-500/60" :
                    growth > 0 ? "bg-green-500/30" :
                    growth === 0 ? "bg-slate-800" :
                    growth > -10 ? "bg-red-500/30" : "bg-red-500"
                  )}
                  title={`${metric.label} ${d.year}: ${typeof val === 'number' ? val.toLocaleString() : 'N/A'} (${growth.toFixed(1)}%)`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {d.year}: {val.toLocaleString()} ({growth > 0 ? "+" : ""}{growth.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
