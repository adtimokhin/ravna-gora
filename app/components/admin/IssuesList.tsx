"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "../../../i18n/navigation";
import { supabase } from "../../../lib/supabase";
import type { Issue } from "../../../lib/types";
import { YearRangeSlider } from "./YearRangeSlider";
import {
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  SortTriangleUp,
  SortTriangleDown,
} from "./icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIssueDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function formatMonthYear(dateStr: string): string {
  const d = parseIssueDate(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDate(dateStr: string): string {
  return parseIssueDate(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Small status marker — a delayed tooltip explains it rather than a
// permanently-visible badge, so the row stays quiet until you ask.
function StatusDot({ published }: { published: boolean }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleEnter() {
    timerRef.current = setTimeout(() => setShow(true), 2000);
  }
  function handleLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setShow(false);
  }

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          published ? "bg-green-500" : "bg-orange-500"
        }`}
      />
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap bg-black text-white type-caption px-2 py-1 z-20 pointer-events-none">
          {published ? "Published" : "Draft"}
        </span>
      )}
    </span>
  );
}

type SortKey = "issue_number" | "issue_date" | "name";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="cursor-pointer flex items-center type-label text-gray-2 uppercase tracking-widest hover:text-black transition-colors"
    >
      {label}
      {active ? (
        <span className="ml-1 text-blue-2">
          {dir === "asc" ? <SortTriangleUp /> : <SortTriangleDown />}
        </span>
      ) : (
        <span className="flex flex-col gap-px ml-1 opacity-25">
          <SortTriangleUp />
          <SortTriangleDown />
        </span>
      )}
    </button>
  );
}

const GRID = "grid grid-cols-[64px_120px_1fr_260px] gap-4 px-4 items-center";
const MIN_YEAR = 1950;

export function IssuesList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("issue_number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const currentYear = new Date().getFullYear();
  const [yearFrom, setYearFrom] = useState(MIN_YEAR);
  const [yearTo, setYearTo] = useState(currentYear);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("issues")
      .select("*")
      .order("issue_number", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setIssues((data as Issue[]) ?? []);
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function togglePublished(issue: Issue) {
    setBusyId(issue.id);
    const { error: err } = await supabase
      .from("issues")
      .update({ published: !issue.published })
      .eq("id", issue.id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id ? { ...i, published: !issue.published } : i
      )
    );
  }

  // UNDONE: deleting an issue only removes the Supabase row — it doesn't
  // touch the PDF/cover files this issue owns in Cloudflare R2 (those live
  // behind the worker, outside this repo), so a real delete here would leave
  // orphaned files behind. Disabled until that cleanup story exists on the
  // Supabase + Cloudflare side.
  // TODO: re-enable this once issue deletion also cleans up the associated
  // R2 objects (pdf_object_key + cover) via the worker, and a DELETE RLS
  // policy for admins on `issues` is confirmed/added in Supabase.
  async function deleteIssue(issue: Issue) {
    window.alert(
      `Deleting issue #${issue.issue_number} isn't available yet — it needs a matching cleanup step on the Supabase/Cloudflare side first.`
    );
    return;

    /*
    const label = issue.title || formatMonthYear(issue.issue_date);
    if (
      !window.confirm(
        `Delete issue #${issue.issue_number} (${label})? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(issue.id);
    const { error: err } = await supabase.from("issues").delete().eq("id", issue.id);
    setBusyId(null);
    if (err) {
      const isPermission =
        err.code === "42501" || err.message.toLowerCase().includes("permission");
      setError(
        isPermission
          ? "Permission denied — your account does not have delete access in the database (RLS rejected the DELETE)."
          : err.message
      );
      return;
    }
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    */
  }

  const visibleIssues = useMemo(() => {
    const filtered = issues.filter((issue) => {
      const year = parseIssueDate(issue.issue_date).getFullYear();
      return year >= yearFrom && year <= yearTo;
    });

    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === "issue_number") cmp = a.issue_number - b.issue_number;
      else if (sortKey === "issue_date") cmp = a.issue_date.localeCompare(b.issue_date);
      else cmp = formatMonthYear(a.issue_date).localeCompare(formatMonthYear(b.issue_date));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [issues, yearFrom, yearTo, sortKey, sortDir]);

  if (loading) {
    return <p className="type-body text-gray-3">Loading issues…</p>;
  }

  if (error && issues.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="type-caption text-red-600">{error}</p>
        <button
          onClick={fetchIssues}
          className="type-caption text-blue-2 hover:underline self-start"
        >
          Retry
        </button>
      </div>
    );
  }

  if (issues.length === 0) {
    return <p className="type-body text-gray-3">No issues yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <YearRangeSlider
        from={yearFrom}
        to={yearTo}
        min={MIN_YEAR}
        max={currentYear}
        onChange={(f, t) => {
          setYearFrom(f);
          setYearTo(t);
        }}
      />

      {error && (
        <div className="flex items-center gap-3">
          <p className="type-caption text-red-600">{error}</p>
          <button onClick={fetchIssues} className="type-caption text-blue-2 hover:underline">
            Retry
          </button>
        </div>
      )}

      <div className="border border-black/10 overflow-x-auto">
        <div className="min-w-160">
          <div className={`${GRID} py-3 border-b border-black/10 bg-black/2`}>
            <SortHeader label="#" sortKey="issue_number" activeKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortHeader label="Date" sortKey="issue_date" activeKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortHeader label="Name" sortKey="name" activeKey={sortKey} dir={sortDir} onClick={handleSort} />
            <p className="type-label text-gray-2 uppercase tracking-widest">Actions</p>
          </div>

          {visibleIssues.length === 0 ? (
            <p className="type-body text-gray-3 px-4 py-6">
              No issues in the selected year range.
            </p>
          ) : (
            visibleIssues.map((issue) => {
              const busy = busyId === issue.id;
              return (
                <div
                  key={issue.id}
                  className={`${GRID} py-3 border-b border-black/5 last:border-b-0 transition-colors even:bg-black/2 hover:bg-black/5`}
                >
                  <span className="type-ui-medium text-black">#{issue.issue_number}</span>
                  <span className="type-caption text-gray-2">{formatDate(issue.issue_date)}</span>

                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot published={issue.published} />
                    <Link
                      href={`/admin/issues/${issue.slug}`}
                      className="type-ui-medium text-black underline truncate hover:text-blue-2 transition-colors"
                    >
                      {formatMonthYear(issue.issue_date)}
                    </Link>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <Link
                      href={`/newspaper/${issue.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer flex items-center gap-1.5 type-caption text-black hover:text-blue-2 transition-colors"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <button
                      onClick={() => togglePublished(issue)}
                      disabled={busy}
                      className="cursor-pointer flex items-center gap-1.5 type-caption text-black hover:text-blue-2 transition-colors disabled:opacity-50"
                    >
                      {issue.published ? (
                        <EyeOffIcon className="w-3.5 h-3.5" />
                      ) : (
                        <EyeIcon className="w-3.5 h-3.5" />
                      )}
                      {issue.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => deleteIssue(issue)}
                      disabled={busy}
                      className="cursor-pointer flex items-center gap-1.5 type-caption text-red-700 hover:text-red-900 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
