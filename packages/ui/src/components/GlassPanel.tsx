import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  padded?: boolean;
}

/** The base frosted-glass surface used by cards, headers, sidebars and dialogs. */
export function GlassPanel({ strong, padded = true, className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--sandy-border)] shadow-[0_8px_30px_var(--sandy-shadow-color)] backdrop-blur-xl",
        strong ? "bg-[var(--sandy-surface-glass-strong)]" : "bg-[var(--sandy-surface-glass)]",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
