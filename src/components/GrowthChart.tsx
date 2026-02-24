"use client";

import { HistoricalData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GrowthChartProps {
  data: HistoricalData[];
  metric: "eps" | "revenue" | "equity";
  title: string;
}

export default function GrowthChart({ data, metric, title }: GrowthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
        No historical data available
      </div>
    );
  }

  const values = data.map((d) => d[metric]);
  const max = Math.max(...values, 1); // Avoid division by zero

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
        <span className="text-[10px] font-medium text-accent">10Y Trend</span>
      </div>
      <div className="h-24 flex items-end gap-1 group">
        {data.map((item, i) => {
          const height = (item[metric] / max) * 100;
          return (
            <div
              key={item.year}
              className="flex-1 flex flex-col items-center gap-1 group/bar"
            >
              <div
                className={cn(
                  "w-full bg-accent/20 rounded-t-sm transition-all duration-500 hover:bg-accent",
                  i === data.length - 1 ? "bg-accent/40" : ""
                )}
                style={{ height: `${Math.max(height, 5)}%` }}
              >
                <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[8px] px-1 rounded border border-border pointer-events-none whitespace-nowrap z-10">
                  {item[metric].toFixed(2)}
                </div>
              </div>
              <span className="text-[8px] text-muted-foreground scale-75 origin-top">
                {item.year.toString().slice(-2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
