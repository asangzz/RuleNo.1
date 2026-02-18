import { ArrowUpRight, BarChart3, ShieldCheck, User } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rule No. 1</h1>
          <p className="text-muted-foreground text-sm">Wonderful Businesses Tracker</p>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard title="Meaning" value="12" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard title="Moat" value="8" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard title="Management" value="15" icon={<User className="h-4 w-4" />} />
        <StatCard title="Wonderful" value="5" icon={<ArrowUpRight className="h-4 w-4" />} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-foreground">Consistency Overview</h2>
        <div className="bg-secondary/30 rounded-xl p-6 h-48 flex items-center justify-center border border-border">
           <p className="text-muted-foreground">Heatmap visualization coming soon...</p>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-2 text-foreground">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
