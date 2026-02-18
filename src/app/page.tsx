export default function Home() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to your Rule No. 1 investment command center.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Wonderful Businesses</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Watchlist</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Analysis</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>

      <div className="p-6 bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Market Tracking</h3>
          <span className="text-sm text-muted-foreground">Last 12 Months</span>
        </div>
        <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
          GitHub-style Heatmap Visualization
        </div>
      </div>
    </div>
  );
}
