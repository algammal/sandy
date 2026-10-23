import { cn } from "../utils/cn";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export function RadioGroup({ name, value, onChange, options, className, orientation = "vertical" }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(orientation === "vertical" ? "flex flex-col gap-2" : "flex flex-wrap gap-3", className)}
    >
      {options.map((option) => {
        const inputId = `${name}-${option.value}`;
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              checked
                ? "border-[var(--sandy-primary)] bg-[var(--sandy-primary)]/10"
                : "border-[var(--sandy-border-strong)] hover:border-[var(--sandy-border-strong)] hover:bg-[var(--sandy-surface-glass)]",
            )}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--sandy-primary)]"
            />
            <span>
              <span className="block font-medium text-[var(--sandy-foreground)]">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-[var(--sandy-muted-foreground)]">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
