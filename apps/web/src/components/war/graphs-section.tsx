"use client";

import type { GraphsResponse } from "@k0ii/schemas";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  ChartHoverTooltip,
  formatChartTime,
  pointerToSvgPoint,
  type ChartTooltipRow,
} from "@/components/charts/chart-hover-tooltip";
import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Button } from "@/components/ui/button";
import {
  formatNumber,
  formatPoints,
  formatPph,
  formatRelativeTime,
  formatSignedDelta,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { useGraphs } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const HOURS = [6, 12, 24, 48] as const;
type Metric = "points" | "rank" | "rate";

const SERIES_PALETTE = [
  "var(--pond-teal)",
  "var(--lily-green)",
  "color-mix(in srgb, var(--pond-deep) 72%, white)",
  "color-mix(in srgb, var(--koi-orange) 55%, var(--pond-teal))",
  "color-mix(in srgb, var(--lily-green) 50%, var(--pond-deep))",
  "color-mix(in srgb, var(--ink) 55%, var(--pond-teal))",
] as const;

function Signed({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const tone =
    value == null || !Number.isFinite(value)
      ? "text-ink-soft"
      : value > 0
        ? "text-lily"
        : value < 0
          ? "text-alert"
          : "text-ink-soft";
  return (
    <span className={cn("font-tabular", tone, className)}>
      {formatSignedDelta(value)}
    </span>
  );
}

function ClanMark({
  name,
  iconUrl,
  ours,
  swatch,
}: {
  name: string;
  iconUrl: string | null;
  ours?: boolean;
  swatch?: string;
}) {
  const src = httpsOnlyUrl(iconUrl);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-7 shrink-0 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]"
        />
      ) : (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold",
            ours
              ? "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi"
              : "bg-card-surface-alt text-ink-soft",
          )}
          style={
            !ours && swatch
              ? { boxShadow: `inset 0 0 0 2px ${swatch}` }
              : undefined
          }
          aria-hidden
        >
          {initial}
        </span>
      )}
      <span
        className={cn(
          "truncate font-display font-semibold",
          ours ? "text-koi" : "text-ink",
        )}
      >
        {ours ? `${name} (you)` : name}
      </span>
    </span>
  );
}

function metricLabel(view: Metric): string {
  if (view === "rank") return "Rank over time";
  if (view === "rate") return "Points per hour";
  return "Points over time";
}

function formatAxisValue(view: Metric, value: number): string {
  if (view === "rank") return `#${Math.round(value)}`;
  if (view === "rate") return formatPph(value);
  return formatPoints(value);
}

