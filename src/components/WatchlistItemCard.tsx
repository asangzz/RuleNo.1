"use client";

import { useState, useEffect } from "react";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchHistoricalData } from "@/app/watchlist/actions";
import { GrowthGrid } from "@/components/GrowthGrid";
import { HistoricalData } from "@/lib/stock-service";

export interface WatchlistItemData {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
}

export function WatchlistItemCard({
  item,
  onRemove,
  mosPercentage
}: {
  item: WatchlistItemData;
  onRemove: (id: string) => void;
  mosPercentage: number;
}) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);

  useEffect(() => {
    async function getHistory() {
      const res = await fetchHistoricalData(item.ticker);
      if (res.success && res.data) {
        setHistoricalData(res.data);
      }
    }
    getHistory();
  }, [item.ticker]);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, mosPercentage);
  const isSale = item.currentPrice <= mosPrice;

  return (
    <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent">
            {item.ticker}
          </div>
          <div>
            <h3 className="font-bold">{item.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Price: ${item.currentPrice.toFixed(2)}</p>
              <span className={cn(
                "md:hidden text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
              )}>
                {isSale ? "On Sale" : "Wait"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 md:justify-end">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sticker Price</p>
            <p className="font-bold">${stickerPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">MOS Price ({mosPercentage}%)</p>
            <p className={cn("font-bold", isSale ? "text-green-500" : "text-foreground")}>
              ${mosPrice.toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block text-right md:text-left">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</p>
            <span className={cn(
              "text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider",
              isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
            )}>
              {isSale ? "On Sale" : "Wait"}
            </span>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-muted-foreground hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest self-end md:self-center"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
        <GrowthGrid data={historicalData} label="Earnings Per Share (EPS)" valueType="eps" />
        <GrowthGrid data={historicalData} label="Annual Revenue" valueType="revenue" />
      </div>
    </div>
  );
}
