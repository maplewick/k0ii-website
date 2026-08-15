"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricTile({
  label,
  value,
  hint,
  accent = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-input)] px-3 py-2.5",
        "bg-gradient-to-br from-card-surface-alt to-[color-mix(in_srgb,var(--pond-teal)_10%,var(--card-surface-alt))]",
        "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]",
        className,
      )}
    >
      <div className="text-xs font-medium text-ink-soft">{label}</div>
      <div
        className={cn(
          "mt-1 font-tabular text-lg font-semibold leading-tight",
          accent ? "text-koi" : "text-ink",
        )}
      >
        {value}
      </div>
      {hint != null ? (
        <div className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</div>
      ) : null}
    </div>
  );
}

export function DialogSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          {description != null ? (
            <p className="text-xs text-ink-soft">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-full bg-card-surface-alt p-1 ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
              active
                ? "bg-koi text-white shadow-[var(--shadow-button)]"
                : "text-ink-soft hover:bg-accent hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const dialogContentClass = cn(
  "max-h-[min(90dvh,90vh)] w-full sm:max-w-4xl",
  "gap-4 sm:gap-5 sm:p-8",
);

export function RankedRow({
  rank,
  label,
  value,
  valueClassName,
}: {
  rank?: number | string;
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] bg-card-surface-alt/90 px-3 py-2 text-sm ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)]">
      <span className="min-w-0 truncate font-medium text-ink">
        {rank != null ? (
          <span className="mr-2 font-tabular text-ink-soft">#{rank}</span>
        ) : null}
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 font-tabular font-semibold text-koi",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-input)] bg-card-surface-alt px-4 py-8 text-center text-sm text-ink-soft ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]">
      {children}
    </p>
  );
}

export function Pip({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-card-surface-alt px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
