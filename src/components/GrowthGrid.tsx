"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
}

export function GrowthGrid({ data }: GrowthGridProps) {
  if (!data || data.length < 2) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
        Insufficient historical data for growth analysis.
      </div>
    );
  }

  // Sort by year ascending for growth calculation
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  const calculateGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return (current - previous) / Math.abs(previous);
  };

  const metrics = [
    { label: "EPS", key: "eps" as const },
    { label: "Rev", key: "revenue" as const },
    { label: "Eq", key: "equity" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historical Growth</h4>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">{">"}15%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">0-15%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">{"<"}0%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-grid grid-cols-[auto_repeat(10,minmax(40px,1fr))] gap-1">
          {/* Years Row */}
          <div className="h-8"></div>
          {sortedData.slice(1).map((item) => (
            <div key={item.year} className="h-8 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {item.year.toString().slice(-2)}&apos;
            </div>
          ))}

          {/* Metrics Rows */}
          {metrics.map((metric) => (
            <>
              <div key={metric.label} className="h-10 flex items-center pr-3 text-[10px] font-bold uppercase text-muted-foreground border-r border-border">
                {metric.label}
              </div>
              {sortedData.slice(1).map((item, idx) => {
                const prev = sortedData[idx];
                const growth = calculateGrowth(item[metric.key], prev[metric.key]);
                const growthPct = (growth * 100).toFixed(0);

                return (
                  <div
                    key={`${item.year}-${metric.key}`}
                    className={cn(
                      "h-10 flex items-center justify-center rounded-md border border-white/5 text-[10px] font-black transition-all hover:scale-105 cursor-default",
                      growth >= 0.15 ? "bg-green-500/20 text-green-500" :
                      growth > 0 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    )}
                    title={`${growthPct}% growth`}
                  >
                    {growthPct}%
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
