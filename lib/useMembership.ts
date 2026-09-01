import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { MEMBERSHIP_ACTIVE_STATUSES, type MembershipEdition, type MembershipPlan } from "./membershipPlans";

export type MembershipRow = {
  membership_id: string;
  plan: MembershipPlan;
  edition: MembershipEdition | null;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

// Shared between /membership and the account page's billing pane, so both
// read the same "most recent membership row" and mutate it the same way —
// see the comment on MEMBERSHIP_ACTIVE_STATUSES for why "most recent" matters.
// Translation-agnostic on purpose: callers own confirm dialogs and
// success/error copy, this just does the fetch and the API call.
export function useMembership(user: User | null, session: Session | null) {
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(!!user);
  const [lastUserId, setLastUserId] = useState<string | null>(user?.id ?? null);

  // Clears stale data synchronously during render when the signed-in user
  // actually changes (login/logout/switching accounts) — React's own
  // recommended pattern for "reset state when an input changes", rather than
  // a synchronous setState at the top of the fetch effect below, which would
  // just trigger an extra cascading render for what's really a same-render
  // adjustment.
  if ((user?.id ?? null) !== lastUserId) {
    setLastUserId(user?.id ?? null);
    setMembership(null);
    setMembershipLoading(!!user);
  }

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("memberships")
      .select("membership_id, plan, edition, status, cancel_at_period_end, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setMembership(data as MembershipRow);
        setMembershipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasActiveMembership = !!membership && MEMBERSHIP_ACTIVE_STATUSES.includes(membership.status);

  async function setCancelAtPeriodEnd(cancelAtPeriodEnd: boolean): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/membership/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ cancelAtPeriodEnd }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, error: body?.error };
    }

    setMembership((prev) => (prev ? { ...prev, cancel_at_period_end: body.cancelAtPeriodEnd } : prev));
    return { ok: true };
  }

  return { membership, membershipLoading, hasActiveMembership, setCancelAtPeriodEnd };
}
