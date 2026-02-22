"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { GrowthGrid } from "./GrowthGrid";
import { fetchHistoricalData } from "@/app/watchlist/actions";
import { HistoricalData } from "@/lib/stock-service";

interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  eps: number;
  growthRate: number;
  historicalHighPE: number;
}

interface WatchlistItemCardProps {
  item: WatchlistItem;
  targetMOS: number;
  onRemove: (id: string) => void;
}

export function WatchlistItemCard({ item, targetMOS, onRemove }: WatchlistItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const isSale = item.currentPrice <= mosPrice;

  useEffect(() => {
    if (isExpanded && historicalData.length === 0) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        const res = await fetchHistoricalData(item.ticker);
        if (res.success && res.data) {
          setHistoricalData(res.data);
        }
        setLoadingHistory(false);
      };
      loadHistory();
    }
  }, [isExpanded, item.ticker, historicalData.length]);

  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300",
      isExpanded ? "ring-1 ring-accent/30 shadow-lg scale-[1.01]" : "hover:border-accent/30 shadow-sm"
    )}>
      <div
        className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center font-black text-accent shadow-inner">
            {item.ticker}
          </div>
          <div>
            <h3 className="font-bold tracking-tight">{item.name}</h3>
            <p className="text-sm text-muted-foreground font-medium">Price: ${item.currentPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sticker Price</p>
            <p className="font-bold text-lg">${stickerPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">MOS Price ({targetMOS}%)</p>
            <p className={cn("font-bold text-lg", isSale ? "text-green-500" : "text-foreground")}>
              ${mosPrice.toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</p>
            <div className="mt-1">
              <span className={cn(
                "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider",
                isSale ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
              )}>
                {isSale ? "On Sale" : "Wait"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remove from watchlist"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
          <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-border animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Growth Rate</p>
                  <p className="text-xl font-black">{(item.growthRate * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Future P/E</p>
                  <p className="text-xl font-black">{futurePE.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">EPS (TTM)</p>
                  <p className="text-xl font-black">${item.eps.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Hist. High P/E</p>
                  <p className="text-xl font-black">{item.historicalHighPE}</p>
                </div>
              </div>
            </div>

            <div>
              {loadingHistory ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                </div>
              ) : (
                <GrowthGrid data={historicalData} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
