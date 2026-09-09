"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";
import { GiftMembershipModal } from "./GiftMembershipModal";
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
  const { showError } = useDialog();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [giftUser, setGiftUser] = useState<AdminUser | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    console.log("[admin:users] fetching user list");

    const res = await authorizedFetch("/api/admin/users");
    const body = await res.json().catch(() => null);
    console.log("[admin:users] fetch result", { status: res.status, body });

    setLoading(false);
    if (!res.ok) {
      setLoadFailed(true);
      showError(body?.error ?? "Failed to load users.", {
        actions: [{ label: "Retry", onClick: retryLoad }],
      });
      return;
    }
    setUsers(body.users ?? []);
  }, [showError, retryLoad]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, reloadKey]);

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
      showError(body?.error ?? "Failed to update user.");
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  if (loading) {
    return <p className="type-body text-gray-3">Loading users…</p>;
  }

  if (loadFailed) {
    return (
      <p className="type-body text-gray-3">
        Couldn&apos;t load users.{" "}
        <button
          onClick={retryLoad}
          className="cursor-pointer text-blue-2 hover:underline"
        >
          Retry
        </button>
      </p>
    );
  }

  if (users.length === 0) {
    return <p className="type-body text-gray-3">No users yet.</p>;
  }

  return (
    <>
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
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            {/* Gift membership */}
            <button
              onClick={() => setGiftUser(u)}
              className="cursor-pointer border border-black/20 type-caption text-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors shrink-0"
            >
              Gift membership
            </button>

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

    {giftUser && (
      <GiftMembershipModal user={giftUser} onClose={() => setGiftUser(null)} />
    )}
    </>
  );
}
