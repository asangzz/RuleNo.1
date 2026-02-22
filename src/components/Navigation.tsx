"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const Navigation = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <nav className="flex flex-col w-64 h-screen bg-card border-r border-border p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-accent">Rule No. 1</h1>
      </div>

      <div className="flex-1">
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
          <li>
            <Link href="/settings" className="block p-2 rounded hover:bg-slate-800 transition-colors">
              Settings
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        {!loading && (
          user ? (
            <div className="space-y-4">
              <div className="px-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Logged in as</p>
                <p className="text-sm truncate font-medium">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left p-2 text-sm rounded hover:bg-red-500/10 text-red-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link href="/login" className="block p-2 text-sm rounded hover:bg-slate-800 transition-colors font-bold">
                Log In
              </Link>
              <Link href="/signup" className="block p-2 text-sm rounded bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-center font-bold">
                Sign Up
              </Link>
            </div>
          )
        )}
      </div>
    </nav>
  );
};

export default Navigation;
