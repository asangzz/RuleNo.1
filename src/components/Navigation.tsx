import Link from 'next/link';

const Navigation = () => {
  return (
    <nav className="flex flex-col w-64 h-screen bg-card border-r border-border p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight">Rule No. 1</h1>
      </div>
      <ul className="space-y-2">
        <li>
          <Link href="/" className="block p-2 rounded hover:bg-slate-800 transition-colors">
            Dashboard
          </Link>
        </li>
        <li>
          <Link href="/watchlist" className="block p-2 rounded hover:bg-slate-800 transition-colors">
            Watchlist
          </Link>
        </li>
        <li>
          <Link href="/analysis" className="block p-2 rounded hover:bg-slate-800 transition-colors">
            Analysis
          </Link>
        </li>
        <li>
          <Link href="/payback-time" className="block p-2 rounded hover:bg-slate-800 transition-colors">
            Payback Time
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
