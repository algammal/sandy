import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--sandy-primary)] text-[var(--sandy-primary-foreground)] hover:bg-[var(--sandy-primary-strong)] shadow-sm shadow-[var(--sandy-ring)]",
  secondary:
    "bg-[var(--sandy-surface-glass-strong)] text-[var(--sandy-foreground)] border border-[var(--sandy-border)] hover:border-[var(--sandy-border-strong)]",
  outline:
    "bg-transparent border border-[var(--sandy-border-strong)] text-[var(--sandy-foreground)] hover:bg-[var(--sandy-surface-glass)]",
  ghost: "bg-transparent text-[var(--sandy-foreground)] hover:bg-[var(--sandy-surface-glass)]",
  danger: "bg-[var(--sandy-danger)] text-white hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sandy-background)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
