import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { cn } from "../utils/cn";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; label: string };
  accent?: "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-[var(--sandy-primary)]/15 text-[var(--sandy-primary)]",
  success: "bg-[var(--sandy-success-bg)] text-[var(--sandy-success)]",
  warning: "bg-[var(--sandy-warning-bg)] text-[var(--sandy-warning)]",
  danger: "bg-[var(--sandy-danger-bg)] text-[var(--sandy-danger)]",
  info: "bg-[var(--sandy-info-bg)] text-[var(--sandy-info)]",
};

export function StatCard({ label, value, icon, trend, accent = "primary", className }: StatCardProps) {
  return (
    <GlassPanel className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--sandy-muted-foreground)]">{label}</span>
        {icon && (
          <span className={cn("flex size-9 items-center justify-center rounded-xl", accentClasses[accent])}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[var(--sandy-foreground)]">{value}</div>
      {trend && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            trend.direction === "up" ? "text-[var(--sandy-success)]" : "text-[var(--sandy-danger)]",
          )}
        >
          {trend.direction === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {trend.label}
        </div>
      )}
    </GlassPanel>
  );
}
