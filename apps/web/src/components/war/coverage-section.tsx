"use client";

import type { RosterResponse } from "@k0ii/schemas";
import { useMemo, useRef, useState } from "react";

import { ChartHoverTooltip } from "@/components/charts/chart-hover-tooltip";
import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Button } from "@/components/ui/button";
import { buildHourlyProduction } from "@/lib/analytics/hourly-coverage";
import { formatPoints } from "@/lib/format";
import { useRoster } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

export function CoverageSection({
  initialRoster,
  embedded,
}: {
  initialRoster?: RosterResponse | null;
  embedded?: boolean;
}) {
  const { data, isLoading, error, refetch } = useRoster(
    initialRoster ? { initialData: initialRoster } : undefined,
  );
  const [local, setLocal] = useState(true);
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const production = useMemo(() => {
    const series = data?.battle?.series ?? [];
    return buildHourlyProduction(series, local);
  }, [data, local]);

  if (isLoading && !data) {
    return <HubSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h3" className="text-xl">
          Hourly Coverage
        </Heading>
        <p className="max-w-md text-sm text-ink-soft">
          Could not load battle series for coverage. Check the API, then try
          again.
        </p>
        <Button
          size="sm"
          className="active:scale-[0.97]"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const hours = production.buckets.map((points, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, "0")}:00`,
    points,
  }));
  const max = Math.max(1, ...hours.map((h) => h.points));
  const best = [...hours].sort((a, b) => b.points - a.points)[0];
  const worst =
    [...hours]
      .filter((h) => h.points > 0)
      .sort((a, b) => a.points - b.points)[0] ??
    [...hours].sort((a, b) => a.points - b.points)[0];
  const total = hours.reduce((sum, h) => sum + h.points, 0);
  const activeHoursCount = hours.filter((h) => h.points > 0).length;
  const active = activeHour != null ? hours[activeHour] : null;
  const tipX =
    active && chartRef.current
      ? ((active.hour + 0.5) / 24) * chartRef.current.clientWidth
      : 0;

  return (
    <section className={cn("pond-section", !embedded && "animate-fade-rise")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Heading as="h2" className="text-2xl tracking-tight sm:text-3xl">
            Hourly Coverage
          </Heading>
          <p className="max-w-lg text-sm text-ink-soft">
            When the clan produces points across the day. Switch timezone to match
            your sleep schedule.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="active:scale-[0.97]"
          aria-pressed={local}
          onClick={() => setLocal((v) => !v)}
        >
          {local ? "Local Time" : "UTC"}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="pond-card pond-pad sm:col-span-1">
          <p className="pond-label">Best Hour</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-koi sm:text-3xl">
            {best ? best.label : "-"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {best ? formatPoints(best.points) : "-"}
          </p>
        </div>
        <div className="pond-card pond-pad">
          <p className="pond-label">Quietest Hour</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl">
            {worst ? worst.label : "-"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {worst ? formatPoints(worst.points) : "-"}
          </p>
        </div>
        <div className="pond-card pond-pad bg-[linear-gradient(165deg,color-mix(in_srgb,var(--pond-teal)_12%,transparent),transparent_65%)]">
          <p className="pond-label">Day Total</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-pond-teal sm:text-3xl">
            {formatPoints(total)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {activeHoursCount} of 24 hours active
          </p>
        </div>
      </div>

      <div className="pond-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] px-4 py-3 sm:px-5">
          <p className="font-display text-sm font-semibold text-ink">
            Production by hour
          </p>
          <p className="text-xs text-ink-soft">
            {active
              ? `${active.label}: ${formatPoints(active.points)}`
              : local
                ? "Your local clock · tap a bar"
                : "UTC clock · tap a bar"}
          </p>
        </div>
        <div className="relative pond-pad">
          <div
            ref={chartRef}
            className="flex h-44 items-end gap-px sm:h-52 sm:gap-0.5"
            role="img"
            aria-label="Hourly production bar chart"
          >
            {hours.map((h) => {
              const tall = (h.points / max) * 100;
              const isBest = best?.hour === h.hour && h.points > 0;
              const isActive = activeHour === h.hour;
              const showLabel = h.hour % 3 === 0 || h.hour === 23;
              return (
                <button
                  key={h.hour}
                  type="button"
                  className={cn(
                    "group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-koi/50",
                  )}
                  aria-label={`${h.label}: ${formatPoints(h.points)}`}
                  aria-pressed={isActive}
                  onClick={() =>
                    setActiveHour((cur) => (cur === h.hour ? null : h.hour))
                  }
                  onMouseEnter={() => setActiveHour(h.hour)}
                  onMouseLeave={() => setActiveHour(null)}
                  onFocus={() => setActiveHour(h.hour)}
                  onBlur={() => setActiveHour(null)}
                >
                  <div
                    className={cn(
                      "charts-bar w-full max-w-5 rounded-t transition-[height,background-color,opacity] duration-200 ease-[var(--ease-out)]",
                      isBest
                        ? "bg-koi"
                        : "bg-[color-mix(in_srgb,var(--pond-teal)_72%,transparent)]",
                      h.points === 0 && "opacity-25",
                      isActive && "opacity-100 ring-2 ring-koi/40",
                    )}
                    style={{
                      height: `${Math.max(h.points > 0 ? 3 : 0, tall)}%`,
                      minHeight: h.points > 0 ? 3 : 0,
                    }}
                  />
                  <span
                    className={cn(
                      "select-none font-tabular text-[9px] text-ink-soft sm:text-[10px]",
                      !showLabel && "invisible sm:visible sm:opacity-0",
                      showLabel && "opacity-100",
                      isActive && "opacity-100 text-ink",
                    )}
                  >
                    {h.hour}
                  </span>
                </button>
              );
            })}
          </div>

          <ChartHoverTooltip
            open={Boolean(active)}
            x={tipX}
            y={12}
            title={active?.label ?? ""}
            rows={
              active
                ? [
                    {
                      label: "Points",
                      value: formatPoints(active.points),
                      color: "var(--pond-teal)",
                      emphasis: true,
                    },
                  ]
                : []
            }
            containerWidth={chartRef.current?.clientWidth ?? 0}
          />
        </div>
      </div>
    </section>
  );
}
