"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

export interface HeaderProps {
  onMenuToggle?: () => void;
  left?: ReactNode;
  right?: ReactNode;
}

export function Header({ onMenuToggle, left, right }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[var(--sandy-border)] bg-[var(--sandy-surface-glass)] px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <IconButton
            icon={<Menu className="size-4" />}
            label="Toggle navigation"
            variant="ghost"
            className="lg:hidden"
            onClick={onMenuToggle}
          />
        )}
        {left}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
