"use client";

import type { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { Checkbox, Input } from "@sandy/ui";
import { titleCase } from "@sandy/shared-utils";
import type { BusinessProfileFormValues } from "./schema";

export interface WorkingHoursEditorProps {
  fieldArray: UseFieldArrayReturn<BusinessProfileFormValues, "workingHours">;
  register: UseFormRegister<BusinessProfileFormValues>;
  watchedHours: BusinessProfileFormValues["workingHours"];
}

export function WorkingHoursEditor({ fieldArray, register, watchedHours }: WorkingHoursEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {fieldArray.fields.map((field, index) => {
        const isClosed = watchedHours[index]?.closed;
        return (
          <div key={field.id} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-[var(--sandy-border)] p-3 sm:grid-cols-[120px_auto_1fr_1fr]">
            <span className="text-sm font-medium text-[var(--sandy-foreground)]">{titleCase(field.day)}</span>
            <Checkbox label="Closed" {...register(`workingHours.${index}.closed`)} />
            <Input type="time" disabled={isClosed} {...register(`workingHours.${index}.openTime`)} />
            <Input type="time" disabled={isClosed} {...register(`workingHours.${index}.closeTime`)} />
          </div>
        );
      })}
    </div>
  );
}
