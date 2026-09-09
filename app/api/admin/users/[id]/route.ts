import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";

// A permanent-enough ban. Supabase requires a duration string rather than a
// boolean; "none" is the sentinel value that lifts a ban.
const BAN_DURATION = "876000h"; // 100 years

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("[api/admin/users/:id] request received", { id });

  const auth = await requireAdmin(request);
  if ("error" in auth) {
    console.error("[api/admin/users/:id] requireAdmin rejected", auth);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user: caller, admin } = auth;

  if (id === caller.id) {
    console.warn("[api/admin/users/:id] refusing self-modification", { id });
    return NextResponse.json(
      { error: "You can't change your own role or account status." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  console.log("[api/admin/users/:id] body", body);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { role, banned } = body as { role?: string; banned?: boolean };

  if (role !== undefined) {
    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    // Plain UPDATE, not upsert: it touches only `role`, leaving NOT NULL
    // columns (profiles.email) alone. An upsert compiles to INSERT … ON
    // CONFLICT, and Postgres enforces NOT NULL on the candidate insert row
    // before the conflict turns it into an update — so `{ id, role }` fails
    // with 23502 on profiles.email even when the row already exists.
    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("id");
    console.log("[api/admin/users/:id] role update result", {
      id,
      role,
      rows: updated?.length ?? 0,
      updateError,
    });
    if (updateError) {
      return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
    }

    // No profiles row yet (e.g. a user created before the signup trigger, or
    // one the trigger missed) — create one, supplying the NOT NULL email.
    if (!updated || updated.length === 0) {
      const { data: authUser, error: lookupError } = await admin.auth.admin.getUserById(id);
      if (lookupError || !authUser?.user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      const { error: insertError } = await admin.from("profiles").insert({
        id,
        email: authUser.user.email ?? "",
        full_name: (authUser.user.user_metadata?.full_name as string | undefined) ?? "",
        role,
      });
      console.log("[api/admin/users/:id] role insert fallback", { id, role, insertError });
      if (insertError) {
        return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
      }
    }
  }

  if (banned !== undefined) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: banned ? BAN_DURATION : "none",
    });
    console.log("[api/admin/users/:id] ban update result", { id, banned, error });
    if (error) {
      return NextResponse.json({ error: "Failed to update account status." }, { status: 500 });
    }
  }

  console.log("[api/admin/users/:id] success", { id });
  return NextResponse.json({ ok: true });
}
