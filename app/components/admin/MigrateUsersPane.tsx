"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";
import { WORKER_URL } from "../../../lib/workerApi";

// Bulk-import an existing membership roster into a fresh database via the
// Worker's POST /admin/migrate-users. The Worker takes a raw CSV body and,
// per row, creates a confirmed auth user + profiles row and (optionally) a
// gift membership with no Stripe subscription. See the endpoint docs for the
// full column reference; this pane just uploads the CSV and renders the
// per-row report.

const TEMPLATE_HEADER =
  "email,password,full_name,role,email_confirm,grant_membership,price_id,membership_expiration,recipient_name,line1,line2,city,state,postal_code,country";

const EXAMPLE_CSV = `email,password,full_name,role,grant_membership,price_id,membership_expiration,line1,city,state,postal_code,country
ana@example.org,S3cret-pass-1,Ana Maric,user,true,price_1UDCrxDEShjLnPXvm6jyQckz,2027-01-01,,,,,
bo@example.org,S3cret-pass-2,Bo Kim,user,false,,,,,,,`;

const MAX_ROWS = 500;

type MigrateRow = {
  row: number;
  email: string;
  status: "created" | "skipped" | "failed";
  user_id?: string;
  membership?: "granted" | "failed" | "skipped";
  membership_id?: string;
  reason?: string;
};

type MigrateResult = {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  memberships_granted: number;
  results: MigrateRow[];
};

function statusClass(status: MigrateRow["status"]) {
  if (status === "created") return "bg-green-100 text-green-800";
  if (status === "skipped") return "bg-black/5 text-gray-2";
  return "bg-red-100 text-red-800";
}

function rowDetail(r: MigrateRow): string {
  if (r.status === "failed") return r.reason ?? "—";
  if (r.status === "skipped") return r.reason ?? "already exists";
  // created
  if (r.membership === "granted") return "membership granted";
  if (r.membership === "failed") return `membership failed: ${r.reason ?? "unknown"}`;
  if (r.membership === "skipped") return "membership skipped";
  return "user created";
}

export function MigrateUsersPane() {
  const { session } = useAuth();
  const { showError } = useDialog();

  const [csv, setCsv] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dataRowCount = useMemo(() => {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
    return Math.max(0, lines.length - 1);
  }, [csv]);

  const tooManyRows = dataRowCount > MAX_ROWS;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null);
    setCsv(await f.text());
    // Allow re-selecting the same file later.
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRun() {
    if (!session) {
      showError("Your session has expired. Sign in again.");
      return;
    }
    if (!csv.trim()) return;

    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${WORKER_URL}/admin/migrate-users`, {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: csv,
      });
      const body = await res.json().catch(() => null);

      // 200 (all rows created/skipped) and 207 (some rows failed) both carry
      // the report body; anything else is an { error } response.
      if (!res.ok) {
        showError(
          (body as { error?: string } | null)?.error ??
            `Migration failed (${res.status}).`
        );
        return;
      }

      setResult(body as MigrateResult);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error running migration.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="type-h3 text-black">Migrate Users</h2>
      <p className="type-body text-gray-2 max-w-2xl">
        Bulk-create confirmed auth users from a CSV — for importing an existing
        membership roster into a fresh database. Each row creates a user and,
        when <code>grant_membership</code> is <code>true</code>, a gift
        membership with no Stripe subscription. Re-running the same CSV is safe:
        users that already exist come back <em>skipped</em>.
      </p>

      <details className="border border-black/15 max-w-2xl">
        <summary className="cursor-pointer type-ui-medium text-black px-4 py-3 select-none">
          CSV format &amp; columns
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4 type-caption text-gray-2">
          <p>
            First row is a header (case-insensitive, any order, unknown columns
            ignored). Required: <code>email</code>, <code>password</code>{" "}
            (8–72 chars). Optional: <code>full_name</code>, <code>role</code>{" "}
            (<code>user</code>/<code>admin</code>), <code>email_confirm</code>{" "}
            (default true).
          </p>
          <p>
            Set <code>grant_membership</code> to <code>true</code> to also
            create a membership — then <code>price_id</code> (a key of the
            Worker&apos;s <code>STRIPE_PRICE_MAP</code>, starts with{" "}
            <code>price_</code>) and <code>membership_expiration</code> (any
            parseable date) are required for that row. Address columns
            (<code>recipient_name, line1, line2, city, state, postal_code,
            country</code>) are only read when the price maps to a print
            edition.
          </p>
          <p>
            Max {MAX_ROWS} rows per call. On Cloudflare&apos;s free plan the
            per-request subrequest cap means only ~12–20 rows land per call —
            split larger rosters and re-run (skips are free).
          </p>
          <pre className="overflow-x-auto bg-black/3 border border-black/10 p-3 text-black whitespace-pre">
{EXAMPLE_CSV}
          </pre>
        </div>
      </details>

      <div className="flex flex-col gap-3 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={running}
            className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            Choose CSV file…
          </button>
          <button
            type="button"
            onClick={() => { setResult(null); setCsv(TEMPLATE_HEADER + "\n"); }}
            disabled={running}
            className="cursor-pointer type-caption text-blue-2 hover:underline disabled:opacity-50"
          >
            Load header template
          </button>
          {csv.trim() && (
            <button
              type="button"
              onClick={() => { setCsv(""); setResult(null); }}
              disabled={running}
              className="cursor-pointer type-caption text-gray-2 hover:text-black disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>

        <textarea
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setResult(null); }}
          spellCheck={false}
          placeholder="Paste CSV here, or choose a file above…"
          className="w-full h-56 border border-black/20 bg-white px-3 py-2 type-caption font-mono text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors resize-y"
        />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || !csv.trim() || tooManyRows}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-7 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {running ? "Running…" : "Run migration"}
          </button>
          <span className="type-caption text-gray-2">
            {dataRowCount} data row{dataRowCount === 1 ? "" : "s"}
            {tooManyRows && ` — over the ${MAX_ROWS}-row limit, split the file`}
          </span>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-wrap gap-x-6 gap-y-1 type-body text-black border border-black/15 p-4">
            <span>Total: <strong>{result.total}</strong></span>
            <span>Created: <strong>{result.created}</strong></span>
            <span>Skipped: <strong>{result.skipped}</strong></span>
            <span>Failed: <strong>{result.failed}</strong></span>
            <span>Memberships granted: <strong>{result.memberships_granted}</strong></span>
          </div>

          {result.failed > 0 && (
            <p className="type-caption text-gray-2">
              Some rows failed — see the report below. Fix those rows and re-run;
              rows that already succeeded will come back skipped.
            </p>
          )}

          <div className="border border-black/10 overflow-x-auto">
            <div className="min-w-2xl divide-y divide-black/10">
              <div className="grid grid-cols-[3rem_1fr_6rem_1fr] gap-3 px-4 py-2 bg-black/3 type-label text-gray-2 uppercase tracking-widest">
                <span>#</span>
                <span>Email</span>
                <span>Status</span>
                <span>Details</span>
              </div>
              {result.results.map((r) => (
                <div
                  key={r.row}
                  className="grid grid-cols-[3rem_1fr_6rem_1fr] gap-3 px-4 py-2 items-center"
                >
                  <span className="type-caption text-gray-2">{r.row}</span>
                  <span className="type-caption text-black truncate">{r.email}</span>
                  <span>
                    <span className={`type-caption px-2 py-0.5 ${statusClass(r.status)}`}>
                      {r.status}
                    </span>
                  </span>
                  <span className="type-caption text-gray-2 wrap-break-word">{rowDetail(r)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
