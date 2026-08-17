"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

type AdminStatus = { userId: string; isAdmin: boolean };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isAdminLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);

  const isAdmin = user ? adminStatus?.userId === user.id && adminStatus.isAdmin : false;
  const isAdminLoading = user ? adminStatus?.userId !== user.id : false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mirrors profiles.role from Supabase. This only drives client-side UI
  // (e.g. showing admin links in the navbar) — RLS/is_admin() on the
  // database is the real security boundary, see AdminGuard.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setAdminStatus({ userId: user.id, isAdmin: !error && data?.role === "admin" });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, isAdmin, isAdminLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
