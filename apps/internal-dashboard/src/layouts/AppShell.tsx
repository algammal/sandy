"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Sidebar, Header, ThemeToggle, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { closeMobileSidebar, toggleMobileSidebar } from "../store/slices/uiPreferencesSlice";
import { navItems } from "./navConfig";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isMobileSidebarOpen = useAppSelector((state) => state.uiPreferences.isMobileSidebarOpen);

  const groups = [
    {
      items: navItems.map((item) => ({
        label: item.label,
        href: item.href,
        icon: <item.icon className="size-4" />,
        isActive: pathname === item.href || pathname.startsWith(`${item.href}/`),
      })),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        brand={
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--sandy-primary)] text-white shadow-[0_0_16px_-2px_var(--sandy-ring)]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-[var(--sandy-foreground)]">Voice Agent Studio</p>
              <p className="label-caps text-[var(--sandy-accent)]">Operations Console</p>
            </div>
          </div>
        }
        groups={groups}
        LinkComponent={Link}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => dispatch(closeMobileSidebar())}
        footer={<StatusBadge label="Demo Environment" tone="info" />}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          onMenuToggle={() => dispatch(toggleMobileSidebar())}
          left={<p className="text-sm font-medium text-[var(--sandy-muted-foreground)]">Client & Agent Operations</p>}
          right={
            <>
              <ThemeToggle />
              <div className="flex items-center gap-2 rounded-xl border border-[var(--sandy-border)] px-3 py-1.5 text-sm font-medium text-[var(--sandy-foreground)]">
                <ShieldCheck className="size-4 text-[var(--sandy-success)]" />
                Internal Reviewer
              </div>
            </>
          }
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
