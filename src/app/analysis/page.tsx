"use client";

import { useState } from "react";
import { analyzeBusiness, compareBusinesses } from "./actions";
import { AnalysisResult, ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "compare">("single");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setComparisonResult(null);

    if (mode === "single") {
      const response = await analyzeBusiness(ticker);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || "Something went wrong");
      }
    } else {
      const tickers = ticker.split(",").map(t => t.trim()).filter(t => t.length > 0);
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
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Business Analysis</h2>
        <p className="text-muted-foreground">Get Rule No. 1 insights powered by Gemini 1.5 Pro.</p>
      </header>

      <div className="flex justify-center mb-4">
        <div className="flex bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setMode("single")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              mode === "single" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            DEEP-DIVE
          </button>
          <button
            onClick={() => setMode("compare")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              mode === "compare" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            COMPARE
          </button>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-2 max-w-2xl mx-auto">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder={mode === "single" ? "ENTER TICKER (e.g., AAPL)" : "ENTER TICKERS (e.g., AAPL, MSFT)"}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent font-bold"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Processing..." : mode === "single" ? "Analyze" : "Compare"}
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

      {result && mode === "single" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <AnalysisCard title="Business Meaning" content={result.meaning} tag="CORE" />
            <AnalysisCard title="Economic Moat" content={result.moat} tag="PROTECTION" tagColor="green" />
            <AnalysisCard title="Management" content={result.management} tag="LEADERSHIP" tagColor="purple" />

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wonderful Business Score</h3>
              <div className="text-5xl font-black text-accent">
                {result.isWonderful ? "YES" : "NO"}
              </div>
              <p className="text-xs text-muted-foreground">Risk Level: {result.riskScore}/10</p>
            </div>
          </div>

          <SummaryCard content={result.summary} />

          <div className="flex justify-center">
            <PrintButton />
          </div>
        </div>
      )}

      {comparisonResult && mode === "compare" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {comparisonResult.analyses.map((analysis) => (
              <div
                key={analysis.ticker}
                className={cn(
                  "space-y-4 p-6 rounded-3xl border transition-all",
                  analysis.ticker === comparisonResult.winnerTicker
                    ? "bg-accent/5 border-accent shadow-[0_0_20px_rgba(var(--color-accent),0.1)]"
                    : "bg-card border-border"
                )}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tighter">{analysis.ticker}</h3>
                  {analysis.ticker === comparisonResult.winnerTicker && (
                    <span className="bg-accent text-accent-foreground text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      Rule No. 1 Winner
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <ComparisonSection title="Moat" content={analysis.moat} />
                  <ComparisonSection title="Management" content={analysis.management} />
                  <ComparisonSection title="Meaning" content={analysis.meaning} />

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground">Wonderful Score</span>
                    <span className={cn("text-lg font-black", analysis.isWonderful ? "text-accent" : "text-muted-foreground")}>
                      {analysis.isWonderful ? "YES" : "NO"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-card border border-border rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Comparison Verdict
            </h3>
            <p className="text-muted-foreground leading-relaxed italic">
              &ldquo;{comparisonResult.comparisonSummary}&rdquo;
            </p>
          </div>

          <div className="flex justify-center">
            <PrintButton />
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ title, content, tag, tagColor = "accent" }: { title: string; content: string; tag: string; tagColor?: string }) {
  const colorClasses: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="p-6 bg-card border border-border rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
        <span className={cn("text-[10px] px-2 py-1 rounded-full font-black tracking-tighter", colorClasses[tagColor])}>
          {tag}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}

function ComparisonSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      <p className="text-xs leading-relaxed text-foreground/80">{content}</p>
    </div>
  );
}

function SummaryCard({ content }: { content: string }) {
  return (
    <div className="p-8 bg-gradient-to-br from-accent/5 to-transparent border border-border rounded-3xl">
      <h3 className="text-lg font-bold mb-4">AI Executive Summary</h3>
      <p className="text-muted-foreground leading-relaxed italic">
        &ldquo;{content}&rdquo;
      </p>
    </div>
  );
}

function PrintButton() {
  return (
    <button
      className="px-6 py-2 border border-border rounded-full text-[10px] font-bold hover:bg-slate-800 transition-colors tracking-widest uppercase"
      onClick={() => window.print()}
    >
      Download Report PDF
    </button>
  );
}
