"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" aria-label="Toggle theme">
        <span className="relative size-4" aria-hidden>
          <Sun className="size-4" />
        </span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={isDark ? "Switch to day pond" : "Switch to night pond"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="relative size-4" aria-hidden>
        <Sun
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
            "motion-reduce:transition-none",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-90 opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
            "motion-reduce:transition-none",
            isDark
              ? "-rotate-90 scale-90 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
        />
      </span>
    </Button>
  );
}
