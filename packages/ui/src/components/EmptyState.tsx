import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--sandy-border-strong)] px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--sandy-primary)]/10 text-[var(--sandy-primary)]">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[var(--sandy-foreground)]">{title}</p>
        {description && <p className="max-w-sm text-sm text-[var(--sandy-muted-foreground)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
