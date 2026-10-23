"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, Sparkles, User } from "lucide-react";
import { Sidebar, Header, ThemeToggle, DropdownMenu, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { closeMobileSidebar, toggleMobileSidebar } from "../store/slices/uiPreferencesSlice";
import { signOut } from "../store/slices/sessionSlice";
import { navItems } from "./navConfig";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isMobileSidebarOpen = useAppSelector((state) => state.uiPreferences.isMobileSidebarOpen);
  const user = useAppSelector((state) => state.session.user);

  const groups = [
    {
      items: navItems.map((item) => ({
        label: item.label,
        href: item.href,
        icon: <item.icon className="size-4" />,
        isActive: pathname === item.href,
      })),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        brand={
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--sandy-primary)] text-white">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--sandy-foreground)]">Client Portal</p>
              <p className="text-xs text-[var(--sandy-muted-foreground)]">Voice Agent Platform</p>
            </div>
          </div>
        }
        groups={groups}
        LinkComponent={Link}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => dispatch(closeMobileSidebar())}
        footer={<StatusBadge label="Demo Environment" tone="info" />}
      />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Header
          onMenuToggle={() => dispatch(toggleMobileSidebar())}
          left={<p className="text-sm font-medium text-[var(--sandy-muted-foreground)]">Sandcastle Living</p>}
          right={
            <>
              <ThemeToggle />
              <DropdownMenu
                trigger={
                  <button className="flex items-center gap-2 rounded-xl border border-[var(--sandy-border)] px-3 py-1.5 text-sm font-medium text-[var(--sandy-foreground)] hover:bg-[var(--sandy-surface-glass)]">
                    <User className="size-4" />
                    {user?.name ?? "Guest (Demo)"}
                  </button>
                }
                items={[
                  {
                    label: "Sign out",
                    icon: <LogOut className="size-4" />,
                    tone: "danger",
                    onSelect: () => {
                      dispatch(signOut());
                      router.push("/sign-in");
                    },
                  },
                ]}
              />
            </>
          }
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
