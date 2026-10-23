import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../utils/cn";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sandy-muted-foreground)]" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          className="h-10 w-full rounded-lg border border-[var(--sandy-border-strong)] bg-[var(--sandy-surface)] pl-9 pr-9 text-sm text-[var(--sandy-foreground)] placeholder:text-[var(--sandy-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sandy-ring)]"
          {...props}
        />
        {onClear && typeof value === "string" && value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--sandy-muted-foreground)] hover:bg-[var(--sandy-surface-glass)] hover:text-[var(--sandy-foreground)]"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
