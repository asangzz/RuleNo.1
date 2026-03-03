"use client";

import { useState } from "react";
import { analyzeBusiness, compareBusinesses } from "./actions";
import { AnalysisResult, ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  const [tickerInput, setTickerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput) return;

    const tickers = tickerInput.split(",").map(t => t.trim().toUpperCase()).filter(t => t !== "");
    if (tickers.length === 0) return;

    setLoading(true);
    setError(null);
    setSingleResult(null);
    setComparisonResult(null);

    try {
      if (tickers.length === 1) {
        const response = await analyzeBusiness(tickers[0]);
        if (response.success && response.data) {
          setSingleResult(response.data);
        } else {
          setError(response.error || "Something went wrong");
        }
      } else {
        const response = await compareBusinesses(tickers);
        if (response.success && response.data) {
          setComparisonResult(response.data);
        } else {
          setError(response.error || "Something went wrong");
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Business Analysis</h2>
        <p className="text-muted-foreground">Rule No. 1 deep-dives and comparisons powered by Gemini 1.5 Pro.</p>
      </header>

      <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto flex gap-2">
        <input
          type="text"
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value)}
          placeholder="ENTER TICKERS (e.g., AAPL or AAPL, MSFT, GOOGL)"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Consulting Rule No. 1 Principles...</p>
        </div>
      )}

      {singleResult && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business Meaning</h3>
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full font-bold">CORE</span>
              </div>
              <p className="text-sm leading-relaxed">{singleResult.meaning}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Economic Moat</h3>
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-bold">PROTECTION</span>
              </div>
              <p className="text-sm leading-relaxed">{singleResult.moat}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Management</h3>
                <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-500 rounded-full font-bold">LEADERSHIP</span>
              </div>
              <p className="text-sm leading-relaxed">{singleResult.management}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wonderful Business Score</h3>
              <div className="text-5xl font-black text-accent">
                {singleResult.isWonderful ? "YES" : "NO"}
              </div>
              <p className="text-xs text-muted-foreground">Risk Level: {singleResult.riskScore}/10</p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-accent/5 to-transparent border border-border rounded-3xl">
            <h3 className="text-lg font-bold mb-4">AI Executive Summary - {singleResult.ticker}</h3>
            <p className="text-muted-foreground leading-relaxed italic">
              &ldquo;{singleResult.summary}&rdquo;
            </p>
          </div>

          <div className="flex justify-center">
            <button
              className="px-6 py-2 border border-border rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
              onClick={() => window.print()}
            >
              DOWNLOAD REPORT PDF
            </button>
          </div>
        </div>
      )}

      {comparisonResult && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Winner Highlight */}
          <div className="p-8 bg-gradient-to-br from-green-500/10 to-accent/5 border border-green-500/20 rounded-3xl relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-[0.2em] bg-green-500 text-green-950 px-3 py-1 rounded-full">
              Rule No. 1 Winner
            </div>
            <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
              <span className="text-green-500">{comparisonResult.winnerTicker}</span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Recommended Candidate</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed italic max-w-3xl">
              &ldquo;{comparisonResult.winnerReasoning}&rdquo;
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisonResult.comparisons.map((item) => (
              <div key={item.ticker} className={cn(
                "p-6 bg-card border rounded-2xl flex flex-col space-y-4 transition-all hover:border-accent/50",
                item.ticker === comparisonResult.winnerTicker ? "border-green-500/50 ring-1 ring-green-500/20" : "border-border"
              )}>
                <div className="flex justify-between items-center">
                  <h4 className="text-xl font-black">{item.ticker}</h4>
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                    item.isWonderful ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
                  )}>
                    {item.isWonderful ? "Wonderful" : "Fair"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Moat</p>
                    <p className="text-xs line-clamp-3 leading-relaxed text-muted-foreground">{item.moat}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Management</p>
                    <p className="text-xs line-clamp-3 leading-relaxed text-muted-foreground">{item.management}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Risk Score: {item.riskScore}/10</p>
                  <button
                    onClick={() => {
                      setSingleResult(item);
                      setComparisonResult(null);
                      setTickerInput(item.ticker);
                    }}
                    className="text-[10px] font-bold text-accent hover:underline uppercase tracking-wider"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
