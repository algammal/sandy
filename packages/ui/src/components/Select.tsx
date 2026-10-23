import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border bg-[var(--sandy-surface)] px-3 pr-9 text-sm text-[var(--sandy-foreground)]",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError
              ? "border-[var(--sandy-danger)] focus-visible:ring-[var(--sandy-danger)]"
              : "border-[var(--sandy-border-strong)]",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sandy-muted-foreground)]"
          aria-hidden
        />
      </div>
    );
  },
);
Select.displayName = "Select";
