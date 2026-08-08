import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-input)] border border-border bg-card-surface px-3 text-sm text-ink outline-none transition-[box-shadow,border-color] duration-200 ease-[var(--ease-out)] placeholder:text-ink-soft focus-visible:border-pond-teal focus-visible:ring-2 focus-visible:ring-pond-teal/30",
        className,
      )}
      {...props}
    />
  );
}
