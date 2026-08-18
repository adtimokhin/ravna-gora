"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import type { AdminUser } from "../../../lib/types";

async function authorizedFetch(input: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
}

export function UsersTable() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("[admin:users] fetching user list");

    const res = await authorizedFetch("/api/admin/users");
    const body = await res.json().catch(() => null);
    console.log("[admin:users] fetch result", { status: res.status, body });

    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to load users.");
      return;
    }
    setUsers(body.users ?? []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updateUser(id: string, patch: { role?: string; banned?: boolean }) {
    setBusyId(id);
    console.log("[admin:users] updating user", { id, patch });

    const res = await authorizedFetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    console.log("[admin:users] update result", { id, status: res.status, body });

    setBusyId(null);
    if (!res.ok) {
      setError(body?.error ?? "Failed to update user.");
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  if (loading) {
    return <p className="type-body text-gray-3">Loading users…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="type-caption text-red-600">{error}</p>
        <button
          onClick={fetchUsers}
          className="type-caption text-blue-2 hover:underline self-start"
        >
          Retry
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="type-body text-gray-3">No users yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-black/10 border border-black/10">
      {users.map((u) => {
        const busy = busyId === u.id;
        const isSelf = u.id === currentUser?.id;

        return (
          <div key={u.id} className="flex items-center gap-4 px-4 py-3 flex-wrap">
            {/* Identity */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <p className="type-ui-medium text-black truncate">
                {u.fullName || u.email || u.id}
                {isSelf && <span className="type-caption text-gray-3"> (you)</span>}
              </p>
              <p className="type-caption text-gray-3 truncate">{u.email}</p>
            </div>

            {/* Status badge */}
            <span
              className={`type-caption px-2 py-0.5 shrink-0 ${
                u.banned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
            >
              {u.banned ? "Disabled" : "Active"}
            </span>

            {/* Role select */}
            <select
              value={u.role}
              disabled={isSelf || busy}
              onChange={(e) => updateUser(u.id, { role: e.target.value })}
              className="type-caption border border-black/20 text-black px-2 py-1.5 shrink-0 disabled:opacity-50 bg-white"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            {/* Disable / enable */}
            <button
              onClick={() => updateUser(u.id, { banned: !u.banned })}
              disabled={isSelf || busy}
              className="cursor-pointer border border-black/20 type-caption text-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-black shrink-0"
            >
              {busy ? "Saving…" : u.banned ? "Enable" : "Disable"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
