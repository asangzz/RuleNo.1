"use client";

import { useState, useEffect } from "react";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { cn } from "@/lib/utils";
import GrowthGrid from "./GrowthGrid";
import { HistoricalData } from "@/lib/stock-service";
import { fetchHistoricalGrowth } from "@/app/watchlist/actions";

interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
  historicalGrowth?: HistoricalData[];
}

interface WatchlistItemCardProps {
  item: WatchlistItem;
  targetMOS: number;
  onRemove: (id: string) => void;
}

export default function WatchlistItemCard({ item, targetMOS, onRemove }: WatchlistItemCardProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>(item.historicalGrowth || []);
  const [loading, setLoading] = useState(!item.historicalGrowth);

  useEffect(() => {
    if (!item.historicalGrowth) {
      async function fetchData() {
        const res = await fetchHistoricalGrowth(item.ticker);
        if (res.success && res.data) {
          setHistoricalData(res.data);
        }
        setLoading(false);
      }
      fetchData();
    }
  }, [item.ticker, item.historicalGrowth]);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const isSale = item.currentPrice <= mosPrice;

  return (
    <div className="p-6 bg-card border border-border rounded-2xl flex flex-col gap-6 hover:border-accent/50 transition-colors group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center font-bold text-accent group-hover:scale-110 transition-transform">
            {item.ticker}
          </div>
          <div>
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-sm text-muted-foreground">Price: ${item.currentPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sticker Price</p>
            <p className="font-bold text-lg">${stickerPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-accent tracking-widest">MOS Price</p>
            <p className={cn("font-bold text-lg", isSale ? "text-green-500" : "text-accent")}>
              ${mosPrice.toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</p>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
              isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
            )}>
              {isSale ? "On Sale" : "Wait"}
            </span>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors md:self-center"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border">
        {loading ? (
          <div className="h-16 flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
            <span className="text-xs text-muted-foreground">Loading historical data...</span>
          </div>
        ) : (
          <>
            <GrowthGrid data={historicalData} metric="eps" label="Earnings (EPS)" />
            <GrowthGrid data={historicalData} metric="revenue" label="Revenue" />
          </>
        )}
      </div>
    </div>
  );
}
