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
    const { error } = await admin.from("profiles").upsert({ id, role });
    console.log("[api/admin/users/:id] role upsert result", { id, role, error });
    if (error) {
      return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
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
