import React from 'react';
import { HistoricalData } from '@/lib/stock-service';
import { cn } from '@/lib/utils';

interface GrowthGridProps {
  data: HistoricalData[];
  metric: keyof Omit<HistoricalData, 'year'>;
  title: string;
  formatter?: (val: number) => string;
}

export const GrowthGrid: React.FC<GrowthGridProps> = ({ data, metric, title, formatter }) => {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {data.map((item, i) => {
          const val = item[metric] as number;
          const prevVal = i > 0 ? data[i - 1][metric] as number : undefined;
          const growth = (prevVal && prevVal !== 0) ? (val - prevVal) / Math.abs(prevVal) : null;

          return (
            <div key={item.year} className="flex-1 min-w-[60px] group">
              <div className={cn(
                "h-12 w-full rounded-lg border border-border flex flex-col items-center justify-center transition-all group-hover:scale-105",
                growth === null ? "bg-slate-900" :
                growth > 0.15 ? "bg-green-500/20 border-green-500/30" :
                growth > 0 ? "bg-green-500/10 border-green-500/20" :
                growth < 0 ? "bg-red-500/10 border-red-500/20" : "bg-slate-900"
              )}>
                <span className="text-[10px] font-bold text-foreground">
                  {val !== undefined ? (formatter ? formatter(val) : val.toFixed(2)) : 'N/A'}
                </span>
                {growth !== null && (
                  <span className={cn(
                    "text-[8px] font-medium",
                    growth > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {growth > 0 ? '+' : ''}{(growth * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-[9px] text-center mt-1 font-medium text-muted-foreground">{item.year}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
