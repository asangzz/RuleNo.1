"use client";

import { HistoricalData } from "@/lib/stock-service";
import { cn } from "@/lib/utils";

interface GrowthGridProps {
  data: HistoricalData[];
  title: string;
  dataKey: keyof Omit<HistoricalData, 'year'>;
  format?: (val: number) => string;
}

export function GrowthGrid({ data, title, dataKey, format }: GrowthGridProps) {
  if (!data || data.length === 0) return null;

  const defaultFormat = (val: number) => {
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    return val.toFixed(2);
  };

  const displayFormat = format || defaultFormat;

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {data.map((item, index) => {
          const value = item[dataKey] as number;
          const prevValue = index > 0 ? (data[index - 1][dataKey] as number) : null;
          const isGrowth = prevValue !== null && value > prevValue;
          const isDecline = prevValue !== null && value < prevValue;

          return (
            <div
              key={item.year}
              className="flex-1 min-w-[60px] flex flex-col items-center"
            >
              <div className={cn(
                "w-full h-12 rounded-lg border border-border flex items-center justify-center mb-1 transition-all group hover:scale-105",
                isGrowth ? "bg-green-500/10 border-green-500/20" :
                isDecline ? "bg-red-500/10 border-red-500/20" : "bg-card"
              )}>
                <span className={cn(
                  "text-[10px] font-bold",
                  isGrowth ? "text-green-500" :
                  isDecline ? "text-red-500" : "text-foreground"
                )}>
                  {displayFormat(value)}
                </span>
              </div>
              <span className="text-[8px] font-medium text-muted-foreground uppercase">{item.year}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
