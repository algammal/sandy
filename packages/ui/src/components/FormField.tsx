import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Wraps a single form control with a label, required indicator, hint and inline error. */
export function FormField({ label, htmlFor, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--sandy-foreground)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--sandy-danger)]">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-[var(--sandy-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--sandy-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
