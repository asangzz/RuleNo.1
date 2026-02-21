"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  label: string;
  valueType: "eps" | "revenue";
}

export function GrowthGrid({ data, label, valueType }: GrowthGridProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-border rounded-lg">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No data available</p>
      </div>
    );
  }

  // Take last 10 years and sort ascending for the grid (left to right)
  const displayData = [...data].sort((a, b) => a.year - b.year).slice(-10);

  const values = displayData.map(d => valueType === "eps" ? d.eps : d.revenue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const formatValue = (val: number) => {
    if (valueType === "revenue") {
      if (val >= 1e12) return (val / 1e12).toFixed(1) + "T";
      if (val >= 1e9) return (val / 1e9).toFixed(1) + "B";
      if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
      return val.toLocaleString();
    }
    return val.toFixed(2);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</h4>
        <span className="text-[8px] text-muted-foreground font-medium uppercase">Last {displayData.length} Years</span>
      </div>
      <div className="flex gap-1.5 h-10">
        {displayData.map((item) => {
          const val = valueType === "eps" ? item.eps : item.revenue;
          const range = maxValue - minValue;
          const percentage = range === 0 ? 1 : (val - minValue) / range;

          return (
            <div
              key={item.year}
              className="group relative flex-1"
            >
              <div
                className={cn(
                  "w-full h-full rounded-sm transition-all duration-500 cursor-help",
                  val > 0 ? "bg-accent" : "bg-red-500/50"
                )}
                style={{
                  opacity: 0.1 + (percentage * 0.9)
                }}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl">
                <span className="font-bold">{item.year}: </span>
                <span>{valueType === 'eps' ? '$' : ''}{formatValue(val)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
