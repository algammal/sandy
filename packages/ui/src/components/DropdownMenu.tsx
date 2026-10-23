"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface DropdownMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setIsOpen((open) => !open)}>{trigger}</div>
      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-2 min-w-48 overflow-hidden rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass-strong)] p-1 shadow-xl backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-[var(--sandy-surface-glass)] disabled:cursor-not-allowed disabled:opacity-50",
                item.tone === "danger" ? "text-[var(--sandy-danger)]" : "text-[var(--sandy-foreground)]",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
