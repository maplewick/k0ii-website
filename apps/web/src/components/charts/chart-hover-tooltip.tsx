"use client";

import { cn } from "@/lib/utils";

export type ChartTooltipRow = {
  label: string;
  value: string;
  color?: string;
  emphasis?: boolean;
};

type ChartHoverTooltipProps = {
  open: boolean;
  /** Position relative to the chart container (px). */
  x: number;
  y: number;
  title: string;
  rows: ChartTooltipRow[];
  /** Prefer flipping left of cursor when near right edge. */
  containerWidth?: number;
  containerHeight?: number;
  className?: string;
};

export function formatChartTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Map pointer into SVG viewBox coordinates. */
export function pointerToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewBoxW: number,
  viewBoxH: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  return {
    x: ((clientX - rect.left) / w) * viewBoxW,
    y: ((clientY - rect.top) / h) * viewBoxH,
  };
}

export function ChartHoverTooltip({
  open,
  x,
  y,
  title,
  rows,
  containerWidth = 0,
  containerHeight = 0,
  className,
}: ChartHoverTooltipProps) {
  if (!open || rows.length === 0) return null;

  const flipLeft = containerWidth > 0 && x > containerWidth * 0.58;
  const flipDown =
    containerHeight > 0 && y < Math.min(120, containerHeight * 0.35);
  const clampX = Math.max(
    12,
    Math.min(x, containerWidth > 0 ? containerWidth - 12 : x),
  );
  const clampY = Math.max(
    12,
    Math.min(y, containerHeight > 0 ? containerHeight - 12 : y),
  );

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-30 w-max max-w-[min(16.5rem,calc(100%-1.25rem))] rounded-[var(--radius-input)] px-2.5 py-2 shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card-surface)_96%,var(--pond-deep))] backdrop-blur-md",
        className,
      )}
      style={{
        left: clampX,
        top: clampY,
        transform: [
          flipLeft ? "translateX(-100%)" : "translateX(10px)",
          flipDown ? "translateY(10px)" : "translateY(calc(-100% - 10px))",
        ].join(" "),
      }}
    >
      <p className="font-tabular text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto overscroll-contain">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {row.color ? (
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: row.color }}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "truncate text-ink-soft",
                  row.emphasis && "font-semibold text-ink",
                )}
              >
                {row.label}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 font-tabular font-semibold text-ink",
                row.emphasis && "text-koi",
              )}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
