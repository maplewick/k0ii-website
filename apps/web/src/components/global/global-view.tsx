"use client";

import type { GlobalPlayer } from "@k0ii/schemas";
import { useEffect, useMemo, useState } from "react";

import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import {
  formatNumber,
  formatPoints,
  formatRelativeTime,
} from "@/lib/format";
import { useGlobalLeaderboard } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 300;

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function robloxProfileUrl(userId: string): string {
  return `https://www.roblox.com/users/${encodeURIComponent(userId)}/profile`;
}

function PlayerMark({
  player,
  size = "sm",
  showClan = true,
}: {
  player: GlobalPlayer;
  size?: "sm" | "lg";
  showClan?: boolean;
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
          player.isOurs
            ? "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi"
            : "bg-card-surface-alt text-ink-soft",
        )}
        aria-hidden
      >
        {playerInitials(player.displayName)}
      </span>
      <span className="min-w-0">
        <a
          href={robloxProfileUrl(player.robloxUserId)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block truncate font-display font-semibold transition-colors duration-150 ease-[var(--ease-out)]",
            "hover:text-pond-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pond-teal)_45%,transparent)] focus-visible:ring-offset-2",
            player.isOurs ? "text-koi" : "text-ink",
            size === "lg" && "text-lg sm:text-xl",
          )}
        >
          {player.displayName}
          {player.isOurs ? " (ours)" : ""}
        </a>
        {showClan && player.clanName ? (
          <span className="mt-0.5 block truncate text-xs text-ink-soft">
            {player.clanName}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function GlobalView() {
  const [q, setQ] = useState("");
  const [clan, setClan] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [debouncedClan, setDebouncedClan] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setDebouncedClan(clan.trim());
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [q, clan]);

  const filtersPending =
    q.trim() !== debouncedQ || clan.trim() !== debouncedClan;

  const { data, isLoading, isFetching, error, refetch } = useGlobalLeaderboard({
    q: debouncedQ || undefined,
    clan: debouncedClan || undefined,
    limit: LIMIT,
    offset,
  });

  const players = data?.players ?? [];
  const total = data?.total ?? 0;
  const showSkeleton = isLoading && !data;
  const pagingBusy = isFetching || filtersPending;
  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = Boolean(debouncedQ || debouncedClan);
  const oursOnPage = useMemo(
    () => players.filter((p) => p.isOurs).length,
    [players],
  );
  const podium = offset === 0 && !hasFilters ? players.slice(0, 3) : [];
  const maxPoints = Math.max(...players.map((p) => p.points), 1);

  function clearFilters() {
    setQ("");
    setClan("");
  }

  return (
    <div className="pond-page animate-fade-rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 pond-section-head">
          <div className="flex flex-wrap items-center gap-2.5">
            <Heading as="h1" className="pond-glow">
              Global <span className="text-koi">Players</span>
            </Heading>
            <Badge variant="info">{formatNumber(total)} indexed</Badge>
          </div>
          <p className="pond-lede max-w-xl">
            Cross-clan board from the top 500 clans by points. Refreshes about
            every 30 minutes while a battle is live — not every poll.
          </p>
          {data ? (
            <p className="text-sm text-ink-soft">
              Updated {formatRelativeTime(data.generatedAt)}
              {pagingBusy && !showSkeleton ? " · updating" : ""}
            </p>
          ) : null}
        </div>

        <div className="pond-card grid min-w-[11rem] grid-cols-2 gap-3 pond-pad sm:min-w-[14rem]">
          <div>
            <p className="pond-label">Page</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
              {page}
              <span className="text-base font-semibold text-ink-soft">
                /{pageCount}
              </span>
            </p>
          </div>
          <div>
            <p className="pond-label">Ours Here</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-koi">
              {formatNumber(oursOnPage)}
            </p>
          </div>
        </div>
      </header>

      <section className="pond-card pond-pad">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Heading as="h2" className="text-xl">
            Filters
          </Heading>
          {hasFilters || q || clan ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="active:scale-[0.97]"
              onClick={clearFilters}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-soft">Player</span>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search player"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-soft">Clan</span>
            <Input
              value={clan}
              onChange={(e) => setClan(e.target.value)}
              placeholder="Filter clan"
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="pond-card flex flex-col items-start gap-3 pond-pad">
          <Heading as="h2" className="text-xl">
            Global Players
          </Heading>
          <p className="max-w-md text-sm text-ink-soft">
            Failed to load global leaderboard. Check the API, then try again.
          </p>
          <Button
            size="sm"
            className="active:scale-[0.97]"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {!error && showSkeleton ? <HubSkeleton className="h-72" /> : null}

      {!error && !showSkeleton && podium.length > 0 ? (
        <section className="space-y-3">
          <Heading as="h2" className="text-xl sm:text-2xl">
            Top of Board
          </Heading>
          <div className="grid gap-3 sm:grid-cols-3">
            {podium.map((p, i) => (
              <article
                key={p.robloxUserId}
                className={cn(
                  "pond-card pond-pad",
                  i === 0 &&
                    "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--koi-orange)_14%,transparent),transparent_60%)]",
                  p.isOurs &&
                    "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
                )}
              >
                <p className="pond-label">{formatOrdinal(p.rank)}</p>
                <div className="mt-3">
                  <PlayerMark player={p} size="lg" />
                </div>
                <p className="mt-4 font-display text-3xl font-bold tabular-nums tracking-tight text-ink">
                  {formatPoints(p.points)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!error && !showSkeleton ? (
        <section
          className={cn(
            "pond-card overflow-hidden transition-opacity duration-200 ease-[var(--ease-out)]",
            pagingBusy ? "opacity-70" : "opacity-100",
          )}
        >
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5 sm:px-5">
            <div>
              <Heading as="h2" className="text-xl sm:text-2xl">
                Ladder
              </Heading>
              <p className="mt-0.5 text-xs text-ink-soft">
                {hasFilters
                  ? "Filtered results"
                  : `Showing ${formatNumber(offset + 1)}-${formatNumber(Math.min(offset + players.length, total))} of ${formatNumber(total)}`}
              </p>
            </div>
            <Badge variant="secondary">{players.length} on page</Badge>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] text-left text-xs text-ink-soft">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Rank</th>
                  <th className="px-2 py-2.5 font-medium">Player</th>
                  <th className="px-2 py-2.5 font-medium">Clan</th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Points</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.robloxUserId}
                    className={cn(
                      "global-ladder-row border-b border-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] last:border-0 transition-[background-color] duration-150 ease-[var(--ease-out)]",
                      p.isOurs &&
                        "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)] shadow-[inset_3px_0_0_var(--koi-orange)]",
                      i < 3 &&
                        offset === 0 &&
                        !hasFilters &&
                        !p.isOurs &&
                        "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                    )}
                  >
                    <td className="px-4 py-2.5 font-tabular text-ink-soft sm:px-5">
                      #{p.rank}
                    </td>
                    <td className="px-2 py-2.5">
                      <PlayerMark player={p} showClan={false} />
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {p.clanName ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 font-tabular font-semibold text-ink sm:px-5">
                      {formatPoints(p.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] md:hidden">
            {players.map((p) => {
              const pct = Math.min(
                100,
                Math.max(4, (p.points / maxPoints) * 100),
              );
              return (
                <li
                  key={p.robloxUserId}
                  className={cn(
                    "space-y-2.5 px-4 py-3.5",
                    p.isOurs &&
                      "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <PlayerMark player={p} />
                    <span className="shrink-0 font-tabular text-sm text-ink-soft">
                      #{p.rank}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-display text-2xl font-bold tabular-nums text-ink">
                      {formatPoints(p.points)}
                    </p>
                    {!p.clanName ? (
                      <span className="text-xs text-ink-soft">No clan</span>
                    ) : null}
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]"
                    aria-hidden
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]",
                        p.isOurs
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

          {!isLoading && players.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">
              No players matched. Try a different name or clan filter.
            </p>
          ) : null}
        </section>
      ) : null}

      {!error && !showSkeleton ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {formatNumber(total)} players total
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="active:scale-[0.97]"
              disabled={offset <= 0 || pagingBusy}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="active:scale-[0.97]"
              disabled={!data || offset + LIMIT >= total || pagingBusy}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
