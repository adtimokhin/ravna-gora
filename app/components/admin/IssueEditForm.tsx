"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";
import type { Issue } from "../../../lib/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

function inputCls(hasError: boolean) {
  return `w-full border ${
    hasError ? "border-red-400" : "border-black/20"
  } bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors`;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="type-label text-gray-2">{label}</label>
      {children}
      {hint && <p className="type-caption text-gray-3">{hint}</p>}
      {error && <p className="type-caption text-red-600">{error}</p>}
    </div>
  );
}

interface Props {
  issue: Issue;
}

export function IssueEditForm({ issue }: Props) {
  const { session } = useAuth();
  const { showError } = useDialog();

  const [issueNumber, setIssueNumber] = useState<number | "">(issue.issue_number);
  const [issueDate, setIssueDate] = useState(issue.issue_date);
  const [title, setTitle] = useState(issue.title ?? "");
  const [published, setPublished] = useState(issue.published);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(issue.cover_image_url);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (issueNumber === "" || issueNumber <= 0 || !Number.isInteger(issueNumber)) {
      e.issueNumber = "Must be a positive integer.";
    }
    if (!issueDate) e.issueDate = "Required.";
    return e;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setErrors({});

    const { error: dbErr } = await supabase
      .from("issues")
      .update({
        issue_number: Number(issueNumber),
        issue_date: issueDate,
        title: title.trim() || null,
        published,
      })
      .eq("id", issue.id);

    setSaving(false);

    if (dbErr) {
      showError(dbErr.message);
      return;
    }

    setSavedAt(new Date().toLocaleTimeString());
  }

  async function handlePdfUpload() {
    if (!pdfFile || !session) return;
    setUploadingPdf(true);

    const body = new FormData();
    body.append("file", pdfFile);
    try {
      const res = await fetch(`${WORKER_URL}/admin/issues/${issue.slug}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      if (res.ok) {
        setPdfFile(null);
      } else {
        const json = await res.json().catch(() => ({}));
        showError((json as { error?: string }).error ?? `Upload failed (${res.status})`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    }
    setUploadingPdf(false);
  }

  async function handleCoverUpload() {
    if (!coverFile || !session) return;
    setUploadingCover(true);

    const body = new FormData();
    body.append("file", coverFile);
    try {
      const res = await fetch(`${WORKER_URL}/admin/issues/${issue.slug}/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; url: string };
        setCoverUrl(json.url);
        setCoverFile(null);
        setCoverPreview(null);
      } else {
        const json = await res.json().catch(() => ({}));
        showError((json as { error?: string }).error ?? `Upload failed (${res.status})`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    }
    setUploadingCover(false);
  }

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      {/* Immutable info */}
      <div className="border border-black/10 p-4 flex flex-col gap-2 bg-black/[0.02]">
        <p className="type-label text-gray-2 uppercase tracking-widest mb-1">Read-only</p>
        {(
          [
            ["Slug", issue.slug],
            ["PDF key", issue.pdf_object_key],
            ["Created", new Date(issue.created_at).toLocaleString()],
          ] as [string, string][]
        ).map(([label, val]) => (
          <div key={label} className="flex gap-4">
            <dt className="type-label text-gray-3 w-20 shrink-0">{label}</dt>
            <dd className="type-body text-black font-mono text-sm">{val}</dd>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <form onSubmit={handleSave} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Issue Number" error={errors.issueNumber}>
            <input
              type="number"
              min={1}
              step={1}
              value={issueNumber}
              onChange={(e) =>
                setIssueNumber(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputCls(!!errors.issueNumber)}
            />
          </Field>
          <Field label="Issue Date" error={errors.issueDate}>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputCls(!!errors.issueDate)}
            />
          </Field>
        </div>

        <Field label="Title" hint="Optional human-readable title.">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer 2026 Issue"
            className={inputCls(false)}
          />
        </Field>

        <div className="flex items-start gap-3">
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-1 w-4 h-4 cursor-pointer accent-blue-2"
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="published" className="type-ui-medium text-black cursor-pointer">
              Published
            </label>
            <p className="type-caption text-gray-2">
              Unchecked = draft, only admins can see it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-8 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {savedAt && (
            <p className="type-caption text-green-700">Saved at {savedAt}</p>
          )}
        </div>
      </form>

      <div className="h-px bg-black/10" />

      {/* PDF re-upload */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="type-ui-medium text-black">Replace PDF</p>
          <p className="type-caption text-gray-3">
            Overwrites the existing file in R2 at <code>{issue.pdf_object_key}</code>
          </p>
        </div>
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            disabled={uploadingPdf}
            className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            {pdfFile ? pdfFile.name : "Choose PDF…"}
          </button>
          {pdfFile && (
            <>
              <button
                type="button"
                onClick={handlePdfUpload}
                disabled={uploadingPdf}
                className="cursor-pointer bg-blue-2 text-white type-ui-medium px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {uploadingPdf ? "Uploading…" : "Upload PDF"}
              </button>
              <button
                type="button"
                onClick={() => setPdfFile(null)}
                disabled={uploadingPdf}
                className="type-caption text-gray-3 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      <div className="h-px bg-black/10" />

      {/* Cover re-upload */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="type-ui-medium text-black">Replace Cover Image</p>
          <p className="type-caption text-gray-3">
            Overwrites the existing cover in R2 and updates the record.
          </p>
        </div>
        {coverUrl && !coverPreview && (
          <Image
            src={coverUrl}
            alt="Current cover"
            width={80}
            height={112}
            className="object-cover border border-black/10"
          />
        )}
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
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            {coverFile ? coverFile.name : "Choose image…"}
          </button>
          {coverFile && (
            <>
              <button
                type="button"
                onClick={handleCoverUpload}
                disabled={uploadingCover}
                className="cursor-pointer bg-blue-2 text-white type-ui-medium px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {uploadingCover ? "Uploading…" : "Upload cover"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview(null);
                }}
                disabled={uploadingCover}
                className="type-caption text-gray-3 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </>
          )}
        </div>
        {coverPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPreview}
            alt="Preview"
            width={80}
            height={112}
            className="object-cover border border-black/10"
          />
        )}
      </div>
    </div>
  );
}
