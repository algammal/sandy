import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (pageCount <= 1) return null;

  const rangeStart = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const rangeEnd = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      {totalItems !== undefined && (
        <p className="text-xs text-[var(--sandy-muted-foreground)]">
          Showing {rangeStart}–{rangeEnd} of {totalItems}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs font-medium text-[var(--sandy-muted-foreground)]">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
