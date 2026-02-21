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

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Watchlist', href: '/watchlist' },
    { label: 'Analysis', href: '/analysis' },
    { label: 'Payback Time', href: '/payback-time' },
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <nav className="flex flex-col w-64 h-screen bg-card border-r border-border p-4 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold tracking-tight text-accent">Rule No. 1</h1>
      </div>

      <div className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        {!loading && (
          user ? (
            <div className="space-y-4">
              <div className="px-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Logged in as</p>
                <p className="text-xs truncate font-medium">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 text-red-500 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link href="/login" className="block px-3 py-2 text-sm rounded-lg hover:bg-accent/10 transition-colors font-bold text-center">
                Log In
              </Link>
              <Link href="/signup" className="block px-3 py-2 text-sm rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-center font-bold shadow-sm">
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
