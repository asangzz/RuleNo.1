"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  type: "eps" | "revenue" | "equity";
  label: string;
}

export default function GrowthGrid({ data, type, label }: GrowthGridProps) {
  // Sort data ascending by year for growth calculation
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</h4>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sortedData.map((item, i) => {
          const value = item[type];
          const prevValue = i > 0 ? sortedData[i - 1][type] : null;
          const growth = prevValue ? (value - prevValue) / Math.abs(prevValue) : 0;

          let colorClass = "bg-slate-800";
          if (prevValue !== null) {
            if (growth > 0.15) colorClass = "bg-green-500";
            else if (growth > 0.05) colorClass = "bg-green-500/60";
            else if (growth > 0) colorClass = "bg-green-500/30";
            else if (growth < 0) colorClass = "bg-red-500/40";
          }

          return (
            <div key={item.year} className="flex-1 min-w-[40px] group relative">
              <div
                className={cn(
                  "h-8 w-full rounded-sm transition-all hover:scale-105 cursor-help",
                  colorClass
                )}
              />
              <div className="mt-1 text-[8px] font-bold text-center text-muted-foreground">
                {String(item.year).slice(-2)}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
                <p className="font-bold">{item.year}</p>
                <p>{type.toUpperCase()}: {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                {prevValue !== null && (
                  <p className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                    Growth: {(growth * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
