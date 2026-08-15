"use client";

import type { LeagueEntry } from "@k0ii/schemas";
import { useMemo, useState } from "react";

import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import {
  formatNumber,
  formatPoints,
  formatPph,
  formatRelativeTime,
  formatSignedDelta,
} from "@/lib/format";
import { useLeagues } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function DeltaTone({
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
        ? "text-[color-mix(in_srgb,var(--pond-teal)_85%,var(--ink))]"
        : value < 0
          ? "text-koi"
          : "text-ink-soft";
  return (
    <span className={cn("font-tabular", tone, className)}>
      {formatSignedDelta(value)}
    </span>
  );
}

function LeagueMark({
  league,
  size = "sm",
  showContributors = true,
}: {
  league: LeagueEntry;
  size?: "sm" | "lg";
  showContributors?: boolean;
}) {
  const dim = size === "lg" ? "size-12" : "size-8";
  const text = size === "lg" ? "text-base" : "text-[10px]";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          dim,
          text,
          "flex shrink-0 items-center justify-center rounded-full font-display font-bold",
          league.isOurs
            ? "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi"
            : "bg-card-surface-alt text-ink-soft",
        )}
        aria-hidden
      >
        {leagueInitials(league.name)}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-display font-semibold",
            league.isOurs ? "text-koi" : "text-ink",
            size === "lg" && "text-lg sm:text-xl",
          )}
        >
          {league.name}
          {league.isOurs ? " (ours)" : ""}
        </span>
        {showContributors && league.contributorCount != null ? (
          <span className="mt-0.5 block truncate text-xs text-ink-soft">
            {formatNumber(league.contributorCount)} contributors
          </span>
        ) : null}
      </span>
    </span>
  );
}

