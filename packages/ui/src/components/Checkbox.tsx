import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "../utils/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 text-sm text-[var(--sandy-foreground)]">
        <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={cn(
              "peer size-5 shrink-0 appearance-none rounded-md border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface)]",
              "checked:border-[var(--sandy-primary)] checked:bg-[var(--sandy-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute size-3.5 text-[var(--sandy-primary-foreground)] opacity-0 peer-checked:opacity-100"
            aria-hidden
          />
        </span>
        {label}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
