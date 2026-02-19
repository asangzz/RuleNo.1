"use client";

import { useState } from "react";
import { analyzeBusiness } from "./actions";
import GrowthGrid from "@/components/GrowthGrid";
import { GrowthData } from "@/lib/stock-service";

interface AnalysisResult {
  ticker: string;
  meaning: string;
  moat: string;
  management: string;
  isWonderful: boolean;
  riskScore: number;
  summary: string;
  historicalGrowth?: GrowthData | null;
}

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await analyzeBusiness(ticker);

    if (response.success) {
      setResult(response.data);
    } else {
      setError(response.error || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Business Deep-Dive</h2>
        <p className="text-muted-foreground">Get a Rule No. 1 analysis powered by Gemini 1.5 Pro.</p>
      </header>

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="ENTER TICKER (e.g., AAPL, MSFT, GOOGL)"
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {result.historicalGrowth && (
            <section>
              <GrowthGrid data={result.historicalGrowth} />
            </section>
          )}

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

      {loading && !result && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse">Consulting Rule No. 1 Principles...</p>
        </div>
      )}
    </div>
  );
}
