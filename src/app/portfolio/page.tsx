"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPortfolio, addTransaction } from './actions';
import { PortfolioData, PortfolioTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { fetchStockInfo } from '../watchlist/actions';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadPortfolio = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getPortfolio();
    setPortfolio(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      setTimeout(() => loadPortfolio(), 0);
    } else {
      setTimeout(() => setLoading(false), 0);
    }
  }, [user, loadPortfolio]);

  const handleFetchPrice = async () => {
    if (!ticker) return;
    const res = await fetchStockInfo(ticker);
    if (res.success && res.data) {
      setPrice(res.data.currentPrice.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    const transaction: PortfolioTransaction = {
      ticker: ticker.toUpperCase(),
      type,
      shares: parseFloat(shares),
      price: parseFloat(price),
      date,
    };

    const res = await addTransaction(transaction);
    if (res.success) {
      setTicker('');
      setShares('');
      setPrice('');
      setShowAddForm(false);
      loadPortfolio();
    }
    setIsSubmitting(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  if (loading && !portfolio) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Portfolio</h2>
          <p className="text-muted-foreground">Track your wonderful business holdings.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          {showAddForm ? 'Cancel' : 'Add Transaction'}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Value</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(portfolio?.totalValue || 0)}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cost Basis</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(portfolio?.totalCostBasis || 0)}</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Gain / Loss</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={cn(
              "text-3xl font-bold",
              (portfolio?.totalGainLoss || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {formatCurrency(portfolio?.totalGainLoss || 0)}
            </p>
          </div>
        </div>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Performance</h3>
          <p className={cn(
            "text-3xl font-bold mt-2",
            (portfolio?.gainLossPercentage || 0) >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {(portfolio?.gainLossPercentage || 0).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="p-6 bg-card border border-accent/30 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4">Record Transaction</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label htmlFor="ticker" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ticker</label>
              <div className="flex gap-2">
                <input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  placeholder="AAPL"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchPrice}
                  className="px-3 py-2 bg-slate-800 text-xs font-bold rounded-lg hover:bg-slate-700"
                >
                  Fetch
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as 'BUY' | 'SELL')}
                className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="shares" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price</label>
              <input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="150.00"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div className="lg:col-span-5 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Record Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Ticker</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Shares</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Avg Cost</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Current Price</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Total Value</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Gain/Loss</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">MOS Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolio?.items.map((item) => (
                <tr key={item.ticker} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{item.ticker}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{item.shares.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.averageCost)}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.currentPrice)}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(item.totalValue)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className={cn(
                      "font-bold",
                      item.totalGainLoss >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {formatCurrency(item.totalGainLoss)}
                    </div>
                    <div className={cn(
                      "text-xs",
                      item.gainLossPercentage >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {item.gainLossPercentage >= 0 ? '+' : ''}{item.gainLossPercentage.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      {item.mosPrice ? (
                        <>
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            item.currentPrice <= item.mosPrice ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                          )}>
                            {item.currentPrice <= item.mosPrice ? 'Buy Zone' : 'Wait'}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            MOS: {formatCurrency(item.mosPrice)}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Add to Watchlist</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {portfolio?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No holdings yet. Add your first transaction above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
