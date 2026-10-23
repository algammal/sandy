import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { GlassPanel, StatusBadge } from "@sandy/ui";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--sandy-primary)] text-white">
          <Sparkles className="size-5" />
        </span>
        <span className="text-lg font-semibold text-[var(--sandy-foreground)]">Client Portal</span>
      </div>
      <GlassPanel strong className="w-full max-w-md">
        {children}
      </GlassPanel>
      <StatusBadge label="Demo authentication — no real accounts are created" tone="info" />
    </div>
  );
}
