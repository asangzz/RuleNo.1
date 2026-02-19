import React from 'react';
import { HistoricalData } from '@/lib/stock-service';
import { cn } from '@/lib/utils';

interface GrowthGridProps {
  data: HistoricalData[];
}

export const GrowthGrid: React.FC<GrowthGridProps> = ({ data }) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-6 h-6 rounded-sm bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  // Calculate year-over-year growth percentage
  const growthData = data.slice(1).map((d, i) => {
    const prev = data[i].value;
    const current = d.value;
    const growth = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
    return {
      year: d.year,
      growth: growth,
      value: current
    };
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {growthData.map((d) => {
          const isPositive = d.growth >= 0;
          const intensity = Math.min(Math.abs(d.growth) / 25, 1); // Max intensity at 25% growth

          return (
            <div key={d.year} className="group relative flex-shrink-0">
              <div
                className={cn(
                  "w-6 h-6 rounded-sm transition-all duration-300 border border-transparent cursor-help",
                  isPositive
                    ? "bg-emerald-500 hover:border-emerald-400"
                    : "bg-rose-500 hover:border-rose-400"
                )}
                style={{
                  opacity: 0.3 + (intensity * 0.7)
                }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-xl">
                <p className="font-bold">{d.year}</p>
                <p className={isPositive ? "text-emerald-500" : "text-rose-500"}>
                  {d.growth > 0 ? '+' : ''}{d.growth.toFixed(1)}%
                </p>
                <p className="text-muted-foreground">${d.value.toFixed(2)} EPS</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