export function GraphsSection({ embedded }: { embedded?: boolean }) {
  const [hours, setHours] = useState<(typeof HOURS)[number]>(12);
  const [view, setView] = useState<Metric>("points");
  const { data, isLoading, error, isFetching, refetch } = useGraphs(hours);

  const chartClans = useMemo(() => data?.clans ?? [], [data]);
  const ours = chartClans.find((c) => c.isOurs) ?? null;

  if (isLoading && !data) {
    return <HubSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h3" className="text-xl">
          War graphs
        </Heading>
        <p className="max-w-md text-sm text-ink-soft">
          Could not load graph series. Check the API, then try again.
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

  return (
    <section className={cn("pond-section", !embedded && "animate-fade-rise")}>
      {!embedded ? (
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Heading as="h2" className="text-2xl tracking-tight sm:text-3xl">
              War graphs
            </Heading>
            <p className="text-sm text-ink-soft">
              {data?.battleId ? data.battleId : "Current window"}
              {" · "}
              updated {formatRelativeTime(data?.generatedAt ?? Date.now())}
              {isFetching ? " · refreshing" : ""}
            </p>
          </div>
          {ours?.latestRank != null ? (
            <div className="pond-card min-w-[8.5rem] pond-pad text-right">
              <p className="pond-label">Our rank</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-koi">
                #{ours.latestRank}
              </p>
            </div>
          ) : null}
        </header>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Time window"
          className="flex flex-wrap gap-1.5"
        >
          {HOURS.map((h) => (
            <Button
              key={h}
              size="sm"
              variant={hours === h ? "default" : "secondary"}
              className="min-w-12 active:scale-[0.97]"
              aria-pressed={hours === h}
              onClick={() => setHours(h)}
            >
              {h}h
            </Button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Chart metric"
          className="flex flex-wrap gap-1.5"
        >
          {(
            [
              ["points", "Points"],
              ["rank", "Rank"],
              ["rate", "Rate"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={view === key ? "default" : "secondary"}
              className="active:scale-[0.97]"
              aria-pressed={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="pond-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] px-4 py-3 sm:px-5">
          <p className="font-display text-sm font-semibold text-ink">
            {metricLabel(view)}
          </p>
          <p className="text-xs text-ink-soft">
            Last {formatNumber(hours)} hours
            {chartClans.length
              ? ` · ${formatNumber(chartClans.length)} clans`
              : ""}
          </p>
        </div>
        <div className="pond-pad pt-3 sm:pt-4">
          <MultiLineChart clans={chartClans} view={view} />
        </div>
        {chartClans.length > 0 ? (
          <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] px-4 py-3 sm:px-5">
            <p className="text-[11px] text-ink-soft">
              Solid orange is you. Dashed lines are rivals.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {chartClans.map((clan, idx) => (
                <li
                  key={clan.name}
                  className="flex items-center gap-2 text-xs text-ink-soft"
                >
                  <span
                    className="inline-block w-4 shrink-0 rounded-full"
                    style={{
                      background: clan.isOurs
                        ? "var(--koi-orange)"
                        : SERIES_PALETTE[idx % SERIES_PALETTE.length],
                      height: clan.isOurs ? 3 : 2,
                    }}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "truncate font-medium",
                      clan.isOurs && "text-koi",
                    )}
                  >
                    {clan.isOurs ? `${clan.name} (you)` : clan.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="pond-card overflow-hidden">
        <div className="hidden border-b border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] bg-card-surface-alt px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft md:grid md:grid-cols-[minmax(0,2.2fr)_0.7fr_1fr_1fr_0.9fr] md:gap-2">
          <span>Clan</span>
          <span>Rank</span>
          <span>Points</span>
          <span>PPH</span>
          <span>5m</span>
        </div>

        <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] md:hidden">
          {chartClans.map((clan, idx) => (
            <li
              key={clan.name}
              className={cn(
                "charts-clan-row space-y-2 px-4 py-3",
                clan.isOurs &&
                  "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
              )}
            >
              <ClanMark
                name={clan.name}
                iconUrl={clan.iconUrl}
                ours={clan.isOurs}
                swatch={SERIES_PALETTE[idx % SERIES_PALETTE.length]}
              />
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-ink-soft">Rank</p>
                  <p className="font-tabular font-semibold">
                    {clan.latestRank != null ? `#${clan.latestRank}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft">Points</p>
                  <p className="font-tabular font-semibold">
                    {formatPoints(clan.latestPoints)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft">PPH</p>
                  <p className="font-tabular">{formatPph(clan.pph)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft">5m</p>
                  <Signed value={clan.delta5m} className="font-semibold" />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <ul className="hidden divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] md:block">
          {chartClans.map((clan, idx) => (
            <li
              key={clan.name}
              className={cn(
                "charts-clan-row grid grid-cols-[minmax(0,2.2fr)_0.7fr_1fr_1fr_0.9fr] items-center gap-2 px-4 py-2.5 text-sm transition-[background-color] duration-150 ease-[var(--ease-out)]",
                clan.isOurs &&
                  "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
              )}
            >
              <ClanMark
                name={clan.name}
                iconUrl={clan.iconUrl}
                ours={clan.isOurs}
                swatch={SERIES_PALETTE[idx % SERIES_PALETTE.length]}
              />
              <span className="font-tabular">
                {clan.latestRank != null ? `#${clan.latestRank}` : "-"}
              </span>
              <span className="font-tabular font-semibold">
                {formatPoints(clan.latestPoints)}
              </span>
              <span className="font-tabular text-ink-soft">
                {formatPph(clan.pph)}
              </span>
              <Signed value={clan.delta5m} />
            </li>
          ))}
        </ul>

        {chartClans.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">
            No clan series for this {formatNumber(hours)}h window yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function nearestSeriesPoint(
  series: Array<{ timestamp: number; value: number }>,
  targetT: number,
): { timestamp: number; value: number } | null {
  if (series.length === 0) return null;
  let best = series[0]!;
  let bestDist = Math.abs(best.timestamp - targetT);
  for (let i = 1; i < series.length; i++) {
    const p = series[i]!;
    const dist = Math.abs(p.timestamp - targetT);
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best;
}

function MultiLineChart({
  clans,
  view,
}: {
  clans: GraphsResponse["clans"];
  view: Metric;
}) {
  const w = 720;
  const h = 260;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    svgX: number;
    tipX: number;
    tipY: number;
    timestamp: number;
    rows: ChartTooltipRow[];
    dots: Array<{ x: number; y: number; color: string; ours: boolean }>;
  } | null>(null);

  const seriesList = useMemo(() => {
    return clans.map((c, idx) => {
      const color = c.isOurs
        ? "var(--koi-orange)"
        : SERIES_PALETTE[idx % SERIES_PALETTE.length]!;
      if (view === "rank") {
        return {
          name: c.name,
          isOurs: c.isOurs,
          color,
          series: c.rankSeries,
        };
      }
      if (view === "rate") {
        const pts = c.pointsSeries;
        const rate = pts.slice(1).map((p, i) => {
          const prev = pts[i]!;
          const hoursSpan = Math.max(
            1 / 60,
            (p.timestamp - prev.timestamp) / 3_600_000,
          );
          return {
            timestamp: p.timestamp,
            value: Math.max(0, (p.value - prev.value) / hoursSpan),
          };
        });
        return {
          name: c.name,
          isOurs: c.isOurs,
          color,
          series: rate,
        };
      }
      return {
        name: c.name,
        isOurs: c.isOurs,
        color,
        series: c.pointsSeries,
      };
    });
  }, [clans, view]);

  const allValues = seriesList.flatMap((s) => s.series.map((p) => p.value));
  const allTimes = useMemo(() => {
    const times = seriesList.flatMap((s) => s.series.map((p) => p.timestamp));
    return [...new Set(times)].sort((a, b) => a - b);
  }, [seriesList]);

  const extents = useMemo(() => {
    if (allValues.length < 2 || allTimes.length < 2) return null;
    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const minT = allTimes[0]!;
    const maxT = allTimes[allTimes.length - 1]!;
    return {
      minV,
      maxV,
      minT,
      maxT,
      vSpan: Math.max(1e-6, maxV - minV),
      tSpan: Math.max(1, maxT - minT),
    };
  }, [allTimes, allValues]);

  const clearHover = useCallback(() => setHover(null), []);

  const onPointer = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      const wrap = wrapRef.current;
      if (!svg || !wrap || !extents || allTimes.length < 2) return;

      const { x: svgX } = pointerToSvgPoint(
        svg,
        event.clientX,
        event.clientY,
        w,
        h,
      );
      if (svgX < padL || svgX > w - padR) {
        setHover(null);
        return;
      }

      const targetT =
        extents.minT + ((svgX - padL) / plotW) * extents.tSpan;
      const snappedT = nearestSeriesPoint(
        allTimes.map((timestamp) => ({ timestamp, value: 0 })),
        targetT,
      )?.timestamp;
      if (snappedT == null) {
        setHover(null);
        return;
      }

      const snappedSvgX =
        padL + ((snappedT - extents.minT) / extents.tSpan) * plotW;

      const maxSkewMs = Math.max(10 * 60_000, extents.tSpan * 0.06);
      const entries: Array<{
        row: ChartTooltipRow;
        sort: number;
        dot: { x: number; y: number; color: string; ours: boolean };
      }> = [];

      for (const clan of seriesList) {
        const point = nearestSeriesPoint(clan.series, snappedT);
        if (!point) continue;
        if (Math.abs(point.timestamp - snappedT) > maxSkewMs) continue;

        const yNorm = (point.value - extents.minV) / extents.vSpan;
        const y =
          view === "rank"
            ? padT + yNorm * plotH
            : padT + (1 - yNorm) * plotH;
        const metricSort = view === "rank" ? -point.value : point.value;
        const ours = Boolean(clan.isOurs);
        entries.push({
          row: {
            label: clan.name,
            value: formatAxisValue(view, point.value),
            color: clan.color,
            emphasis: ours,
          },
          sort: ours ? Number.POSITIVE_INFINITY : metricSort,
          dot: { x: snappedSvgX, y, color: clan.color, ours },
        });
      }

      if (entries.length === 0) {
        setHover(null);
        return;
      }

      entries.sort((a, b) => b.sort - a.sort);
      const ours = entries.filter((e) => e.row.emphasis);
      const rest = entries.filter((e) => !e.row.emphasis);
      const maxRest = Math.max(0, 6 - ours.length);
      const shown = [...ours, ...rest.slice(0, maxRest)];
      const rows = shown.map((e) => e.row);
      if (rest.length > maxRest) {
        rows.push({
          label: `+${rest.length - maxRest} more`,
          value: "…",
        });
      }

      const svgRect = svg.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const tipX =
        (snappedSvgX / w) * svgRect.width + (svgRect.left - wrapRect.left);
      const tipY = padT * (svgRect.height / h) + 8;

      setHover({
        svgX: snappedSvgX,
        tipX,
        tipY,
        timestamp: snappedT,
        rows,
        dots: shown.map((e) => e.dot),
      });
    },
    [allTimes, extents, plotH, plotW, seriesList, view],
  );

  if (!extents) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <p className="max-w-sm text-center text-sm text-ink-soft">
          Not enough samples to chart this window. Keep polling while the war
          runs.
        </p>
      </div>
    );
  }

  const { minV, maxV, minT, maxT, vSpan, tSpan } = extents;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const value =
      view === "rank" ? minV + t * vSpan : minV + (1 - t) * vSpan;
    const y = padT + t * plotH;
    return { value, y };
  });

  const xTicks = [0, 0.5, 1].map((t) => {
    const timestamp = minT + t * tSpan;
    const x = padL + t * plotW;
    return { timestamp, x };
  });

  const formatTickTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className="mx-auto block h-auto min-h-[11rem] w-full min-w-[18rem] max-w-full touch-none"
          role="img"
          aria-label={metricLabel(view)}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={clearHover}
          onPointerCancel={clearHover}
        >
          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line
                x1={padL}
                x2={w - padR}
                y1={tick.y}
                y2={tick.y}
                stroke="color-mix(in srgb, var(--pond-teal) 14%, transparent)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[var(--ink-soft)]"
                style={{ fontSize: 10 }}
              >
                {formatAxisValue(view, tick.value)}
              </text>
            </g>
          ))}

          {xTicks.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={tick.x}
              y={h - 8}
              textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
              className="fill-[var(--ink-soft)]"
              style={{ fontSize: 10 }}
            >
              {formatTickTime(tick.timestamp)}
            </text>
          ))}

          {seriesList.map((clan) => {
            if (clan.series.length < 2) return null;
            const points = clan.series
              .map((p) => {
                const x = padL + ((p.timestamp - minT) / tSpan) * plotW;
                const yNorm = (p.value - minV) / vSpan;
                const y =
                  view === "rank"
                    ? padT + yNorm * plotH
                    : padT + (1 - yNorm) * plotH;
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <polyline
                key={clan.name}
                fill="none"
                stroke={clan.color}
                strokeWidth={clan.isOurs ? 3 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={clan.isOurs ? undefined : "5 4"}
                opacity={clan.isOurs ? 1 : hover ? 0.45 : 0.72}
                points={points}
              />
            );
          })}

          {hover ? (
            <>
              <line
                x1={hover.svgX}
                x2={hover.svgX}
                y1={padT}
                y2={h - padB}
                stroke="color-mix(in srgb, var(--koi-orange) 60%, transparent)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
              {hover.dots.map((dot, i) => (
                <circle
                  key={`${dot.color}-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.ours ? 5 : 3.5}
                  fill="var(--card-surface)"
                  stroke={dot.color}
                  strokeWidth={dot.ours ? 2.5 : 2}
                  pointerEvents="none"
                />
              ))}
            </>
          ) : null}

          <rect
            x={padL}
            y={padT}
            width={plotW}
            height={plotH}
            fill="transparent"
            className="cursor-crosshair"
          />
        </svg>
      </div>

      <ChartHoverTooltip
        open={Boolean(hover)}
        x={hover?.tipX ?? 0}
        y={hover?.tipY ?? 0}
        title={hover ? formatChartTime(hover.timestamp) : ""}
        rows={hover?.rows ?? []}
        containerWidth={wrapRef.current?.clientWidth ?? 0}
        containerHeight={wrapRef.current?.clientHeight ?? 0}
      />
    </div>
  );
}
