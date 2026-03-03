"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if mock auth is enabled
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      console.log("Using Mock Auth");
      // Simulate a small delay for "loading" state
      const timer = setTimeout(() => {
        setUser({
          uid: "mock-user-123",
          email: "test@example.com",
          displayName: "Mock User",
          emailVerified: true,
        } as User);
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
