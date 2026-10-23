import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--sandy-muted-foreground)]">
      <Loader2 className="size-6 animate-spin text-[var(--sandy-primary)]" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}
