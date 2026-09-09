"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";

interface Props {
  slug: string;
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

export function CoverImageUpload({ slug }: Props) {
  const { session } = useAuth();
  const { showError } = useDialog();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file || !session) return;
    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch(`${WORKER_URL}/admin/issues/${slug}/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showError((json as { error?: string }).error ?? `Upload failed (${res.status})`);
        return;
      }

      const json = (await res.json()) as { ok: boolean; url: string };
      setPublicUrl(json.url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  if (publicUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="type-caption text-green-700">Cover image uploaded.</p>
        <Image
          src={publicUrl}
          alt="Cover"
          width={80}
          height={112}
          className="object-cover border border-black/10"
        />
      </div>
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
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer border border-black/20 type-ui-medium text-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
        >
          {file ? file.name : "Choose image"}
        </button>
        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="cursor-pointer bg-blue-2 text-white type-ui-medium px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload cover"}
          </button>
        )}
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Preview"
          width={80}
          height={112}
          className="object-cover border border-black/10"
        />
      )}
      <p className="type-caption text-gray-3">
        Stored in R2 at <code>covers/{slug}.&lt;ext&gt;</code> and linked to this issue.
      </p>
    </div>
  );
}
