"use client";

import { cn } from "../utils/cn";

export interface TabItem {
  value: string;
  label: string;
  badge?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] p-1",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--sandy-surface)] text-[var(--sandy-foreground)] shadow-sm"
                : "text-[var(--sandy-muted-foreground)] hover:text-[var(--sandy-foreground)]",
            )}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="rounded-full bg-[var(--sandy-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sandy-primary)]">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
