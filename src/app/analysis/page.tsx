"use client";

import { useState } from "react";
import { analyzeBusiness, compareBusinesses } from "./actions";
import { AnalysisResult, ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setComparisonResult(null);

    if (isComparisonMode) {
      const tickers = ticker.split(",").map(t => t.trim()).filter(t => t !== "");
      if (tickers.length < 2) {
        setError("Please enter at least two tickers separated by commas for comparison.");
        setLoading(false);
        return;
      }
      const response = await compareBusinesses(tickers);
      if (response.success && response.data) {
        setComparisonResult(response.data);
      } else {
        setError(response.error || "Something went wrong");
      }
    } else {
      const response = await analyzeBusiness(ticker);
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || "Something went wrong");
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Business Deep-Dive</h2>
        <p className="text-muted-foreground">Get a Rule No. 1 analysis powered by Gemini 1.5 Pro.</p>
      </header>

      <div className="flex justify-center mb-4">
        <div className="inline-flex p-1 bg-card border border-border rounded-lg">
          <button
            onClick={() => {
              setIsComparisonMode(false);
              setResult(null);
              setComparisonResult(null);
            }}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
              !isComparisonMode ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            DEEP-DIVE
          </button>
          <button
            onClick={() => {
              setIsComparisonMode(true);
              setResult(null);
              setComparisonResult(null);
            }}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
              isComparisonMode ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            COMPARISON
          </button>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder={isComparisonMode ? "ENTER TICKERS (e.g., AAPL, MSFT)" : "ENTER TICKER (e.g., AAPL)"}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Analyzing..." : isComparisonMode ? "Compare" : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business Meaning</h3>
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full font-bold">CORE</span>
              </div>
              <p className="text-sm leading-relaxed">{result.meaning}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Economic Moat</h3>
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-bold">PROTECTION</span>
              </div>
              <p className="text-sm leading-relaxed">{result.moat}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Management</h3>
                <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-500 rounded-full font-bold">LEADERSHIP</span>
              </div>
              <p className="text-sm leading-relaxed">{result.management}</p>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wonderful Business Score</h3>
              <div className="text-5xl font-black text-accent">
                {result.isWonderful ? "YES" : "NO"}
              </div>
              <p className="text-xs text-muted-foreground">Risk Level: {result.riskScore}/10</p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-accent/5 to-transparent border border-border rounded-3xl">
            <h3 className="text-lg font-bold mb-4">AI Executive Summary</h3>
            <p className="text-muted-foreground leading-relaxed italic">
              &ldquo;{result.summary}&rdquo;
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisonResult.analyses.map((analysis) => (
              <div key={analysis.ticker} className="space-y-6">
                <div className="p-6 bg-card border border-border rounded-2xl h-full flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center font-bold text-accent">
                      {analysis.ticker}
                    </div>
                    <div className={cn(
                      "text-[10px] px-2 py-1 rounded-full font-bold uppercase",
                      analysis.isWonderful ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-500"
                    )}>
                      {analysis.isWonderful ? "Wonderful" : "Mediocre"}
                    </div>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Meaning</h4>
                      <p className="text-xs leading-relaxed">{analysis.meaning}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Moat</h4>
                      <p className="text-xs leading-relaxed">{analysis.moat}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Management</h4>
                      <p className="text-xs leading-relaxed">{analysis.management}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Risk Score</span>
                      <span className="text-sm font-black">{analysis.riskScore}/10</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-green-500 text-black text-xs font-black rounded-full uppercase tracking-tighter">
                Rule No. 1 Winner
              </div>
              <h3 className="text-2xl font-black text-green-500">{comparisonResult.winner}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed italic">
              &ldquo;{comparisonResult.reasoning}&rdquo;
            </p>
          </div>

          <div className="flex justify-center">
            <button
              className="px-6 py-2 border border-border rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
              onClick={() => window.print()}
            >
              DOWNLOAD COMPARISON PDF
            </button>
          </div>
        </div>
      )}

      {loading && !result && !comparisonResult && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Consulting Rule No. 1 Principles...</p>
        </div>
      )}
    </div>
  );
}
