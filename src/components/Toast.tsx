"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    // Auto-dismiss after 2.6s — enough to read, short enough to not linger.
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <ToastBanner key={t.id} message={t.message} variant={t.variant} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastBanner({ message, variant }: { message: string; variant: ToastVariant }) {
  const palette =
    variant === "success"
      ? "bg-emerald-500/95 text-white border-emerald-400/40 shadow-emerald-500/30"
      : "bg-rose-500/95 text-white border-rose-400/40 shadow-rose-500/30";
  const icon =
    variant === "success" ? (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5L20 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  return (
    <div
      className={`animate-toast-in pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-xl backdrop-blur-md ${palette}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}
