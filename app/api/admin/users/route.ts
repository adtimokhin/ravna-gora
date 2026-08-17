import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";

export async function GET(request: Request) {
  console.log("[api/admin/users] request received");

  const auth = await requireAdmin(request);
  if ("error" in auth) {
    console.error("[api/admin/users] requireAdmin rejected", auth);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { admin } = auth;

  const { data: userList, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  console.log("[api/admin/users] listUsers result", {
    count: userList?.users.length,
    listError,
  });

  if (listError) {
    return NextResponse.json({ error: "Failed to list users." }, { status: 500 });
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, role");
  console.log("[api/admin/users] profiles fetch", {
    count: profiles?.length,
    profilesError,
  });

  if (profilesError) {
    return NextResponse.json({ error: "Failed to load roles." }, { status: 500 });
  }

  const roleById = new Map<string, string>(
    (profiles ?? []).map((p: { id: string; role: string | null }) => [p.id, p.role ?? "user"])
  );

  const users = userList.users.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
    role: roleById.get(u.id) ?? "user",
    banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  }));

  console.log("[api/admin/users] responding", { count: users.length });
  return NextResponse.json({ users });
}