function TrackedCard({ league }: { league: LeagueEntry }) {
  return (
    <article
      className={cn(
        "pond-card pond-pad transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
        league.isOurs &&
          "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--koi-orange)_12%,transparent),transparent_55%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <LeagueMark league={league} size="lg" />
        {league.isOurs ? <Badge variant="success">Us</Badge> : null}
      </div>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums tracking-tight text-ink">
        {league.rank != null ? formatOrdinal(league.rank) : "-"}
      </p>
      <p className="mt-1 font-tabular text-lg font-semibold text-koi">
        {formatPoints(league.points)}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] pt-3">
        <div>
          <dt className="pond-label">PPH</dt>
          <dd className="mt-0.5 font-tabular text-sm font-semibold text-ink">
            {formatPph(league.pph)}
          </dd>
        </div>
        <div>
          <dt className="pond-label">5m</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            <DeltaTone value={league.delta5m} />
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function LeaguesView() {
  const { data, isLoading, error, refetch } = useLeagues();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = data?.top100 ?? [];
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle));
  }, [data, q]);

  const tracked = data?.tracked ?? [];
  const oursTracked = useMemo(
    () => tracked.find((l) => l.isOurs) ?? null,
    [tracked],
  );
  const oursInTop = useMemo(
    () => (data?.top100 ?? []).find((l) => l.isOurs) ?? null,
    [data],
  );
  const hasFilter = q.trim().length > 0;
  const podium =
    !hasFilter && filtered.length >= 3 ? filtered.slice(0, 3) : [];
  const maxPoints = Math.max(
    ...filtered.map((l) => l.points ?? 0),
    1,
  );

  if (isLoading && !data) {
    return (
      <div className="pond-page animate-fade-rise">
        <HubSkeleton className="h-36" />
        <HubSkeleton className="h-48" />
        <HubSkeleton className="h-72" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pond-page animate-fade-rise">
        <div className="pond-card flex flex-col items-start gap-3 pond-pad">
          <Heading as="h1" className="text-3xl sm:text-4xl">
            League <span className="text-koi">Tracker</span>
          </Heading>
          <p className="max-w-md text-sm text-ink-soft">
            Failed to load league data. Check the API, then try again.
          </p>
          <Button
            size="sm"
            className="active:scale-[0.97]"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pond-page animate-fade-rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 pond-section-head">
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading as="h1">
              League <span className="text-koi">Tracker</span>
            </Heading>
            <Badge variant="info">
              {formatNumber(data?.top100.length ?? 0)} top
            </Badge>
          </div>
          <p className="pond-lede max-w-xl">
            Tracked leagues plus a searchable top 100 snapshot.
          </p>
          {data ? (
            <p className="text-sm text-ink-soft">
              Updated {formatRelativeTime(data.generatedAt)}
            </p>
          ) : null}
        </div>

        <div className="pond-card grid min-w-[11rem] grid-cols-2 gap-3 pond-pad sm:min-w-[15rem]">
          <div>
            <p className="pond-label">Tracked</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
              {formatNumber(tracked.length)}
            </p>
          </div>
          <div>
            <p className="pond-label">Our Rank</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-koi">
              {oursTracked?.rank != null
                ? `#${formatNumber(oursTracked.rank)}`
                : oursInTop?.rank != null
                  ? `#${formatNumber(oursInTop.rank)}`
                  : "-"}
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Heading as="h2" className="text-xl sm:text-2xl">
            Tracked
          </Heading>
          {oursTracked ? (
            <Badge variant="success">
              {oursTracked.name} · {formatPph(oursTracked.pph)}
            </Badge>
          ) : null}
        </div>
        {tracked.length === 0 ? (
          <p className="pond-card pond-pad text-sm text-ink-soft">
            No tracked leagues yet. Snapshot still lists top 100 below.
          </p>
        ) : (
          <div
            className={cn(
              "grid gap-3",
              tracked.length === 1
                ? "sm:grid-cols-1 max-w-md"
                : tracked.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {tracked.map((league) => (
              <TrackedCard key={league.name} league={league} />
            ))}
          </div>
        )}
      </section>

      {!hasFilter && podium.length > 0 ? (
        <section className="space-y-3">
          <Heading as="h2" className="text-xl sm:text-2xl">
            Top of Board
          </Heading>
          <div className="grid gap-3 sm:grid-cols-3">
            {podium.map((league, i) => (
              <article
                key={league.name}
                className={cn(
                  "pond-card pond-pad",
                  i === 0 &&
                    "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--koi-orange)_14%,transparent),transparent_60%)]",
                  league.isOurs &&
                    "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
                )}
              >
                <p className="pond-label">
                  {league.rank != null ? formatOrdinal(league.rank) : "-"}
                </p>
                <div className="mt-3">
                  <LeagueMark league={league} size="lg" />
                </div>
                <p className="mt-4 font-display text-3xl font-bold tabular-nums tracking-tight text-ink">
                  {formatPoints(league.points)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatPph(league.pph)} · 5m{" "}
                  <DeltaTone value={league.delta5m} />
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pond-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5 sm:px-5">
          <div>
            <Heading as="h2" className="text-xl sm:text-2xl">
              Top 100
            </Heading>
            <p className="mt-0.5 text-xs text-ink-soft">
              {hasFilter
                ? `${formatNumber(filtered.length)} matches`
                : "Full league ladder snapshot"}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <label className="block min-w-0 flex-1 space-y-1.5 sm:w-56 sm:flex-none">
              <span className="text-xs font-medium text-ink-soft">Search</span>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="League name"
                autoComplete="off"
              />
            </label>
            {hasFilter ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="active:scale-[0.97]"
                onClick={() => setQ("")}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] text-left text-xs text-ink-soft">
                <th className="px-4 py-2.5 font-medium sm:px-5">Rank</th>
                <th className="px-2 py-2.5 font-medium">League</th>
                <th className="px-2 py-2.5 font-medium">Points</th>
                <th className="px-2 py-2.5 font-medium">PPH</th>
                <th className="px-2 py-2.5 font-medium">5m</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Members</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((league, i) => (
                <tr
                  key={league.name}
                  className={cn(
                    "leagues-ladder-row border-b border-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] last:border-0 transition-[background-color] duration-150 ease-[var(--ease-out)]",
                    league.isOurs &&
                      "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)] shadow-[inset_3px_0_0_var(--koi-orange)]",
                    i < 3 &&
                      !hasFilter &&
                      !league.isOurs &&
                      "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                  )}
                >
                  <td className="px-4 py-2.5 font-tabular text-ink-soft sm:px-5">
                    {league.rank != null ? `#${formatNumber(league.rank)}` : "-"}
                  </td>
                  <td className="px-2 py-2.5">
                    <LeagueMark league={league} showContributors={false} />
                  </td>
                  <td className="px-2 py-2.5 font-tabular font-semibold text-ink">
                    {formatPoints(league.points)}
                  </td>
                  <td className="px-2 py-2.5 font-tabular text-ink-soft">
                    {formatPph(league.pph)}
                  </td>
                  <td className="px-2 py-2.5">
                    <DeltaTone value={league.delta5m} />
                  </td>
                  <td className="px-4 py-2.5 font-tabular text-ink-soft sm:px-5">
                    {league.contributorCount != null
                      ? formatNumber(league.contributorCount)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] md:hidden">
          {filtered.map((league) => {
            const pct = Math.min(
              100,
              Math.max(4, ((league.points ?? 0) / maxPoints) * 100),
            );
            return (
              <li
                key={league.name}
                className={cn(
                  "space-y-2.5 px-4 py-3.5",
                  league.isOurs &&
                    "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <LeagueMark league={league} />
                  <span className="shrink-0 font-tabular text-sm text-ink-soft">
                    {league.rank != null
                      ? `#${formatNumber(league.rank)}`
                      : "-"}
                  </span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <p className="font-display text-2xl font-bold tabular-nums text-ink">
                    {formatPoints(league.points)}
                  </p>
                  <div className="text-right text-xs text-ink-soft">
                    <p>{formatPph(league.pph)}</p>
                    <p>
                      5m <DeltaTone value={league.delta5m} />
                    </p>
                  </div>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]",
                      league.isOurs
                        ? "bg-[color-mix(in_srgb,var(--koi-orange)_70%,transparent)]"
                        : "bg-[color-mix(in_srgb,var(--pond-teal)_55%,transparent)]",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">
            No leagues matched. Try a different name.
          </p>
        ) : null}
      </section>
    </div>
  );
}
