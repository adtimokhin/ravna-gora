import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";

type AdminAuthResult =
  | { user: User; admin: SupabaseClient }
  | { error: string; status: number };

// Verifies the caller's access token resolves to a signed-in user whose
// profiles.role is "admin". The role check runs through the service-role
// client (bypasses RLS) so it doesn't depend on a SELECT policy existing —
// this is the actual authorization boundary for every /api/admin/* route.
export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: "Admin features are not configured on this deployment.", status: 500 };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: "Not authenticated.", status: 401 };
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token);

  if (userError || !user) {
    return { error: "Not authenticated.", status: 401 };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Admin access required.", status: 403 };
  }

  return { user, admin };
}
