"use client";

import { useState } from "react";
import { analyzeBusiness, compareBusinesses } from "./actions";
import { AnalysisResult, ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  const [tickers, setTickers] = useState("");
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickers) return;

    const tickerList = tickers.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

    if (tickerList.length === 0) return;

    setLoading(true);
    setError(null);
    setSingleResult(null);
    setComparisonResult(null);

    try {
      if (tickerList.length === 1) {
        const response = await analyzeBusiness(tickerList[0]);
        if (response.success && response.data) {
          setSingleResult(response.data);
        } else {
          setError(response.error || "Something went wrong");
        }
      } else {
        const response = await compareBusinesses(tickerList);
        if (response.success && response.data) {
          setComparisonResult(response.data);
        } else {
          setError(response.error || "Something went wrong");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">AI Business Intelligence</h2>
        <p className="text-muted-foreground italic">Powered by Gemini 1.5 Pro & Rule No. 1 Principles</p>
      </header>

      <form onSubmit={handleAction} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
        <input
          type="text"
          value={tickers}
          onChange={(e) => setTickers(e.target.value)}
          placeholder="ENTER TICKERS (e.g., AAPL or AAPL, MSFT, GOOGL)"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold text-white placeholder:text-muted-foreground/50 transition-all"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "PROcessing..." : tickers.includes(",") ? "Compare" : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center font-bold">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">Consulting Rule No. 1 Principles...</p>
        </div>
      )}

      {/* Single Analysis View */}
      {singleResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            <MetricCard title="Business Meaning" content={singleResult.meaning} tag="CORE" />
            <MetricCard title="Economic Moat" content={singleResult.moat} tag="PROTECTION" tagColor="bg-green-500/10 text-green-500" />
            <MetricCard title="Management" content={singleResult.management} tag="LEADERSHIP" tagColor="bg-purple-500/10 text-purple-500" />
            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wonderful Business</h3>
              <div className={cn("text-5xl font-black", singleResult.isWonderful ? "text-accent" : "text-red-500")}>
                {singleResult.isWonderful ? "YES" : "NO"}
              </div>
              <p className="text-xs text-muted-foreground">Risk Level: {singleResult.riskScore}/10</p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-accent/5 to-transparent border border-border rounded-3xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              AI Executive Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed italic text-lg">
              &ldquo;{singleResult.summary}&rdquo;
            </p>
          </div>

          <div className="flex justify-center">
            <button
              className="px-6 py-2 border border-border rounded-full text-xs font-bold hover:bg-slate-800 transition-colors uppercase tracking-widest"
              onClick={() => window.print()}
            >
              Export Report PDF
            </button>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {comparisonResult && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Rule No. 1 Winner</div>
            <div className="text-6xl font-black text-white">{comparisonResult.winnerTicker}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisonResult.businesses.map((biz) => (
              <div
                key={biz.ticker}
                className={cn(
                  "p-6 bg-card border rounded-3xl space-y-4 transition-all hover:border-accent/50",
                  biz.ticker === comparisonResult.winnerTicker ? "border-accent ring-1 ring-accent/20" : "border-border"
                )}
              >
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <h3 className="text-2xl font-black">{biz.ticker}</h3>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    biz.isWonderful ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
                  )}>
                    {biz.isWonderful ? "Wonderful" : "Risky"}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Moat</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{biz.moat}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Management</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{biz.management}</p>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Risk Score</span>
                    <span className="text-sm font-bold text-white">{biz.riskScore}/10</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-card border border-border rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zM11 15h2v2h-2v-2zm0-7h2v5h-2V8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 relative z-10">AI Comparison Insight</h3>
            <p className="text-muted-foreground leading-relaxed text-lg relative z-10 italic">
              {comparisonResult.comparisonSummary}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              className="px-6 py-2 border border-border rounded-full text-xs font-bold hover:bg-slate-800 transition-colors uppercase tracking-widest"
              onClick={() => window.print()}
            >
              Export Comparison PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, content, tag, tagColor = "bg-accent/10 text-accent" }: { title: string; content: string; tag: string; tagColor?: string }) {
  return (
    <div className="p-6 bg-card border border-border rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", tagColor)}>{tag}</span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{content}</p>
    </div>
  );
}
