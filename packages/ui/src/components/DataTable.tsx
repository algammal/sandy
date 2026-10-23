import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  hideBelow?: "sm" | "md" | "lg";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
  skeletonRowCount?: number;
}

const hideBelowClasses: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  emptyState,
  skeletonRowCount = 5,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--sandy-border)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)]">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--sandy-muted-foreground)]",
                  column.hideBelow && hideBelowClasses[column.hideBelow],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="border-b border-[var(--sandy-border)]">
                {columns.map((column) => (
                  <td key={column.id} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                {emptyState ?? (
                  <p className="text-center text-sm text-[var(--sandy-muted-foreground)]">No records found.</p>
                )}
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[var(--sandy-border)] last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-[var(--sandy-surface-glass)]",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn("px-4 py-3 text-[var(--sandy-foreground)]", column.className, column.hideBelow && hideBelowClasses[column.hideBelow])}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
