"use client";

import type { RosterResponse } from "@k0ii/schemas";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  analyze,
  collectClans,
  last5mChange,
  normalizeSeries,
  resolveBattleEndsAt,
  type AnalyzeResult,
  type ClanProjection,
} from "@/lib/analytics";
import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import {
  formatBattleCountdown,
  formatDuration,
  formatPoints,
  formatPph,
  formatRelativeTime,
  formatSignedDelta,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { useRoster } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function crossoverMs(
  ours: ClanProjection,
  rival: ClanProjection,
  msRemaining: number,
): number | null {
  const gapNow = rival.current - ours.current;
  const rateDiff = rival.perInterval - ours.perInterval;
  if (rateDiff === 0) return null;
  const intervals = -gapNow / rateDiff;
  if (!Number.isFinite(intervals) || intervals <= 0) return null;
  const ms = intervals * 5 * 60_000;
  return ms <= msRemaining ? ms : null;
}

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
}: {
  name: string;
  iconUrl: string | null;
  ours?: boolean;
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

export function RacePanel({
  initialRoster,
}: {
  initialRoster?: RosterResponse | null;
}) {
  const { data, isLoading, error, isFetching, refetch } = useRoster({
    initialData: initialRoster ?? undefined,
    refetchInterval: 30_000,
  });
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {
      /* permission / unsupported */
    }
  }

  const battle = data?.battle;
  const live = battle?.live === true;
  const ourName = data?.clanName ?? "Us";
  const endsAt = data
    ? resolveBattleEndsAt(battle, data.generatedAt)
    : null;
  const msRemaining =
    endsAt != null && Number.isFinite(endsAt) ? endsAt - now : null;

  const clans = useMemo(() => (data ? collectClans(data) : []), [data]);

  const iconByName = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!data) return map;
    for (const c of [
      ...data.comparison.aboveClans,
      ...data.comparison.belowClans,
    ]) {
      map.set(c.name.toLowerCase(), c.iconUrl);
    }
    return map;
  }, [data]);

  const delta5mByName = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!data) return map;
    map.set(ourName.toLowerCase(), battle?.delta5m ?? null);
    for (const c of [
      ...data.comparison.aboveClans,
      ...data.comparison.belowClans,
    ]) {
      map.set(c.name.toLowerCase(), c.delta5m);
    }
    return map;
  }, [data, battle?.delta5m, ourName]);

  const analysis: AnalyzeResult | null = useMemo(() => {
    if (!live || msRemaining == null || msRemaining <= 0) return null;
    if (clans.length < 2 || !ourName) return null;
    try {
      return analyze(clans, ourName, msRemaining);
    } catch {
      return null;
    }
  }, [live, msRemaining, clans, ourName]);

  const our5m =
    battle?.delta5m ?? last5mChange(normalizeSeries(battle?.series));
  const ourPoints = Number(battle?.points);
  const liveRank = Number(battle?.rank);
  const projDelta =
    analysis && Number.isFinite(liveRank)
      ? liveRank - analysis.projectedRank
      : null;

  const ladder = useMemo(() => {
    if (!Number.isFinite(ourPoints)) return [];
    return clans
      .map((c) => ({
        ...c,
        gap: Number(c.points) - ourPoints,
      }))
      .sort((a, b) => Number(b.points) - Number(a.points));
  }, [clans, ourPoints]);

  const oddsRows = useMemo(() => {
    if (!analysis) return [];
    const probs = analysis.standings[analysis.ours.name]?.rankProbs ?? [];
    const rows: { rank: number; p: number }[] = [];
    for (let i = 1; i < probs.length; i++) {
      if ((probs[i] ?? 0) >= 0.005) {
        rows.push({ rank: i + analysis.rankOffset, p: probs[i]! });
      }
    }
    return rows.slice(0, 6);
  }, [analysis]);

  const oddsMax = oddsRows.length ? Math.max(...oddsRows.map((r) => r.p)) : 1;

  if (isLoading && !data) {
    return <HubSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h3" className="text-xl">
          Race board
        </Heading>
        <p className="max-w-md text-sm text-ink-soft">
          Could not load roster data. Check the API, then try again.
        </p>
        <Button size="sm" className="active:scale-[0.97]" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pond-stack animate-fade-rise",
        fullscreen && "min-h-dvh",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 pond-section-head">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-block size-3 shrink-0 rounded-full",
                live
                  ? "race-live-dot bg-lily"
                  : "bg-[color-mix(in_srgb,var(--ink-soft)_50%,transparent)]",
              )}
              aria-hidden
            />
            <Heading
              as="h2"
              className="truncate text-3xl tracking-tight sm:text-4xl"
            >
              {ourName}
            </Heading>
            <Badge variant={live ? "success" : "secondary"}>
              {live ? "Live" : "Idle"}
            </Badge>
          </div>
          <p className="text-sm text-ink-soft">
            {battle?.title?.trim()
              ? battle.title
              : live
                ? "Live battle"
                : "Between wars"}
            {" · "}
            updated {formatRelativeTime(data.generatedAt)}
            {isFetching ? " · refreshing" : " · every 30s"}
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="pond-label">Battle ends in</p>
            <p
              className={cn(
                "mt-1 min-w-[9ch] font-display text-4xl font-bold tabular-nums tracking-tight text-ink sm:text-5xl",
              )}
            >
              {endsAt != null
                ? formatBattleCountdown(msRemaining)
                : "n/a"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-1 shrink-0 active:scale-[0.97]"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </header>

      {!live ? (
        <div className="pond-card pond-pad space-y-2">
          <Heading as="h3" className="text-xl sm:text-2xl">
            No live battle
          </Heading>
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
            Race board needs an active war. Standings, gaps, and projected
            finish show here when battle starts.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2">
            <GlanceCard
              label="Live rank"
              value={formatOrdinal(liveRank)}
              hint={`${formatPoints(ourPoints)} pts`}
              accent="koi"
            />
            <GlanceCard
              label="Projected finish"
              value={analysis ? formatOrdinal(analysis.projectedRank) : "n/a"}
              hint={
                analysis
                  ? `${formatPoints(analysis.ours.projected)} at pace`
                  : endsAt == null
                    ? "No end time - projection off"
                    : "Projection unavailable"
              }
              tone={
                projDelta != null && projDelta > 0
                  ? "pos"
                  : projDelta != null && projDelta < 0
                    ? "neg"
                    : undefined
              }
              accent="teal"
            />
          </section>

          <section className="pond-card grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] overflow-hidden sm:grid-cols-4 sm:divide-y-0">
            <StripStat
              label="Pace"
              value={formatPph(battle?.pph)}
              hint={<Signed value={our5m} />}
              hintLabel="5m"
            />
            <StripStat
              label="5m gain"
              value={<Signed value={our5m} className="text-2xl font-bold" />}
            />
            <StripStat
              label="Points"
              value={formatPoints(ourPoints)}
              hint={
                analysis?.target
                  ? `${formatPph(analysis.target.catchUpPerHour)} catch-up`
                  : "Holding"
              }
            />
            <StripStat
              label="Window"
              value={
                msRemaining != null && msRemaining > 0
                  ? formatDuration(msRemaining)
                  : "n/a"
              }
              hint={endsAt != null ? "until finish" : "end unknown"}
            />
          </section>

          <section className="pond-card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5 sm:px-5">
              <div>
                <Heading as="h3" className="text-xl sm:text-2xl">
                  Rivals
                </Heading>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Gap vs us, 5m pace, projected crossover
                </p>
              </div>
              <Badge variant="info">{ladder.length} clans</Badge>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] text-left text-xs text-ink-soft">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Rank</th>
                    <th className="px-2 py-2.5 font-medium">Clan</th>
                    <th className="px-2 py-2.5 font-medium">Gap</th>
                    <th className="px-2 py-2.5 font-medium">5m vs us</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">
                      Finish / cross
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ladder.map((c, i) => {
                    const isUs =
                      c.name.toLowerCase() === ourName.toLowerCase();
                    const proj = analysis?.projections.find(
                      (x) =>
                        x.name.toLowerCase() === c.name.toLowerCase(),
                    );
                    const their5m =
                      delta5mByName.get(c.name.toLowerCase()) ?? null;
                    const vs =
                      our5m != null && their5m != null
                        ? our5m - their5m
                        : null;
                    let cross: string | null = null;
                    if (!isUs && analysis && proj) {
                      const ms = crossoverMs(
                        analysis.ours,
                        proj,
                        analysis.msRemaining,
                      );
                      if (ms != null) {
                        const dir = c.gap > 0 ? "we pass" : "they pass";
                        cross = `${dir} in ${formatBattleCountdown(ms)}`;
                      }
                    }
                    return (
                      <tr
                        key={c.name}
                        className={cn(
                          "race-rival-row border-b border-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] last:border-0 transition-[background-color] duration-150 ease-[var(--ease-out)]",
                          isUs &&
                            "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)] shadow-[inset_3px_0_0_var(--koi-orange)]",
                          i < 3 &&
                            !isUs &&
                            "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                        )}
                      >
                        <td className="px-4 py-2.5 font-tabular text-ink-soft sm:px-5">
                          {c.rank != null ? `#${c.rank}` : `#${i + 1}`}
                        </td>
                        <td className="px-2 py-2.5">
                          <ClanMark
                            name={c.name}
                            iconUrl={
                              iconByName.get(c.name.toLowerCase()) ?? null
                            }
                            ours={isUs}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          {isUs ? (
                            <span className="text-ink-soft">-</span>
                          ) : (
                            <Signed value={c.gap} />
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          {isUs ? (
                            <Signed value={our5m} />
                          ) : (
                            <Signed value={vs} />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink-soft sm:px-5">
                          {isUs && analysis
                            ? `proj ${formatOrdinal(analysis.projectedRank)} · ${formatPoints(analysis.ours.projected)}`
                            : (cross ??
                              (proj
                                ? `proj ${formatPoints(proj.projected)}`
                                : "-"))}
                        </td>
                      </tr>
                    );
                  })}
                  {!ladder.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-ink-soft"
                      >
                        No rival data yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] md:hidden">
              {ladder.map((c, i) => {
                const isUs = c.name.toLowerCase() === ourName.toLowerCase();
                const proj = analysis?.projections.find(
                  (x) => x.name.toLowerCase() === c.name.toLowerCase(),
                );
                const their5m =
                  delta5mByName.get(c.name.toLowerCase()) ?? null;
                const vs =
                  our5m != null && their5m != null ? our5m - their5m : null;
                let cross: string | null = null;
                if (!isUs && analysis && proj) {
                  const ms = crossoverMs(
                    analysis.ours,
                    proj,
                    analysis.msRemaining,
                  );
                  if (ms != null) {
                    const dir = c.gap > 0 ? "we pass" : "they pass";
                    cross = `${dir} in ${formatBattleCountdown(ms)}`;
                  }
                }
                return (
                  <li
                    key={c.name}
                    className={cn(
                      "space-y-2 px-4 py-3.5",
                      isUs &&
                        "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <ClanMark
                        name={c.name}
                        iconUrl={
                          iconByName.get(c.name.toLowerCase()) ?? null
                        }
                        ours={isUs}
                      />
                      <span className="shrink-0 font-tabular text-sm text-ink-soft">
                        {c.rank != null ? `#${c.rank}` : `#${i + 1}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="pond-label">Gap</p>
                        {isUs ? (
                          <span className="text-ink-soft">-</span>
                        ) : (
                          <Signed value={c.gap} />
                        )}
                      </div>
                      <div>
                        <p className="pond-label">5m vs us</p>
                        {isUs ? (
                          <Signed value={our5m} />
                        ) : (
                          <Signed value={vs} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {isUs && analysis
                        ? `proj ${formatOrdinal(analysis.projectedRank)} · ${formatPoints(analysis.ours.projected)}`
                        : (cross ??
                          (proj
                            ? `proj ${formatPoints(proj.projected)}`
                            : "No projection yet"))}
                    </p>
                    {!isUs && Number.isFinite(c.points) ? (
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_55%,transparent)] transition-[width] duration-300 ease-[var(--ease-out)]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                4,
                                (Number(c.points) /
                                  Math.max(
                                    ourPoints,
                                    ...ladder.map((x) => Number(x.points)),
                                    1,
                                  )) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {!ladder.length ? (
                <li className="px-4 py-8 text-center text-sm text-ink-soft">
                  No rival data yet.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="pond-card pond-pad space-y-4">
              <Heading as="h3" className="text-xl">
                Finishing odds
              </Heading>
              {oddsRows.length ? (
                <ul className="space-y-2.5">
                  {oddsRows.map((r) => {
                    const scale = oddsMax > 0 ? r.p / oddsMax : 0;
                    return (
                      <li
                        key={r.rank}
                        className="grid grid-cols-[3.5rem_1fr_2.75rem] items-center gap-2 text-sm"
                      >
                        <span className="font-display font-semibold text-ink">
                          {formatOrdinal(r.rank)}
                        </span>
                        <span className="relative h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
                          <span
                            className="race-odds-fill absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-[var(--pond-teal)] to-[color-mix(in_srgb,var(--lily-green)_70%,var(--pond-teal))]"
                            style={{
                              transform: `scaleX(${Math.max(0.04, scale).toFixed(4)})`,
                            }}
                          />
                        </span>
                        <span className="font-tabular text-right text-ink-soft">
                          {(r.p * 100).toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">Not enough data yet.</p>
              )}
            </div>

            <div
              className={cn(
                "pond-card pond-pad space-y-3",
                analysis?.target &&
                  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
              )}
            >
              <Heading as="h3" className="text-xl">
                Catch-up target
              </Heading>
              {analysis?.target ? (
                <>
                  <p className="font-display text-4xl font-bold tracking-tight text-koi sm:text-5xl">
                    +{formatPoints(analysis.target.catchUpPerHour)}
                    <span className="ml-1.5 text-lg font-semibold text-ink-soft sm:text-xl">
                      /hr
                    </span>
                  </p>
                  <p className="max-w-md text-sm leading-relaxed text-ink-soft">
                    Extra pace needed to catch{" "}
                    <span className="font-medium text-ink">
                      {analysis.target.name}
                    </span>
                    . {formatPoints(analysis.target.deficit)} behind at current
                    projection.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-relaxed text-ink-soft">
                  {analysis
                    ? "Projected lead in this window - hold pace."
                    : "Projection unavailable until battle end time is known."}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function GlanceCard({
  label,
  value,
  hint,
  tone,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "pos" | "neg";
  accent: "koi" | "teal";
}) {
  return (
    <article
      className={cn(
        "pond-card relative overflow-hidden pond-pad",
        accent === "koi"
          ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--koi-orange)_12%,transparent),transparent_55%)]"
          : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pond-teal)_12%,transparent),transparent_55%)]",
      )}
    >
      <p className="pond-label">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl",
          tone === "pos" && "text-lily",
          tone === "neg" && "text-alert",
          !tone && "text-ink",
        )}
      >
        {value}
      </p>
      {hint != null ? (
        <p className="mt-3 text-sm text-ink-soft">{hint}</p>
      ) : null}
    </article>
  );
}

function StripStat({
  label,
  value,
  hint,
  hintLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintLabel?: string;
}) {
  return (
    <div className="flex min-h-[5.5rem] flex-col justify-between gap-2 p-4 sm:p-5">
      <p className="pond-label">{label}</p>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-3xl">
          {value}
        </div>
        {hint != null || hintLabel ? (
          <p className="mt-1 text-xs text-ink-soft">
            {hint}
            {hintLabel ? (
              <span className="ml-1 uppercase tracking-wide">{hintLabel}</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
