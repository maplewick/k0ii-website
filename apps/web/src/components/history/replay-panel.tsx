"use client";

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  BattlePicker,
  battleLabel,
} from "@/components/history/battle-picker";
import { HubEmpty, HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { MetricTile } from "@/components/roster/dialog-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  humanBattleName,
  membersFromBattleDetail,
  membersFromRoster,
  REPLAY_MAX_ROWS,
  REPLAY_PLAY_MS,
  REPLAY_PLAY_STEP,
  resolveBattleTimeRange,
  valueAt,
} from "@/lib/analytics/replay";
import { formatDuration, formatNumber, formatPoints } from "@/lib/format";
import { useBattleArchive, useBattleDetail, useRoster } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function httpsAvatar(url: string | null | undefined): string | null {
  if (!url || !/^https:\/\//i.test(url)) return null;
  return url;
}

function memberLabel(name: string | null | undefined, userId: string): string {
  const n = (name ?? "").trim();
  if (!n || /^User \d+$/i.test(n) || n === "Unknown") {
    return userId ? `User ${userId}` : "Unknown";
  }
  return n;
}

type RankedRow = {
  name: string;
  userId: string;
  avatarUrl: string | null;
  points: number;
  rank: number;
  finalRank: number;
};

export function ReplayPanel({
  battleId,
  onBattleIdChange,
}: {
  battleId: string | null;
  onBattleIdChange: (id: string) => void;
}) {
  const { data: archive, isLoading, error, refetch } = useBattleArchive();
  const { data: roster } = useRoster({ refetchInterval: false });

  const battles = useMemo(() => {
    const list = [...(archive?.battles ?? [])];
    list.sort(
      (a, b) =>
        (b.finalizedAt ?? b.endedAt ?? 0) - (a.finalizedAt ?? a.endedAt ?? 0),
    );
    return list;
  }, [archive?.battles]);

  const defaultBattleId = battles[0]?.battleId ?? "";
  const effectiveId = battleId || defaultBattleId;
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useBattleDetail(effectiveId || null);

  useEffect(() => {
    if (!battleId && defaultBattleId) {
      onBattleIdChange(defaultBattleId);
    }
  }, [battleId, defaultBattleId, onBattleIdChange]);

  const members = useMemo(() => {
    const fromDetail = membersFromBattleDetail(detail);
    if (fromDetail.length) return fromDetail;
    if (
      roster?.battle?.id &&
      effectiveId &&
      roster.battle.id === effectiveId
    ) {
      return membersFromRoster(roster?.members);
    }
    return fromDetail;
  }, [detail, roster, effectiveId]);

  const range = useMemo(
    () => resolveBattleTimeRange(members, detail?.startedAt, detail?.endedAt),
    [members, detail],
  );

  const [pct, setPct] = useState(100);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setPct(100);
  }, [effectiveId, range.tStart, range.tEnd]);

  useEffect(() => {
    if (!playing || range.tEnd <= range.tStart) return;
    const id = window.setInterval(() => {
      setPct((prev) => {
        const next = prev + REPLAY_PLAY_STEP;
        if (next >= 100) {
          setPlaying(false);
          return 100;
        }
        return next;
      });
    }, REPLAY_PLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, range]);

  const canScrub = members.length > 0 && range.tEnd > range.tStart;

  const t =
    range.tEnd > range.tStart
      ? range.tStart + ((range.tEnd - range.tStart) * pct) / 100
      : range.tStart;

  const ranked = useMemo((): RankedRow[] => {
    const atT = members
      .map((m) => ({
        name: m.name,
        userId: m.userId,
        avatarUrl: m.avatarUrl,
        points: valueAt(m.series, t),
      }))
      .sort((a, b) => b.points - a.points);

    const atEnd = members
      .map((m) => ({
        userId: m.userId,
        points: valueAt(m.series, range.tEnd),
      }))
      .sort((a, b) => b.points - a.points);

    const finalRank = new Map<string, number>();
    atEnd.forEach((row, i) => finalRank.set(row.userId, i + 1));

    return atT.map((row, i) => ({
      ...row,
      rank: i + 1,
      finalRank: finalRank.get(row.userId) ?? i + 1,
    }));
  }, [members, t, range.tEnd]);

  const board = ranked.slice(0, REPLAY_MAX_ROWS);
  const podium = board.slice(0, 3);
  const totalPts = ranked.reduce((s, r) => s + r.points, 0);
  const contributors = ranked.filter((r) => r.points > 0).length;
  const maxPts = board[0]?.points || 1;

  const selectedMeta = battles.find((b) => b.battleId === effectiveId);
  const displayName = selectedMeta
    ? battleLabel(selectedMeta)
    : detail?.title?.trim() ||
      (effectiveId ? humanBattleName(effectiveId) : "Select a battle");

  function setScrub(next: number) {
    setPlaying(false);
    setPct(Math.min(100, Math.max(0, next)));
  }

  function nudge(delta: number) {
    setScrub(pct + delta);
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!canScrub) return;
    if (pct >= 100) setPct(0);
    setPlaying(true);
  }

  if (isLoading && !archive) {
    return <HubSkeleton className="h-64" />;
  }

  if (error && !archive) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h2" className="text-2xl">
          Replay
        </Heading>
        <p className="max-w-md text-sm text-ink-soft">
          Could not load the battle archive. Check the API, then try again.
        </p>
        <Button size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!battles.length && !roster?.battle?.id) {
    return (
      <HubEmpty
        title="Nothing to replay"
        detail="Need archived battles with member snapshot history."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start">
      <BattlePicker
        battles={battles}
        selectedId={effectiveId || null}
        onSelect={onBattleIdChange}
        loading={isLoading}
        subtitle="Pick one to scrub"
      />

      <div
        className="animate-fade-rise pond-stack"
        style={{ animationDelay: "40ms" }}
      >
        <article
          className={cn(
            "pond-card relative overflow-hidden p-5 sm:p-6",
            "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_16%,var(--card-surface)),var(--card-surface)_68%)]",
            "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_26%,transparent)]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pond-teal)_40%,transparent),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/4 size-36 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_22%,transparent),transparent_72%)] blur-2xl"
            aria-hidden
          />

          <div className="relative space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {detail?.live ? <Badge variant="success">Live</Badge> : null}
                  {playing ? <Badge variant="info">Playing</Badge> : null}
                  <Heading as="h2" className="text-2xl sm:text-3xl">
                    {displayName}
                  </Heading>
                </div>
                <p className="text-sm text-ink-soft">
                  {detailLoading && !members.length
                    ? "Loading timeline…"
                    : members.length
                      ? `${formatNumber(members.length)} members · ${formatDuration(range.tEnd - range.tStart)} of history`
                      : detailError && !members.length
                        ? "Could not load this battle"
                        : "No per-member history recorded"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-tabular text-lg font-semibold text-ink sm:text-xl">
                    {canScrub ? new Date(t).toLocaleString() : "-"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {canScrub
                      ? `${formatDuration(t - range.tStart)} elapsed of ${formatDuration(range.tEnd - range.tStart)}`
                      : "Scrubber idle"}
                  </p>
                </div>
                <p className="font-tabular text-2xl font-semibold text-koi sm:text-3xl">
                  {pct.toFixed(0)}
                  <span className="text-base text-ink-soft sm:text-lg">%</span>
                </p>
              </div>

              <div className="relative h-3 w-full">
                <div
                  className="absolute inset-0 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_20%,transparent)]"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-[linear-gradient(90deg,var(--pond-teal),color-mix(in_srgb,var(--koi-orange)_70%,var(--pond-teal)))]",
                      playing &&
                        "transition-[width] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={pct}
                  disabled={!canScrub}
                  onChange={(e) => setScrub(Number(e.target.value))}
                  aria-label="Replay scrubber"
                  className={cn(
                    "absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-koi",
                    "[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--card-surface)_90%,transparent)]",
                    "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
                    "[&::-webkit-slider-thumb]:ease-[cubic-bezier(0.23,1,0.32,1)]",
                    "active:[&::-webkit-slider-thumb]:scale-[0.97]",
                    "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
                    "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-koi",
                    "[&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:bg-transparent",
                    "[&::-moz-range-track]:h-3 [&::-moz-range-track]:bg-transparent",
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canScrub}
                  aria-label="Jump to start"
                  onClick={() => setScrub(0)}
                >
                  <SkipBack className="size-4" />
                  <span className="sr-only sm:not-sr-only">Start</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canScrub}
                  aria-label="Back 10 percent"
                  onClick={() => nudge(-10)}
                >
                  <StepBack className="size-4" />
                  <span className="sr-only sm:not-sr-only">-10%</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={playing ? "secondary" : "default"}
                  disabled={!canScrub}
                  onClick={togglePlay}
                  className="min-w-[6.5rem]"
                >
                  {playing ? (
                    <>
                      <Pause className="size-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="size-4" /> Play
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canScrub}
                  aria-label="Forward 10 percent"
                  onClick={() => nudge(10)}
                >
                  <StepForward className="size-4" />
                  <span className="sr-only sm:not-sr-only">+10%</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canScrub}
                  aria-label="Jump to end"
                  onClick={() => setScrub(100)}
                >
                  <SkipForward className="size-4" />
                  <span className="sr-only sm:not-sr-only">End</span>
                </Button>
              </div>
            </div>

            {canScrub ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MetricTile
                  label="Clan pts"
                  value={formatPoints(totalPts)}
                  accent
                />
                <MetricTile
                  label="Elapsed"
                  value={formatDuration(t - range.tStart)}
                />
                <MetricTile
                  label="Leader"
                  value={
                    podium[0]
                      ? memberLabel(podium[0].name, podium[0].userId)
                      : "-"
                  }
                />
                <MetricTile
                  label="Active"
                  value={`${formatNumber(contributors)}/${formatNumber(ranked.length)}`}
                />
              </div>
            ) : null}
          </div>
        </article>

        {canScrub && podium.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {podium.map((row, i) => {
              const avatar = httpsAvatar(row.avatarUrl);
              const label = memberLabel(row.name, row.userId);
              const share =
                totalPts > 0 ? ((row.points / totalPts) * 100).toFixed(1) : "0";
              return (
                <div
                  key={row.userId || row.name}
                  className={cn(
                    "pond-card flex items-center gap-3 p-3.5 sm:p-4",
                    i === 0 &&
                      "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_40%,transparent)] sm:order-2 sm:-mt-1",
                    i === 1 && "sm:order-1",
                    i === 2 && "sm:order-3",
                    i === 0 &&
                      "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--koi-orange)_14%,var(--card-surface)),var(--card-surface))]",
                    i === 1 &&
                      "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface)),var(--card-surface))]",
                    i === 2 &&
                      "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--lily-green)_12%,var(--card-surface)),var(--card-surface))]",
                  )}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full bg-card-surface-alt object-cover ring-2 ring-[color-mix(in_srgb,var(--pond-teal)_24%,transparent)]"
                    />
                  ) : (
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card-surface-alt font-display text-sm font-semibold text-ink-soft ring-2 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]"
                      aria-hidden
                    >
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-semibold tracking-[0.06em] text-ink-soft uppercase">
                      #{row.rank}
                    </p>
                    <p className="truncate font-display text-sm font-semibold text-ink sm:text-base">
                      {label}
                    </p>
                    <p className="mt-0.5 font-tabular text-sm font-semibold text-koi">
                      {formatPoints(row.points)}
                      <span className="ml-1.5 text-xs font-medium text-ink-soft">
                        {share}%
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="pond-card overflow-hidden">
          <div className="border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5 sm:px-5">
            <Heading as="h3" className="text-xl">
              Standings at Scrub
            </Heading>
            <p className="mt-0.5 text-xs text-ink-soft">
              Rank vs finish shown when a player climbs or slips.
            </p>
          </div>

          {detailLoading && !members.length ? (
            <div className="space-y-2 p-4" aria-hidden>
              <div className="h-12 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
              <div className="h-12 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
              <div className="h-12 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
            </div>
          ) : !members.length ? (
            <p className="px-4 py-10 text-center text-sm text-ink-soft sm:px-5">
              {detailError
                ? "Could not load this battle."
                : "No per-member history recorded for this battle."}
            </p>
          ) : (
            <>
              <div className="hidden sm:block">
                <div className="max-h-[min(70vh,48rem)] overflow-auto overscroll-contain">
                  <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        {(
                          [
                            { label: "#", align: "left" as const, w: "w-12" },
                            { label: "Player", align: "left" as const },
                            { label: "Pace", align: "left" as const },
                            { label: "Vs Finish", align: "right" as const },
                            { label: "Points", align: "right" as const },
                          ] as const
                        ).map((col) => (
                          <th
                            key={col.label}
                            scope="col"
                            className={cn(
                              "sticky top-0 z-10 h-11 bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] px-3",
                              "border-b border-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
                              "text-[0.68rem] font-semibold tracking-[0.06em] text-ink-soft uppercase",
                              col.align === "right" && "text-right",
                              "w" in col && col.w,
                            )}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {board.map((row, i) => {
                        const avatar = httpsAvatar(row.avatarUrl);
                        const label = memberLabel(row.name, row.userId);
                        const climb = row.finalRank - row.rank;
                        return (
                          <tr
                            key={row.userId || row.name}
                            className={cn(
                              i % 2 === 1 &&
                                "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                              i === 0 &&
                                "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                              i === 1 &&
                                "bg-[color-mix(in_srgb,var(--pond-teal)_8%,transparent)]",
                              i === 2 &&
                                "bg-[color-mix(in_srgb,var(--lily-green)_8%,transparent)]",
                            )}
                          >
                            <td className="px-3 py-2.5 font-tabular font-semibold text-ink-soft">
                              {row.rank}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2.5">
                                {avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={avatar}
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="size-8 shrink-0 rounded-full bg-card-surface-alt object-cover"
                                  />
                                ) : (
                                  <span
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-surface-alt text-xs font-semibold text-ink-soft"
                                    aria-hidden
                                  >
                                    {label.slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                <span className="truncate font-display font-semibold text-ink">
                                  {label}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="block h-1.5 max-w-[11rem] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
                                <span
                                  className={cn(
                                    "block h-full rounded-full bg-pond-teal",
                                    playing &&
                                      "transition-[width] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                                  )}
                                  style={{
                                    width: `${Math.min(100, (row.points / maxPts) * 100).toFixed(2)}%`,
                                  }}
                                />
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-tabular text-xs font-semibold">
                              <ClimbDelta climb={climb} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-tabular font-semibold text-koi">
                              {formatPoints(row.points)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] sm:hidden">
                {board.map((row, i) => {
                  const avatar = httpsAvatar(row.avatarUrl);
                  const label = memberLabel(row.name, row.userId);
                  const climb = row.finalRank - row.rank;
                  return (
                    <li
                      key={row.userId || row.name}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        i === 0 &&
                          "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                        i === 1 &&
                          "bg-[color-mix(in_srgb,var(--pond-teal)_8%,transparent)]",
                        i === 2 &&
                          "bg-[color-mix(in_srgb,var(--lily-green)_8%,transparent)]",
                      )}
                    >
                      <span className="w-6 shrink-0 font-tabular text-sm font-semibold text-ink-soft">
                        {row.rank}
                      </span>
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt=""
                          width={36}
                          height={36}
                          className="size-9 shrink-0 rounded-full bg-card-surface-alt object-cover"
                        />
                      ) : (
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-surface-alt text-xs font-semibold text-ink-soft"
                          aria-hidden
                        >
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-display font-semibold text-ink">
                            {label}
                          </span>
                          <span className="shrink-0 font-tabular font-semibold text-koi">
                            {formatPoints(row.points)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
                            <span
                              className={cn(
                                "block h-full rounded-full bg-pond-teal",
                                playing &&
                                  "transition-[width] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                              )}
                              style={{
                                width: `${Math.min(100, (row.points / maxPts) * 100).toFixed(2)}%`,
                              }}
                            />
                          </span>
                          <ClimbDelta climb={climb} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-soft">
          Positions rebuilt from snapshots; movement between samples is
          interpolated.
        </p>
      </div>
    </div>
  );
}

function ClimbDelta({ climb }: { climb: number }) {
  if (climb === 0) {
    return <span className="text-ink-soft">-</span>;
  }
  if (climb > 0) {
    return (
      <span className="text-[color-mix(in_srgb,var(--lily-green)_85%,var(--ink))]">
        +{climb}
      </span>
    );
  }
  return (
    <span className="text-[color-mix(in_srgb,var(--koi-orange)_90%,var(--ink))]">
      {climb}
    </span>
  );
}
