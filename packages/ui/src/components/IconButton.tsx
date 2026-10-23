import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";
import type { ButtonVariant } from "./Button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--sandy-primary)] text-[var(--sandy-primary-foreground)] hover:bg-[var(--sandy-primary-strong)]",
  secondary: "bg-[var(--sandy-surface-glass-strong)] border border-[var(--sandy-border)] text-[var(--sandy-foreground)]",
  outline: "border border-[var(--sandy-border-strong)] text-[var(--sandy-foreground)] hover:bg-[var(--sandy-surface-glass)]",
  ghost: "text-[var(--sandy-muted-foreground)] hover:bg-[var(--sandy-surface-glass)] hover:text-[var(--sandy-foreground)]",
  danger: "bg-[var(--sandy-danger)] text-white hover:brightness-110",
};

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
};

/** An accessible icon-only button. Always pass a descriptive `label` for screen readers. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = "ghost", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
