import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-24 w-full rounded-lg border bg-[var(--sandy-surface)] px-3 py-2 text-sm text-[var(--sandy-foreground)] placeholder:text-[var(--sandy-muted-foreground)]",
          "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasError
            ? "border-[var(--sandy-danger)] focus-visible:ring-[var(--sandy-danger)]"
            : "border-[var(--sandy-border-strong)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
