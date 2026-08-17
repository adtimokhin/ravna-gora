import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Requires SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role
// in the Supabase dashboard) — not the anon key used elsewhere in the app.
// The identity of the caller is verified from their own access token before
// anything is deleted, so this route can't be used to delete another user.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
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

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured on this deployment." },
      { status: 500 }
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
