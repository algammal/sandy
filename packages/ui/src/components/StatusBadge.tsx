import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-[var(--sandy-border)] text-[var(--sandy-muted-foreground)]",
  info: "bg-[var(--sandy-info-bg)] text-[var(--sandy-info)]",
  success: "bg-[var(--sandy-success-bg)] text-[var(--sandy-success)]",
  warning: "bg-[var(--sandy-warning-bg)] text-[var(--sandy-warning)]",
  danger: "bg-[var(--sandy-danger-bg)] text-[var(--sandy-danger)]",
  primary: "bg-[var(--sandy-primary)]/15 text-[var(--sandy-primary)]",
};

export function StatusBadge({ label, tone = "neutral", icon, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
