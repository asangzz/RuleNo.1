"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Watchlist', href: '/watchlist' },
    { name: 'Analysis', href: '/analysis' },
    { name: 'Payback Time', href: '/payback-time' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <nav className="flex flex-col w-64 h-screen bg-card border-r border-border p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-accent">Rule No. 1</h1>
      </div>

      <div className="flex-1">
        <ul className="space-y-2">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "block p-2 rounded transition-colors text-sm font-medium",
                  pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                {link.name}
              </Link>
            </li>
          ))}
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
