"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "../../../i18n/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";
import type { Issue } from "../../../lib/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function generateSlug(num: number | "", date: string): string {
  if (num === "" || !date) return "";
  return `issue-${String(num).padStart(3, "0")}-${date}`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function inputCls(hasError: boolean) {
  return `w-full border ${
    hasError ? "border-red-400" : "border-black/20"
  } bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors`;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="type-label text-gray-2">
        {label}
        {required && <span className="text-red-500 ml-0.5"> *</span>}
      </label>
      {children}
      {hint && <p className="type-caption text-gray-3">{hint}</p>}
      {error && <p className="type-caption text-red-600">{error}</p>}
    </div>
  );
}

type Step = "idle" | "creating" | "uploading-pdf" | "uploading-cover" | "done";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  creating: "Creating issue record…",
  "uploading-pdf": "Uploading PDF…",
  "uploading-cover": "Uploading cover image…",
  done: "",
};

export function IssueForm() {
  const { session } = useAuth();
  const { showError } = useDialog();

  const [issueNumber, setIssueNumber] = useState<number | "">("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("idle");
  const [created, setCreated] = useState<Issue | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const numRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    numRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(generateSlug(issueNumber, issueDate));
    }
  }, [issueNumber, issueDate, slugEdited]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (issueNumber === "" || issueNumber <= 0 || !Number.isInteger(issueNumber)) {
      e.issueNumber = "Must be a positive integer.";
    }
    if (!issueDate) {
      e.issueDate = "Required.";
    }
    if (!slug) {
      e.slug = "Required.";
    } else if (!SLUG_RE.test(slug)) {
      e.slug =
        "Lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const pdfObjectKey = `${slug}.pdf`;

    // 1. Create DB record
    setStep("creating");
    const { data, error: dbError } = await supabase
      .from("issues")
      .insert({
        issue_number: Number(issueNumber),
        issue_date: issueDate,
        slug,
        title: title.trim() || null,
        pdf_object_key: pdfObjectKey,
        cover_image_url: null,
        published,
      })
      .select()
      .single();

    if (dbError) {
      setStep("idle");
      const isPermission =
        dbError.code === "42501" ||
        dbError.message.toLowerCase().includes("permission");
      showError(
        isPermission
          ? "Permission denied — your account does not have admin access in the database (RLS rejected the INSERT)."
          : `Database error: ${dbError.message}`
      );
      return;
    }

    const issue = data as Issue;
    setCreated(issue);

    // 2. Upload PDF if provided
    if (pdfFile && session) {
      setStep("uploading-pdf");
      const body = new FormData();
      body.append("file", pdfFile);
      try {
        const res = await fetch(`${WORKER_URL}/admin/issues/${slug}/pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body,
        });
        if (res.ok) setPdfUploaded(true);
        else {
          const json = await res.json().catch(() => ({}));
          showError((json as { error?: string }).error ?? `PDF upload failed (${res.status})`);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error uploading PDF");
      }
    }

    // 3. Upload cover image if provided
    if (coverFile && session) {
      setStep("uploading-cover");
      const body = new FormData();
      body.append("file", coverFile);
      try {
        const res = await fetch(`${WORKER_URL}/admin/issues/${slug}/cover`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body,
        });
        if (res.ok) {
          const json = (await res.json()) as { ok: boolean; url: string };
          setCoverUrl(json.url);
        } else {
          const json = await res.json().catch(() => ({}));
          showError((json as { error?: string }).error ?? `Cover upload failed (${res.status})`);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error uploading cover");
      }
    }

    setStep("done");
  }

  function reset() {
    setIssueNumber("");
    setIssueDate(todayIso());
    setSlug("");
    setSlugEdited(false);
    setTitle("");
    setPdfFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setPublished(false);
    setErrors({});
    setStep("idle");
    setCreated(null);
    setPdfUploaded(false);
    setCoverUrl(null);
    setTimeout(() => numRef.current?.focus(), 0);
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (step === "done" && created) {
    return (
      <div className="flex flex-col gap-8 max-w-2xl">
        <div className="border border-black/15 p-6 flex flex-col gap-4">
          <p className="type-ui-medium text-green-700">
            Issue #{created.issue_number} created successfully.
          </p>
          <dl className="flex flex-col gap-2">
            {(
              [
                ["Date", created.issue_date],
                ["Slug", created.slug],
                ["PDF key", created.pdf_object_key],
                ["PDF uploaded", pdfFile ? (pdfUploaded ? "Yes" : "Failed") : "Skipped"],
                ["Cover uploaded", coverFile ? (coverUrl ? "Yes" : "Failed") : "Skipped"],
                ["Status", created.published ? "Published" : "Draft"],
              ] as [string, string][]
            ).map(([label, val]) => (
              <div key={label} className="flex gap-4">
                <dt className="type-label text-gray-2 w-28 shrink-0">{label}</dt>
                <dd className="type-body text-black">{val}</dd>
              </div>
            ))}
          </dl>

          {coverUrl && (
            <Image
              src={coverUrl}
              alt="Cover"
              width={80}
              height={112}
              className="object-cover border border-black/10"
            />
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={reset}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-6 py-3 hover:opacity-90 transition-opacity"
          >
            Create Another
          </button>
          <Link
            href="/admin"
            className="cursor-pointer border border-black/20 type-ui-medium text-black px-6 py-3 hover:bg-black hover:text-white transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const busy = step !== "idle";

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Issue number + date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Issue Number" required error={errors.issueNumber}>
            <input
              ref={numRef}
              type="number"
              min={1}
              step={1}
              value={issueNumber}
              onChange={(e) =>
                setIssueNumber(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className={inputCls(!!errors.issueNumber)}
              disabled={busy}
            />
          </Field>

          <Field label="Issue Date" required error={errors.issueDate}>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputCls(!!errors.issueDate)}
              disabled={busy}
            />
          </Field>
        </div>

        {/* Slug */}
        <Field
          label="Slug"
          required
          hint={
            slug
              ? `Public URL: ravnagorachetniks.org/issues/${slug}`
              : "Auto-generated from issue number and date. You can override it."
          }
          error={errors.slug}
        >
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            className={inputCls(!!errors.slug)}
            spellCheck={false}
            autoCapitalize="none"
            disabled={busy}
          />
        </Field>

        {/* Title */}
        <Field label="Title" hint="Optional human-readable title.">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer 2026 Issue"
            className={inputCls(false)}
            disabled={busy}
          />
        </Field>

        {/* PDF file picker */}
        <Field
          label="PDF File"
          hint={
            slug
              ? `Will be stored in R2 at key: ${slug}.pdf`
              : "Pick a PDF to upload. Key is derived from the slug above."
          }
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={busy}
              className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
            >
              {pdfFile ? pdfFile.name : "Choose PDF…"}
            </button>
            {pdfFile && (
              <button
                type="button"
                onClick={() => setPdfFile(null)}
                disabled={busy}
                className="type-caption text-gray-3 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </Field>

        {/* Cover image picker */}
        <Field
          label="Cover Image"
          hint="Optional. JPEG or PNG. Stored in R2 and linked to this issue."
        >
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setCoverFile(f);
              setCoverPreview(f ? URL.createObjectURL(f) : null);
            }}
            disabled={busy}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={busy}
              className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
            >
              {coverFile ? coverFile.name : "Choose image…"}
            </button>
            {coverFile && (
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview(null);
                }}
                disabled={busy}
                className="type-caption text-gray-3 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {coverPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt="Preview"
              width={80}
              height={112}
              className="mt-2 object-cover border border-black/10"
            />
          )}
        </Field>

        {/* Published */}
        <div className="flex items-start gap-3">
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            disabled={busy}
            className="mt-1 w-4 h-4 cursor-pointer accent-blue-2"
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="published"
              className="type-ui-medium text-black cursor-pointer"
            >
              Published
            </label>
            <p className="type-caption text-gray-2">
              Unchecked = draft, only admins can see it. Check when ready to go live.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-8 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy ? STEP_LABELS[step] : "Create Issue"}
          </button>
        </div>
      </form>
    </div>
  );
}
