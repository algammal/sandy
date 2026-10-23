import type { JsonDiffEntry } from "@sandy/shared-types";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../utils/cn";

export interface JsonDiffViewerProps {
  entries: JsonDiffEntry[];
  showUnchanged?: boolean;
}

function renderValue(value: unknown) {
  if (value === undefined) return <span className="text-[var(--sandy-muted-foreground)]">—</span>;
  return <code className="whitespace-pre-wrap break-all">{JSON.stringify(value)}</code>;
}

const kindTone = {
  added: "success",
  removed: "danger",
  changed: "warning",
  unchanged: "neutral",
} as const;

export function JsonDiffViewer({ entries, showUnchanged = false }: JsonDiffViewerProps) {
  const visibleEntries = showUnchanged ? entries : entries.filter((entry) => entry.kind !== "unchanged");

  if (visibleEntries.length === 0) {
    return <p className="text-sm text-[var(--sandy-muted-foreground)]">No differences to display.</p>;
  }

  return (
    <div className="divide-y divide-[var(--sandy-border)] rounded-xl border border-[var(--sandy-border)]">
      {visibleEntries.map((entry) => (
        <div key={entry.path} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge label={entry.kind} tone={kindTone[entry.kind]} />
            <code className="text-xs font-medium text-[var(--sandy-foreground)]">{entry.path}</code>
          </div>
          <div
            className={cn(
              "grid gap-1 text-xs sm:max-w-sm sm:text-right",
              entry.kind === "changed" && "grid-cols-1",
            )}
          >
            {entry.kind !== "added" && (
              <div className="text-[var(--sandy-muted-foreground)]">
                <span className="mr-1 font-medium">before:</span>
                {renderValue(entry.before)}
              </div>
            )}
            {entry.kind !== "removed" && (
              <div className="text-[var(--sandy-foreground)]">
                <span className="mr-1 font-medium">after:</span>
                {renderValue(entry.after)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
