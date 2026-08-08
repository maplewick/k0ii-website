"use client";

import { cn } from "@/lib/utils";

export type HubViewOption<T extends string> = {
  value: T;
  label: string;
};

export function HubViewSwitcher<T extends string>({
  value,
  options,
  onChange,
  ariaLabel = "View",
}: {
  value: T;
  options: readonly HubViewOption<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-[var(--radius-input)] bg-card-surface-alt p-1 ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-11 min-w-[4.5rem] rounded-[calc(var(--radius-input)-2px)] px-3.5 py-2 font-display text-sm font-semibold",
              "transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)]",
              "active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
              active
                ? "bg-koi text-white shadow-[var(--shadow-button)]"
                : "bg-transparent text-ink-soft hover:bg-card-surface hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function HubPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "origin-top animate-[hub-panel-in_220ms_var(--ease-out)_both]",
        "motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HubSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pond-card h-40 animate-pulse bg-card-surface-alt",
        className,
      )}
      aria-hidden
    />
  );
}

export function HubEmpty({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="pond-card pond-pad space-y-2">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-soft">{detail}</p>
    </div>
  );
}
