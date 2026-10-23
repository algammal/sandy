"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--sandy-border)] bg-[var(--sandy-surface-glass-strong)] p-6 shadow-2xl backdrop-blur-xl animate-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--sandy-foreground)]">{title}</h2>
          <IconButton icon={<X className="size-4" />} label="Close panel" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--sandy-border)] pt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
