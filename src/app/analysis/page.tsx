"use client";

import { useState } from "react";
import { analyzeBusiness, compareBusinesses } from "./actions";
import { AnalysisResult, ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [ticker, setTicker] = useState("");
  const [tickers, setTickers] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "single") {
      if (!ticker) return;
      setLoading(true);
      setError(null);
      setResult(null);
      setComparisonResult(null);

      const response = await analyzeBusiness(ticker);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || "Something went wrong");
      }
      setLoading(false);
    } else {
      const validTickers = tickers.filter(t => t.trim() !== "");
      if (validTickers.length < 2) {
        setError("Please enter at least two tickers for comparison.");
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      setComparisonResult(null);

      const response = await compareBusinesses(validTickers);
      if (response.success) {
        setComparisonResult(response.data);
      } else {
        setError(response.error || "Something went wrong");
      }
      setLoading(false);
    }
  };

  const updateTickerAt = (index: number, value: string) => {
    const newTickers = [...tickers];
    newTickers[index] = value.toUpperCase();
    setTickers(newTickers);
  };

  const addTickerField = () => {
    if (tickers.length < 4) {
      setTickers([...tickers, ""]);
    }
  };

  const removeTickerField = (index: number) => {
    if (tickers.length > 2) {
      setTickers(tickers.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">AI Business Intelligence</h2>
        <div className="flex justify-center">
          <div className="inline-flex bg-card border border-border p-1 rounded-xl">
            <button
              onClick={() => { setMode("single"); setError(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                mode === "single" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Single Deep-Dive
            </button>
            <button
              onClick={() => { setMode("compare"); setError(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                mode === "compare" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Company Comparison
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleAnalyze} className="space-y-4">
          {mode === "single" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="ENTER TICKER (e.g., AAPL)"
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
                required
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {tickers.map((t, i) => (
                  <div key={i} className="relative flex items-center">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => updateTickerAt(i, e.target.value)}
                      placeholder={`TICKER ${i + 1}`}
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
                      required
                    />
                    {tickers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeTickerField(i)}
                        className="absolute right-3 text-muted-foreground hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {tickers.length < 4 && (
                <button
                  type="button"
                  onClick={addTickerField}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                >
                  + ADD ANOTHER COMPANY
                </button>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "CONSULTING RULE NO. 1 PRINCIPLES..." : mode === "single" ? "ANALYZE BUSINESS" : "COMPARE BUSINESSES"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Running AI simulation...</p>
        </div>
      )}

      {result && mode === "single" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            <AnalysisCard title="Business Meaning" content={result.meaning} tag="CORE" />
            <AnalysisCard title="Economic Moat" content={result.moat} tag="PROTECTION" color="green" />
            <AnalysisCard title="Management" content={result.management} tag="LEADERSHIP" color="purple" />
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
            <p className="text-muted-foreground leading-relaxed italic">&ldquo;{result.summary}&rdquo;</p>
          </div>
        </div>
      )}

      {comparisonResult && mode === "compare" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-accent/5 border border-accent/20 rounded-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center font-black text-xl">!</div>
              <div>
                <h3 className="text-xl font-bold">Rule No. 1 Winner: {comparisonResult.winner.ticker}</h3>
                <p className="text-muted-foreground">{comparisonResult.winner.reason}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {comparisonResult.companies.map((company) => (
              <div key={company.ticker} className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h4 className="text-2xl font-black">{company.ticker}</h4>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    company.isWonderful ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {company.isWonderful ? "Wonderful" : "Risky"}
                  </div>
                </div>
                <div className="p-6 space-y-4 flex-1">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Moat</p>
                    <p className="text-xs leading-relaxed">{company.moat}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Management</p>
                    <p className="text-xs leading-relaxed">{company.management}</p>
                  </div>
                </div>
                <div className="p-6 pt-0 mt-auto">
                   <div className="flex justify-between items-center pt-4 border-t border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Risk Score</span>
                      <span className="font-bold">{company.riskScore}/10</span>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-card border border-border rounded-3xl">
            <h3 className="text-lg font-bold mb-4">Comparative Analysis</h3>
            <p className="text-muted-foreground leading-relaxed italic">&ldquo;{comparisonResult.comparisonSummary}&rdquo;</p>
          </div>
        </div>
      )}

      {(result || comparisonResult) && (
        <div className="flex justify-center pb-12">
          <button
            className="px-6 py-2 border border-border rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
            onClick={() => window.print()}
          >
            DOWNLOAD REPORT PDF
          </button>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ title, content, tag, color = "accent" }: { title: string, content: string, tag: string, color?: "accent" | "green" | "purple" }) {
  const colorMap = {
    accent: "bg-accent/10 text-accent",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="p-6 bg-card border border-border rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
        <span className={cn("text-xs px-2 py-1 rounded-full font-bold", colorMap[color])}>{tag}</span>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}
