"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wraps next-themes with the settings this platform needs:
 * class-based toggling (matches the `@custom-variant dark` rule in each app's
 * globals.css), system preference detection on first visit, and a persisted
 * preference across reloads (demo-only, stored in localStorage by next-themes).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
