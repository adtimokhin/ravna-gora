"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

// How long the exit transition runs before the dialog unmounts. Keep in sync
// with the `duration-150` classes below.
const EXIT_MS = 150;

export type DialogTone = "error" | "info" | "success";

export type DialogAction = {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  // Close the dialog after `onClick` runs. Default: true. Set false for an
  // action that needs the dialog to stay open (it can call `closeDialog()`
  // itself later).
  closeOnClick?: boolean;
};

export type DialogOptions = {
  title?: string;
  message: React.ReactNode;
  tone?: DialogTone;
  actions?: DialogAction[];
  // Fired once whenever the dialog closes — via the cross, the backdrop,
  // the Escape key, or an action button.
  onClose?: () => void;
  // Allow dismissing via cross / backdrop / Escape. Default: true. When
  // false, the only way out is an action button.
  dismissible?: boolean;
};

type DialogContextValue = {
  showDialog: (opts: DialogOptions) => void;
  // Shorthand for an error-toned dialog: `showError("Could not save.")`.
  showError: (
    message: React.ReactNode,
    opts?: Omit<DialogOptions, "message" | "tone">
  ) => void;
  closeDialog: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within <DialogProvider>");
  }
  return ctx;
}

function ToneIcon({ tone }: { tone: DialogTone }) {
  const color =
    tone === "error" ? "text-red-600" : tone === "success" ? "text-green-700" : "text-blue-2";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`w-6 h-6 shrink-0 ${color}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      {tone === "success" ? (
        <path
          d="M8.5 12.5l2.5 2.5 4.5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function actionClass(variant: NonNullable<DialogAction["variant"]>) {
  const base =
    "cursor-pointer type-ui-medium px-5 py-2.5 text-center transition-opacity transition-colors";
  if (variant === "primary") return `${base} bg-blue-2 text-white hover:opacity-90`;
  if (variant === "danger") return `${base} bg-red-600 text-white hover:opacity-90`;
  return `${base} border border-black/25 text-black hover:bg-black/5`;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");

  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const dialogRef = useRef<DialogOptions | null>(null);
  const closedRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);

  // Clear any pending exit timer if the provider unmounts mid-transition.
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

  const showDialog = useCallback((opts: DialogOptions) => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    if (typeof document !== "undefined") {
      restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    }
    closedRef.current = false;
    setDialog(opts);
  }, []);

  const showError = useCallback<DialogContextValue["showError"]>(
    (message, opts) => showDialog({ ...opts, message, tone: "error" }),
    [showDialog]
  );

  const closeDialog = useCallback(() => {
    if (closedRef.current || !dialogRef.current) return;
    closedRef.current = true;
    dialogRef.current.onClose?.();
    setVisible(false);
    exitTimer.current = setTimeout(() => {
      setDialog(null);
      const el = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (el && typeof document !== "undefined" && document.contains(el)) {
        el.focus();
      }
    }, EXIT_MS);
  }, []);

  // Play the enter transition on the frame after the dialog mounts.
  useEffect(() => {
    if (!dialog) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [dialog]);

  // While a dialog is open: Escape to close, lock body scroll, move focus in.
  useEffect(() => {
    if (!dialog) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialog.dismissible !== false) closeDialog();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusId = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(focusId);
    };
  }, [dialog, closeDialog]);

  const tone: DialogTone = dialog?.tone ?? "info";
  const heading =
    dialog?.title ?? (tone === "error" ? t("errorTitle") : undefined);
  const dismissible = dialog ? dialog.dismissible !== false : true;
  const actions: DialogAction[] =
    dialog?.actions && dialog.actions.length > 0
      ? dialog.actions
      : [{ label: t("dismiss"), variant: "primary" }];

  return (
    <DialogContext.Provider value={{ showDialog, showError, closeDialog }}>
      {children}

      {dialog && typeof document !== "undefined"
        ? createPortal(
            <div
              onMouseDown={(e) => {
                if (dismissible && e.target === e.currentTarget) closeDialog();
              }}
              className={`fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/10 transition-opacity duration-150 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                ref={panelRef}
                role={tone === "error" ? "alertdialog" : "dialog"}
                aria-modal="true"
                aria-labelledby={heading ? "app-dialog-title" : undefined}
                aria-describedby="app-dialog-desc"
                tabIndex={-1}
                className={`relative w-full max-w-md bg-white border border-black/10 shadow-xl outline-none p-6 md:p-7 flex flex-col gap-4 transition-all duration-150 ${
                  visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-[0.98]"
                }`}
              >
                {dismissible && (
                  <button
                    type="button"
                    onClick={closeDialog}
                    aria-label={t("close")}
                    className="cursor-pointer absolute right-3 top-3 p-1 text-gray-2 hover:text-black transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}

                <div className="flex items-start gap-3 pr-6">
                  <ToneIcon tone={tone} />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {heading && (
                      <h2 id="app-dialog-title" className="type-h4 text-black">
                        {heading}
                      </h2>
                    )}
                    <div id="app-dialog-desc" className="type-body text-gray-2 wrap-break-word">
                      {dialog.message}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-1">
                  {actions.map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        action.onClick?.();
                        if (action.closeOnClick !== false) closeDialog();
                      }}
                      className={actionClass(
                        action.variant ?? (i === actions.length - 1 ? "primary" : "secondary")
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </DialogContext.Provider>
  );
}
