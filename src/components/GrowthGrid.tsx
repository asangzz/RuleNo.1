"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  title: string;
  dataKey: keyof HistoricalData;
}

export default function GrowthGrid({ data, title, dataKey }: GrowthGridProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
        {data.map((item, index) => {
          const value = item[dataKey] as number;
          const prevValue = index > 0 ? (data[index - 1][dataKey] as number) : null;
          const isGrowth = prevValue !== null ? value > prevValue : true;

          return (
            <div
              key={item.year}
              className={cn(
                "h-12 flex flex-col items-center justify-center rounded-md border border-border/50 transition-all hover:scale-105 cursor-default",
                isGrowth ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
              )}
              title={`${item.year}: ${value}`}
            >
              <span className="text-[10px] text-muted-foreground font-medium">{item.year}</span>
              <span className={cn(
                "text-xs font-bold",
                isGrowth ? "text-green-500" : "text-red-500"
              )}>
                {typeof value === 'number' ? (value > 1000 ? (value / 1e9).toFixed(1) + 'B' : value.toFixed(2)) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
