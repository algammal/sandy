import { cn } from "../utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-[var(--sandy-border)]", className)}
      aria-hidden
    />
  );
}
