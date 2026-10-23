import { Checkbox } from "./Checkbox";
import { cn } from "../utils/cn";

export interface CheckboxGroupOption {
  value: string;
  label: string;
}

export interface CheckboxGroupProps {
  options: CheckboxGroupOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  emptyLabel?: string;
}

export function CheckboxGroup({ options, value, onChange, className, emptyLabel }: CheckboxGroupProps) {
  if (options.length === 0) {
    return <p className="text-sm text-[var(--sandy-muted-foreground)]">{emptyLabel ?? "No options available."}</p>;
  }

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          label={option.label}
          checked={value.includes(option.value)}
          onChange={() => toggle(option.value)}
        />
      ))}
    </div>
  );
}
