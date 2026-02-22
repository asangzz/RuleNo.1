"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  metric: keyof Omit<HistoricalData, 'date'>;
  label: string;
}

export default function GrowthGrid({ data, metric, label }: GrowthGridProps) {
  if (!data || data.length === 0) return null;

  // Calculate year-over-year growth
  const growthRates = data.map((item, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1][metric] as number;
    const current = item[metric] as number;
    if (prev === 0) return 0;
    return (current - prev) / Math.abs(prev);
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</span>
        <span className="text-[10px] font-medium text-muted-foreground">Last {data.length} Years</span>
      </div>
      <div className="flex gap-1 h-8">
        {data.map((item, i) => {
          const growth = growthRates[i];
          const val = item[metric] as number;

          return (
            <div
              key={item.date}
              className={cn(
                "flex-1 rounded-sm transition-all hover:scale-105 cursor-help relative group",
                i === 0 ? "bg-slate-800" :
                growth >= 0.15 ? "bg-green-500" :
                growth > 0 ? "bg-green-500/40" :
                growth > -0.15 ? "bg-red-500/40" : "bg-red-500"
              )}
            >
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-popover border border-border px-2 py-1 rounded shadow-xl text-[10px] whitespace-nowrap">
                  <p className="font-bold">{item.date}</p>
                  <p>{label}: {val.toLocaleString()}</p>
                  {i > 0 && <p className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                    Growth: {(growth * 100).toFixed(1)}%
                  </p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
