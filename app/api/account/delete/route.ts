import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

// Requires SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role
// in the Supabase dashboard) — not the anon key used elsewhere in the app.
// The identity of the caller is verified from their own access token before
// anything is deleted, so this route can't be used to delete another user.
export async function POST(request: Request) {
  console.log("[api/account/delete] request received");

  const admin = getSupabaseAdmin();
  console.log("[api/account/delete] getSupabaseAdmin()", { configured: !!admin });
  if (!admin) {
    console.error("[api/account/delete] SUPABASE_SERVICE_ROLE_KEY is not set — refusing");
    return NextResponse.json(
      { error: "Account deletion is not configured on this deployment." },
      { status: 500 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  console.log("[api/account/delete] auth header present?", { hasToken: !!token });
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token);
  console.log("[api/account/delete] getUser(token) result", {
    userId: user?.id,
    userError,
  });

  if (userError || !user) {
    console.error("[api/account/delete] token did not resolve to a user", userError);
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  console.log("[api/account/delete] admin.deleteUser result", { deleteError });

  if (deleteError) {
    console.error("[api/account/delete] deleteUser failed", deleteError);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  console.log("[api/account/delete] user deleted successfully", { userId: user.id });
  return NextResponse.json({ ok: true });
}
