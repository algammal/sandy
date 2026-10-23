import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--sandy-danger)]/30 bg-[var(--sandy-danger-bg)] px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--sandy-danger)]/15 text-[var(--sandy-danger)]">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--sandy-foreground)]">{title}</p>
        {description && <p className="max-w-sm text-sm text-[var(--sandy-muted-foreground)]">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
