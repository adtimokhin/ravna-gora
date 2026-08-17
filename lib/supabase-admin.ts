import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Lazy so importing this module never throws when SUPABASE_SERVICE_ROLE_KEY
// isn't set (e.g. a deployment that doesn't need admin-privileged calls yet)
// — callers check for `null` and degrade instead of crashing on import.
export function getSupabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  if (!cached) {
    cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
