"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "../../../../i18n/navigation";
import { useAuth } from "../../../components/providers/AuthProvider";
import { useMembership } from "../../../../lib/useMembership";
import type { PDFDocumentProxy } from "pdfjs-dist";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

export default function NewspaperViewer() {
  const { slug } = useParams<{ slug: string }>();
  const { user, session, loading: authLoading } = useAuth();
  const { hasActiveMembership, membershipLoading } = useMembership(user, session);
  const t = useTranslations("newspaper");

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pagesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const cancelledRef = useRef(false);

  const renderPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNum: number, s: number) => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: s });

      const canvas = document.createElement("canvas");
      canvas.dataset.pageNum = String(pageNum);
      canvas.draggable = false;
      canvas.style.display = "block";
      canvas.style.boxShadow = "0 4px 20px rgba(0,0,0,0.5)";
      canvas.style.background = "white";
      canvas.style.userSelect = "none";

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d")!;
      await page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      }).promise;

      if (wrapperRef.current) {
        wrapperRef.current.appendChild(canvas);
      }
      pagesRef.current.set(pageNum, canvas);
    },
    []
  );

  const loadPdf = useCallback(async () => {
    if (!session) return;
    cancelledRef.current = false;
    setLoading(true);
    setError(false);
    pagesRef.current.clear();
    if (wrapperRef.current) wrapperRef.current.innerHTML = "";

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib
        .getDocument({
          url: `${WORKER_URL}/issues/${slug}/pdf`,
          httpHeaders: { Authorization: `Bearer ${session.access_token}` },
        })
        .promise;

      if (cancelledRef.current) return;

      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);

      const container = containerRef.current;
      if (container) {
        const firstPage = await pdf.getPage(1);
        if (cancelledRef.current) return;
        const vp = firstPage.getViewport({ scale: 1 });
        const fitScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (container.clientWidth - 48) / vp.width));
        setScale(fitScale);
        scaleRef.current = fitScale;
      }

      setLoading(false);

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelledRef.current) break;
        await renderPage(pdf, i, scaleRef.current);
      }
    } catch {
      if (!cancelledRef.current) {
        setError(true);
        setLoading(false);
      }
    }
  }, [slug, renderPage, session]);

  const rerenderAtScale = useCallback(async (s: number) => {
    const pdf = pdfRef.current;
    if (!pdf) return;
    pagesRef.current.clear();
    if (wrapperRef.current) wrapperRef.current.innerHTML = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(pdf, i, s);
    }
    const canvas = pagesRef.current.get(currentPage);
    canvas?.scrollIntoView({ block: "start" });
  }, [renderPage, currentPage]);

  useEffect(() => {
    if (authLoading || !session || membershipLoading || !hasActiveMembership) return;
    loadPdf();
    return () => { cancelledRef.current = true; };
  }, [loadPdf, authLoading, session, membershipLoading, hasActiveMembership]);

  // Detect current page from scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const mid = container.scrollTop + container.clientHeight / 2;
      for (const [num, canvas] of pagesRef.current) {
        const top = canvas.offsetTop;
        const bottom = top + canvas.offsetHeight;
        if (mid >= top && mid <= bottom) {
          setCurrentPage(num);
          break;
        }
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [numPages]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p")) {
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        applyZoom(scaleRef.current * 1.2);
      } else if (e.key === "-") {
        e.preventDefault();
        applyZoom(scaleRef.current / 1.2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  function goToPage(n: number) {
    const clamped = Math.max(1, Math.min(numPages, n));
    const canvas = pagesRef.current.get(clamped);
    canvas?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentPage(clamped);
  }

  function applyZoom(s: number) {
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    setScale(next);
    scaleRef.current = next;
    rerenderAtScale(next);
  }

  function fitWidth() {
    const pdf = pdfRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;
    pdf.getPage(1).then((page) => {
      const vp = page.getViewport({ scale: 1 });
      applyZoom((container.clientWidth - 48) / vp.width);
    });
  }

  const blockContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen bg-[#1a1a1a] items-center justify-center">
        <p className="text-[#888] text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen w-screen bg-[#1a1a1a] flex-col items-center justify-center gap-4">
        <p className="text-[#e5e5e5] text-sm">{t("loginRequired")}</p>
        <Link href="/login" className="text-sm text-[#6b9fff] hover:underline">
          {t("loginLink")}
        </Link>
      </div>
    );
  }

  if (membershipLoading) {
    return (
      <div className="flex h-screen w-screen bg-[#1a1a1a] items-center justify-center">
        <p className="text-[#888] text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (!hasActiveMembership) {
    return (
      <div className="flex h-screen w-screen bg-[#1a1a1a] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[#e5e5e5] text-sm max-w-sm">{t("membershipRequired")}</p>
        <Link href="/membership" className="text-sm text-[#6b9fff] hover:underline">
          {t("membershipLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a1a] text-[#e5e5e5] overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 md:gap-2 px-2 md:px-4 h-12 bg-[#262626] border-b border-[#333]">
        {/* Back */}
        <Link
          href="/newspaper-catalog"
          className="text-sm text-[#888] hover:text-[#e5e5e5] transition-colors mr-1 md:mr-2 shrink-0"
        >
          <svg className="md:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          <span className="hidden md:inline whitespace-nowrap">{t("backToCatalog")}</span>
        </Link>

        <div className="w-px h-5 bg-[#333] shrink-0" />

        {/* Page navigation */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || numPages === 0}
          className="px-2 md:px-3 py-1 text-sm rounded border border-transparent hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="md:hidden">‹</span>
          <span className="hidden md:inline">{t("prev")}</span>
        </button>

        <div className="flex items-center gap-1 text-sm text-[#888] min-w-17.5 md:min-w-22.5 justify-center">
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={currentPage}
            disabled={numPages === 0}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) goToPage(n);
            }}
            className="w-9 md:w-10 bg-[#1a1a1a] border border-[#333] text-[#e5e5e5] text-center text-sm rounded px-1 py-0.5 disabled:opacity-40"
          />
          <span>/ {numPages || "–"}</span>
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages || numPages === 0}
          className="px-2 md:px-3 py-1 text-sm rounded border border-transparent hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="md:hidden">›</span>
          <span className="hidden md:inline">{t("next")}</span>
        </button>

        <div className="flex-1" />

        {/* Zoom controls */}
        <button
          onClick={() => applyZoom(scale / 1.2)}
          disabled={numPages === 0}
          className="px-2 md:px-3 py-1 text-sm rounded border border-transparent hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="md:hidden">−</span>
          <span className="hidden md:inline">{t("zoomOut")}</span>
        </button>
        <span className="text-sm text-[#888] min-w-11 md:min-w-13 text-center tabular-nums">
          {numPages > 0 ? `${Math.round(scale * 100)}%` : "–"}
        </span>
        <button
          onClick={() => applyZoom(scale * 1.2)}
          disabled={numPages === 0}
          className="px-2 md:px-3 py-1 text-sm rounded border border-transparent hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="md:hidden">+</span>
          <span className="hidden md:inline">{t("zoomIn")}</span>
        </button>
        <button
          onClick={fitWidth}
          disabled={numPages === 0}
          className="hidden md:block px-3 py-1 text-sm rounded border border-transparent hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t("fit")}
        </button>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#1a1a1a] relative"
        onContextMenu={blockContextMenu}
      >
        <div
          ref={wrapperRef}
          className="flex flex-col items-center py-5 gap-4 min-h-full"
        />

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[#888] text-sm">
            {t("loading")}
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[#888] text-sm">
            {t("failedToLoad")}
          </div>
        )}
      </div>
    </div>
  );
}
