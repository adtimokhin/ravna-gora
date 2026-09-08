import { supabase } from "./supabase";

// The Cloudflare Worker API origin (delicate-term-de7d). Same value the
// newspaper pages already read for /issues and /covers — see
// app/[locale]/newspaper-catalog/page.tsx.
export const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

type WorkerFetchInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  // The caller's Supabase access token. Pass `session.access_token` when a
  // component already has it from useAuth(); omit it to let this helper read
  // the current session itself.
  authToken?: string | null;
};

// Thin wrapper around fetch() for authenticated Worker calls: attaches the
// Supabase Bearer token, JSON-encodes the body, and throws Error(message)
// built from the Worker's `{ error }` payload when the response isn't ok.
export async function workerFetch<T = unknown>(
  path: string,
  init: WorkerFetchInit = {}
): Promise<T> {
  const { body, authToken, headers, ...rest } = init;

  let token = authToken;
  if (token === undefined) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  }

  const res = await fetch(`${WORKER_URL}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
