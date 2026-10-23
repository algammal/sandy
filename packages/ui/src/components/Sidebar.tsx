"use client";

import type { ComponentType, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  isActive: boolean;
  badge?: number;
}

export interface SidebarNavGroup {
  title?: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  brand: ReactNode;
  groups: SidebarNavGroup[];
  footer?: ReactNode;
  LinkComponent: ComponentType<{ href: string; className?: string; children: ReactNode }>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ brand, groups, footer, LinkComponent, isMobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-6 border-r border-[var(--sandy-border)] bg-[var(--sandy-surface-glass-strong)] p-5 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-1">{brand}</div>
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {groups.map((group, index) => (
            <div key={group.title ?? index} className="space-y-1.5">
              {group.title && (
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-[var(--sandy-muted-foreground)]">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <LinkComponent
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    item.isActive
                      ? "bg-[var(--sandy-primary)]/15 text-[var(--sandy-primary)]"
                      : "text-[var(--sandy-muted-foreground)] hover:bg-[var(--sandy-surface-glass)] hover:text-[var(--sandy-foreground)]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-[var(--sandy-primary)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sandy-primary)]">
                      {item.badge}
                    </span>
                  )}
                </LinkComponent>
              ))}
            </div>
          ))}
        </nav>
        {footer && <div className="border-t border-[var(--sandy-border)] pt-4">{footer}</div>}
      </aside>
    </>
  );
}
