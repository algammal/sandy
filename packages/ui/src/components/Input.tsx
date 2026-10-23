import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border bg-[var(--sandy-surface)] px-3 text-sm text-[var(--sandy-foreground)] placeholder:text-[var(--sandy-muted-foreground)]",
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
Input.displayName = "Input";
