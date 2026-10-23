"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "../utils/cn";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-[var(--sandy-success)]" aria-hidden />,
  error: <XCircle className="size-5 text-[var(--sandy-danger)]" aria-hidden />,
  info: <Info className="size-5 text-[var(--sandy-info)]" aria-hidden />,
  warning: <TriangleAlert className="size-5 text-[var(--sandy-warning)]" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass-strong)] p-4 shadow-xl backdrop-blur-xl",
                )}
              >
                {toneIcon[toast.tone]}
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--sandy-foreground)]">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-[var(--sandy-muted-foreground)]">{toast.description}</p>
                  )}
                </div>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(toast.id)}
                  className="text-[var(--sandy-muted-foreground)] hover:text-[var(--sandy-foreground)]"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
