"use client";

import { useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useRouter } from "../../../i18n/navigation";

// NOTE: This component is a UX-only gate. The real security boundary is
// Supabase RLS — even if someone bypasses this client check, the database
// will reject INSERTs/UPDATEs because is_admin() returns false for them.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin, isAdminLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || isAdminLoading) {
    return <div className="type-body text-gray-2 py-10">Checking permissions…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-3 py-10">
        <h2 className="type-h3 text-black">Not Authorized</h2>
        <p className="type-body text-gray-2">
          Admin access is required to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
