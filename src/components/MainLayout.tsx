"use client";

import Navigation from './Navigation';
import { ProtectedRoute } from './ProtectedRoute';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background text-foreground">
        {!isAuthPage && <Navigation />}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MainLayout;
