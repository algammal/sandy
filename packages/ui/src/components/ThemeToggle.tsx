"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./IconButton";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-10" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <IconButton
      icon={isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      variant="secondary"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    />
  );
}
