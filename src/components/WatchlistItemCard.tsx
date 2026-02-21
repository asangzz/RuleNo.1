"use client";

import { useState, useEffect } from "react";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import { fetchHistoricalData } from "@/app/watchlist/actions";
import { HistoricalData } from "@/lib/stock-service";
import GrowthGrid from "./GrowthGrid";

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

export default function WatchlistItemCard({ item, targetMOS, onRemove }: WatchlistItemCardProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getHistory() {
      const res = await fetchHistoricalData(item.ticker);
      if (res.success && res.data) {
        setHistoricalData(res.data);
      }
      setLoading(false);
    }
    getHistory();
  }, [item.ticker]);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const isSale = item.currentPrice <= mosPrice;

  return (
    <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-6 transition-all hover:border-accent/50 group shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-background border border-border rounded-xl flex items-center justify-center font-black text-accent text-lg shadow-inner group-hover:scale-105 transition-transform">
            {item.ticker}
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight">{item.name}</h3>
            <p className="text-sm text-muted-foreground font-medium">Price: ${item.currentPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Sticker Price</p>
            <p className="font-bold text-xl">${stickerPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">MOS Price</p>
            <p className={cn("font-bold text-xl", isSale ? "text-green-500" : "text-foreground")}>
              ${mosPrice.toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Status</p>
            <span className={cn(
              "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter",
              isSale ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
            )}>
              {isSale ? "On Sale" : "Wait"}
            </span>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
          title="Remove from watchlist"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>

      {!loading && historicalData.length > 0 && (
        <div className="pt-4 border-t border-border">
          <GrowthGrid data={historicalData} metric="eps" label="Earnings Growth (EPS)" />
        </div>
      )}
    </div>
  );
}
