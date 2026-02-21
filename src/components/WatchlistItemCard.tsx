"use client";

import { useState, useEffect } from "react";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { GrowthGrid } from "./GrowthGrid";
import { fetchHistoricalGrowth } from "@/app/watchlist/actions";
import { HistoricalData } from "@/lib/stock-service";

interface WatchlistItemCardProps {
  item: {
    id: string;
    ticker: string;
    name: string;
    currentPrice: number;
    eps: number;
    growthRate: number;
    historicalHighPE: number;
  };
  targetMOS: number;
  onRemove: (id: string) => void;
}

export const WatchlistItemCard = ({ item, targetMOS, onRemove }: WatchlistItemCardProps) => {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistorical() {
      const res = await fetchHistoricalGrowth(item.ticker);
      if (res.success && res.data) {
        setHistoricalData(res.data);
      }
      setLoading(false);
    }
    loadHistorical();
  }, [item.ticker]);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const isSale = item.currentPrice <= mosPrice;

  return (
    <div className="p-6 bg-card border border-border rounded-2xl flex flex-col lg:flex-row gap-8 transition-all hover:border-accent/30 group">
      <div className="flex flex-col justify-between min-w-[200px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center font-black text-accent shadow-inner group-hover:scale-110 transition-transform">
            {item.ticker}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-foreground group-hover:text-accent transition-colors">{item.name}</h3>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
              Price: <span className="text-foreground">${item.currentPrice.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
            isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
          )}>
            {isSale ? "On Sale" : "Wait"}
          </span>
          <button
            onClick={() => onRemove(item.id)}
            className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sticker Price</p>
          <p className="text-xl font-black">${stickerPrice.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Fair Value</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">MOS Price ({targetMOS}%)</p>
          <p className={cn("text-xl font-black", isSale ? "text-green-500" : "text-foreground")}>
            ${mosPrice.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Safe Entry</p>
        </div>
        <div className="space-y-1 hidden md:block">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Future PE</p>
          <p className="text-xl font-black">{futurePE.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Est. 10yr</p>
        </div>
      </div>

      <div className="lg:w-1/3 min-w-[240px]">
        {loading ? (
          <div className="h-24 flex items-center justify-center animate-pulse bg-muted/20 rounded-xl">
            <div className="h-2 w-24 bg-muted-foreground/20 rounded-full"></div>
          </div>
        ) : (
          <GrowthGrid data={historicalData} />
        )}
      </div>
    </div>
  );
};
