"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  calculateStickerPrice,
  calculateMOSPrice,
  estimateFuturePE
} from "@/lib/rule-one";
import { HistoricalData } from "@/lib/stock-service";
import { fetchStockInfo } from "@/app/watchlist/actions";
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
  const [historicalData, setHistoricalData] = useState<HistoricalData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const futurePE = estimateFuturePE(item.growthRate, item.historicalHighPE);
  const stickerPrice = calculateStickerPrice(item.eps, item.growthRate, futurePE);
  const mosPrice = calculateMOSPrice(stickerPrice, targetMOS);
  const isSale = item.currentPrice <= mosPrice;

  useEffect(() => {
    if (isExpanded && !historicalData && !loading) {
      const loadHistoricalData = async () => {
        setLoading(true);
        try {
          const result = await fetchStockInfo(item.ticker);
          if (result.success && result.data?.historicalData) {
            setHistoricalData(result.data.historicalData);
          }
        } catch (error) {
          console.error("Error loading historical data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadHistoricalData();
    }
  }, [isExpanded, item.ticker, historicalData, loading]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-accent/50">
      <div
        className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent">
            {item.ticker}
          </div>
          <div>
            <h3 className="font-bold">{item.name}</h3>
            <p className="text-sm text-muted-foreground">Price: ${item.currentPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Sticker Price</p>
            <p className="font-bold">${stickerPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">MOS Price</p>
            <p className={cn("font-bold", isSale ? "text-green-500" : "text-foreground")}>
              ${mosPrice.toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-bold uppercase",
              isSale ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
            )}>
              {isSale ? "On Sale" : "Wait"}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="text-muted-foreground hover:text-red-500 transition-colors text-sm font-medium"
        >
          Remove
        </button>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-border bg-accent/5 animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            </div>
          ) : historicalData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GrowthGrid data={historicalData} type="eps" label="Annual EPS Growth" />
                <GrowthGrid data={historicalData} type="revenue" label="Revenue Growth" />
                <GrowthGrid data={historicalData} type="equity" label="Equity Growth" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Growth Rate</p>
                  <p className="text-sm font-bold">{(item.growthRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Hist. High PE</p>
                  <p className="text-sm font-bold">{item.historicalHighPE}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Future PE</p>
                  <p className="text-sm font-bold">{futurePE.toFixed(1)}</p>
                </div>
                <div className="flex items-end justify-end">
                  <button className="text-[10px] font-bold uppercase bg-accent text-accent-foreground px-3 py-1 rounded hover:opacity-90">
                    Full Analysis
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-sm text-muted-foreground italic">
              No historical data available for this ticker.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
