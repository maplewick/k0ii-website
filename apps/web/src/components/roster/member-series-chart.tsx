"use client";

import type { SeriesPoint } from "@k0ii/schemas";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  ChartHoverTooltip,
  formatChartTime,
  pointerToSvgPoint,
} from "@/components/charts/chart-hover-tooltip";
import { formatNumber, formatPph } from "@/lib/format";

type MemberSeriesChartProps = {
  data: SeriesPoint[];
  mode: "points" | "pph";
  height?: number;
};

export function MemberSeriesChart({
  data,
  mode,
  height = 220,
}: MemberSeriesChartProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    localX: number;
    localY: number;
    svgX: number;
    svgY: number;
    value: number;
    timestamp: number;
  } | null>(null);

  const layout = useMemo(() => {
    if (data.length < 2) return null;
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const values = sorted.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 640;
    const h = height - 32;
    const padX = 8;
    const padY = 8;

    const coords = sorted.map((p, i) => {
      const x = padX + (i / (sorted.length - 1)) * (w - padX * 2);
      const y = padY + (1 - (p.value - min) / range) * (h - padY * 2);
      return { x, y, value: p.value, timestamp: p.timestamp };
    });

    const line = coords.map((p) => `${p.x},${p.y}`).join(" L ");
    const area = `M ${coords[0]!.x},${h} L ${line} L ${coords[coords.length - 1]!.x},${h} Z`;

    return {
      w,
      h,
      min,
      max,
      padX,
      padY,
      coords,
      linePath: `M ${line}`,
      areaPath: area,
      latest: coords[coords.length - 1]!.value,
    };
  }, [data, height]);

  const formatValue = mode === "pph" ? formatPph : formatNumber;

  const clearHover = useCallback(() => setHover(null), []);

  const onPointer = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!layout || !svgRef.current || !wrapRef.current) return;
      const { x } = pointerToSvgPoint(
        svgRef.current,
        event.clientX,
        event.clientY,
        layout.w,
        layout.h,
      );

      let best = layout.coords[0]!;
      let bestDist = Math.abs(best.x - x);
      for (let i = 1; i < layout.coords.length; i++) {
        const p = layout.coords[i]!;
        const dist = Math.abs(p.x - x);
        if (dist < bestDist) {
          best = p;
          bestDist = dist;
        }
      }

      const wrapRect = wrapRef.current.getBoundingClientRect();
      setHover({
        localX: event.clientX - wrapRect.left,
        localY: event.clientY - wrapRect.top,
        svgX: best.x,
        svgY: best.y,
        value: best.value,
        timestamp: best.timestamp,
      });
    },
    [layout],
  );

  if (!layout) {
    return null;
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-[var(--radius-input)] bg-[color-mix(in_srgb,var(--card-surface-alt)_92%,var(--pond-teal))] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]"
    >
      <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] px-3 py-2 text-xs text-ink-soft">
        <span>{mode === "pph" ? "Points per hour" : "Battle points"}</span>
        <span className="font-tabular text-ink">
          Latest {formatValue(layout.latest)}
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="w-full touch-none text-koi"
        style={{ height }}
        aria-hidden
        preserveAspectRatio="none"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={clearHover}
        onPointerCancel={clearHover}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={layout.areaPath} fill={`url(#${gradientId})`} />
        <path
          d={layout.linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={layout.coords[layout.coords.length - 1]!.x}
          cy={layout.coords[layout.coords.length - 1]!.y}
          r="4"
          fill="var(--card-surface)"
          stroke="currentColor"
          strokeWidth="2"
        />
        {hover ? (
          <>
            <line
              x1={hover.svgX}
              x2={hover.svgX}
              y1={layout.padY}
              y2={layout.h - layout.padY}
              stroke="color-mix(in srgb, var(--koi-orange) 50%, transparent)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <circle
              cx={hover.svgX}
              cy={hover.svgY}
              r="5"
              fill="var(--card-surface)"
              stroke="currentColor"
              strokeWidth="2"
              pointerEvents="none"
            />
          </>
        ) : null}
      </svg>
      <div className="flex justify-between px-3 pb-2 text-[10px] font-tabular text-ink-soft">
        <span>{formatValue(layout.min)}</span>
        <span>{formatValue(layout.max)}</span>
      </div>

      <ChartHoverTooltip
        open={Boolean(hover)}
        x={hover?.localX ?? 0}
        y={hover?.localY ?? 0}
        title={hover ? formatChartTime(hover.timestamp) : ""}
        rows={
          hover
            ? [
                {
                  label: mode === "pph" ? "PPH" : "Points",
                  value: formatValue(hover.value),
                  color: "var(--koi-orange)",
                  emphasis: true,
                },
              ]
            : []
        }
        containerWidth={wrapRef.current?.clientWidth ?? 0}
      />
    </div>
  );
}
