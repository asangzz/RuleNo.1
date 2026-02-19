import React from 'react';
import { cn } from '@/lib/utils';
import { HistoricalData } from '@/lib/stock-service';

interface GrowthGridProps {
  data: HistoricalData[];
}

export const GrowthGrid: React.FC<GrowthGridProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-md bg-slate-900 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxEarnings = Math.max(...data.map(d => d.earnings));
  const minEarnings = Math.min(...data.map(d => d.earnings));

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {data.map((yearData) => {
          // Calculate intensity based on relative value (0 to 1)
          const range = maxEarnings - minEarnings;
          const intensity = range === 0 ? 1 : (yearData.earnings - minEarnings) / range;

          return (
            <div
              key={yearData.date}
              className={cn(
                "w-8 h-8 rounded-md transition-all hover:ring-2 hover:ring-accent/50 cursor-help relative group",
                intensity < 0.25 ? "bg-accent/20" :
                intensity < 0.5 ? "bg-accent/40" :
                intensity < 0.75 ? "bg-accent/70" : "bg-accent"
              )}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border pointer-events-none">
                {yearData.date}: {formatCurrency(yearData.earnings)}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-background/50 group-hover:text-background/80 transition-colors">
                {yearData.date.toString().slice(-2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
