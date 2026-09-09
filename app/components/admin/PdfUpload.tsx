"use client";

import { useState, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";

interface Props {
  slug: string;
  pdfObjectKey: string;
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

export function PdfUpload({ slug, pdfObjectKey }: Props) {
  const { session } = useAuth();
  const { showError } = useDialog();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !session) return;
    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch(`${WORKER_URL}/admin/issues/${slug}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showError((json as { error?: string }).error ?? `Upload failed (${res.status})`);
        return;
      }

      setDone(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <p className="type-caption text-green-700">
        PDF uploaded to R2 at <code>{pdfObjectKey}</code>
      </p>
    );
  }

  if (!session) {
    return (
      <p className="type-caption text-gray-2">
        Not signed in — cannot upload.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
        >
          {file ? file.name : "Choose PDF file"}
        </button>
        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </button>
        )}
      </div>
      <p className="type-caption text-gray-3">
        Will be stored in R2 at key <code>{pdfObjectKey}</code>
      </p>
    </div>
  );
}
