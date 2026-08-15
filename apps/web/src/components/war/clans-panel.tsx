"use client";

import type { LeaderboardClan } from "@k0ii/schemas";

import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import {
  formatDuration,
  formatNumber,
  formatPoints,
  formatPph,
  formatRelativeTime,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { useLeaderboards } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function clanInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ClanMark({
  name,
  iconUrl,
  size = "md",
  ours,
  stacked,
}: {
  name: string;
  iconUrl: string | null;
  size?: "sm" | "md" | "lg";
  ours?: boolean;
  stacked?: boolean;
}) {
  const dim =
    size === "lg" ? "size-14" : size === "sm" ? "size-7" : "size-9";
  const text =
    size === "lg" ? "text-lg" : size === "sm" ? "text-[10px]" : "text-xs";
  const src = httpsOnlyUrl(iconUrl);
  const mark = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size === "lg" ? 56 : size === "sm" ? 28 : 36}
      height={size === "lg" ? 56 : size === "sm" ? 28 : 36}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn(
        dim,
        "shrink-0 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
      )}
    />
  ) : (
    <span
      className={cn(
        dim,
        text,
        "flex shrink-0 items-center justify-center rounded-full font-display font-bold",
        ours
          ? "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi"
          : "bg-card-surface-alt text-ink-soft",
      )}
      aria-hidden
    >
      {clanInitials(name)}
    </span>
  );
  const label = (
    <span
      className={cn(
        "min-w-0 font-display font-semibold",
        stacked ? "mt-2 block max-w-full truncate text-center" : "truncate",
        ours ? "text-koi" : "text-ink",
        size === "lg" && "text-xl sm:text-2xl",
      )}
    >
      {ours ? `${name} (you)` : name}
    </span>
  );

  if (stacked) {
    return (
      <span className="flex flex-col items-center">
        {mark}
        {label}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark}
      {label}
    </span>
  );
}

function PodiumCard({
  clan,
  place,
  elevate,
}: {
  clan: LeaderboardClan;
  place: 1 | 2 | 3;
  elevate?: boolean;
}) {
  const placeLabel = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
  return (
    <article
      className={cn(
        "clans-podium-card pond-card relative overflow-hidden pond-pad text-center",
        elevate && "md:-mt-3 md:pb-8",
        clan.isOurs &&
          "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
        place === 1 &&
          "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--koi-orange)_16%,transparent),transparent_60%)]",
        place === 2 &&
          "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--pond-teal)_12%,transparent),transparent_55%)]",
        place === 3 &&
          "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--lily-green)_12%,transparent),transparent_55%)]",
      )}
    >
      <p
        className={cn(
          "font-display text-sm font-semibold",
          place === 1 ? "text-koi" : "text-pond-teal",
        )}
      >
        {placeLabel}
      </p>
      <div className="mt-3 flex justify-center">
        <ClanMark
          name={clan.name}
          iconUrl={clan.iconUrl}
          size="lg"
          ours={clan.isOurs}
          stacked
        />
      </div>
      <p
        className={cn(
          "mt-4 font-display font-bold tabular-nums tracking-tight text-ink",
          elevate ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        {formatPoints(clan.points)}
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">{formatPph(clan.pph)}</p>
      {clan.memberCount != null ? (
        <p className="mt-2 text-xs text-ink-soft">
          {formatNumber(clan.memberCount)} members
          {clan.contributorCount != null
            ? ` · ${formatNumber(clan.contributorCount)} active`
            : ""}
        </p>
      ) : null}
      {clan.gapToNext != null && place !== 1 ? (
        <p className="mt-2 text-xs text-ink-soft">
          {formatPoints(clan.gapToNext)} to next
        </p>
      ) : null}
    </article>
  );
}

export function ClansPanel() {
  const { data, isLoading, error, isFetching, refetch } = useLeaderboards({
    refetchInterval: 30_000,
  });

  if (isLoading && !data) {
    return <HubSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h3" className="text-xl">
          Clan Standings
        </Heading>
        <p className="max-w-md text-sm text-ink-soft">
          Could not load clan leaderboards. Check the API, then try again.
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

  const live = data.battleLive;
  const ours = data.clans.find((c) => c.isOurs) ?? null;
  const podium = data.clans.slice(0, 3);
  const first = podium[0];
  const second = podium[1];
  const third = podium[2];
  const maxPoints = Math.max(
    ...data.clans.map((c) => Number(c.points) || 0),
    1,
  );

  return (
    <div className="pond-stack animate-fade-rise">
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
              Clan Standings
            </Heading>
            <Badge variant={live ? "success" : "secondary"}>
              {live ? "Live Battle" : "Last Battle"}
            </Badge>
          </div>
          <p className="text-sm text-ink-soft">
            {data.battleId ? data.battleId : live ? "Live War" : "Between Wars"}
            {" · "}
            updated {formatRelativeTime(data.generatedAt)}
            {isFetching ? " · refreshing" : " · every 30s"}
          </p>
        </div>

        {ours ? (
          <div className="pond-card min-w-[10rem] pond-pad text-right">
            <p className="pond-label">Our Place</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums text-koi sm:text-5xl">
              {formatOrdinal(ours.rank)}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {formatPoints(ours.points)} pts
            </p>
          </div>
        ) : null}
      </header>

      {ours?.gapToNext != null && ours.rank > 1 ? (
        <div className="pond-card flex flex-wrap items-center justify-between gap-3 pond-pad">
          <div>
            <p className="pond-label">Gap to Next</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {formatPoints(ours.gapToNext)}
            </p>
          </div>
          <p className="max-w-sm text-sm text-ink-soft">
            {ours.etaSeconds != null
              ? `ETA at current pace: ${formatDuration(ours.etaSeconds * 1000)}`
              : live
                ? "Hold or raise pace to climb."
                : "From last battle snapshot."}
          </p>
        </div>
      ) : null}

      {podium.length > 0 ? (
        <section className="space-y-3">
          <Heading as="h3" className="text-xl sm:text-2xl">
            Podium
          </Heading>
          {/* Mobile: 1st then 2nd/3rd */}
          <div className="grid gap-3 md:hidden">
            {first ? <PodiumCard clan={first} place={1} elevate /> : null}
            <div className="grid grid-cols-2 gap-3">
              {second ? <PodiumCard clan={second} place={2} /> : null}
              {third ? <PodiumCard clan={third} place={3} /> : null}
            </div>
          </div>
          {/* Desktop: 2 | 1 | 3 */}
          <div className="hidden items-end gap-3 md:grid md:grid-cols-3">
            {second ? <PodiumCard clan={second} place={2} /> : <div />}
            {first ? <PodiumCard clan={first} place={1} elevate /> : <div />}
            {third ? <PodiumCard clan={third} place={3} /> : <div />}
          </div>
        </section>
      ) : (
        <div className="pond-card pond-pad">
          <Heading as="h3" className="text-xl">
            No clans yet
          </Heading>
          <p className="mt-1 max-w-lg text-sm text-ink-soft">
            Standings fill when battle snapshots land. Come back mid-war.
          </p>
        </div>
      )}

      <section className="pond-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5 sm:px-5">
          <div>
            <Heading as="h3" className="text-xl sm:text-2xl">
              Full Ladder
            </Heading>
            <p className="mt-0.5 text-xs text-ink-soft">
              Points, pace, and pass ETA
            </p>
          </div>
          <Badge variant="info">{data.clans.length} clans</Badge>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] text-left text-xs text-ink-soft">
                <th className="px-4 py-2.5 font-medium sm:px-5">Rank</th>
                <th className="px-2 py-2.5 font-medium">Clan</th>
                <th className="px-2 py-2.5 font-medium">Points</th>
                <th className="px-2 py-2.5 font-medium">PPH</th>
                <th className="px-2 py-2.5 font-medium">Members</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">ETA</th>
              </tr>
            </thead>
            <tbody>
              {data.clans.map((clan, i) => (
                <tr
                  key={clan.name}
                  className={cn(
                    "clans-ladder-row border-b border-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] last:border-0 transition-[background-color] duration-150 ease-[var(--ease-out)]",
                    clan.isOurs &&
                      "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)] shadow-[inset_3px_0_0_var(--koi-orange)]",
                    i < 3 &&
                      !clan.isOurs &&
                      "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                  )}
                >
                  <td className="px-4 py-2.5 font-tabular font-semibold text-koi sm:px-5">
                    #{clan.rank}
                  </td>
                  <td className="px-2 py-2.5">
                    <ClanMark
                      name={clan.name}
                      iconUrl={clan.iconUrl}
                      size="sm"
                      ours={clan.isOurs}
                    />
                  </td>
                  <td className="px-2 py-2.5 font-tabular">
                    {formatPoints(clan.points)}
                    {clan.gapToNext != null && clan.rank > 1 ? (
                      <span className="ml-2 text-xs text-ink-soft">
                        ({formatPoints(clan.gapToNext)} gap)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5 font-tabular">
                    {formatPph(clan.pph)}
                  </td>
                  <td className="px-2 py-2.5 font-tabular text-ink-soft">
                    {clan.memberCount != null
                      ? formatNumber(clan.memberCount)
                      : "-"}
                    {clan.contributorCount != null
                      ? ` / ${formatNumber(clan.contributorCount)}`
                      : ""}
                  </td>
                  <td className="px-4 py-2.5 font-tabular text-ink-soft sm:px-5">
                    {clan.etaSeconds != null
                      ? formatDuration(clan.etaSeconds * 1000)
                      : "-"}
                  </td>
                </tr>
              ))}
              {!data.clans.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-ink-soft"
                  >
                    No clan data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] md:hidden">
          {data.clans.map((clan) => {
            const pct = Math.min(
              100,
              Math.max(4, (Number(clan.points) / maxPoints) * 100),
            );
            return (
              <li
                key={clan.name}
                className={cn(
                  "space-y-2.5 px-4 py-3.5",
                  clan.isOurs &&
                    "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <ClanMark
                    name={clan.name}
                    iconUrl={clan.iconUrl}
                    size="sm"
                    ours={clan.isOurs}
                  />
                  <span className="shrink-0 font-tabular text-sm font-semibold text-koi">
                    #{clan.rank}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="pond-label">Points</p>
                    <p className="font-tabular font-semibold text-ink">
                      {formatPoints(clan.points)}
                    </p>
                  </div>
                  <div>
                    <p className="pond-label">PPH</p>
                    <p className="font-tabular text-ink">
                      {formatPph(clan.pph)}
                    </p>
                  </div>
                  <div>
                    <p className="pond-label">ETA</p>
                    <p className="font-tabular text-ink-soft">
                      {clan.etaSeconds != null
                        ? formatDuration(clan.etaSeconds * 1000)
                        : "-"}
                    </p>
                  </div>
                </div>
                {clan.memberCount != null ? (
                  <p className="text-xs text-ink-soft">
                    {formatNumber(clan.memberCount)} members
                    {clan.gapToNext != null && clan.rank > 1
                      ? ` · ${formatPoints(clan.gapToNext)} to next`
                      : ""}
                  </p>
                ) : null}
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]",
                      clan.isOurs
                        ? "bg-[color-mix(in_srgb,var(--koi-orange)_70%,transparent)]"
                        : "bg-[color-mix(in_srgb,var(--pond-teal)_55%,transparent)]",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
          {!data.clans.length ? (
            <li className="px-4 py-8 text-center text-sm text-ink-soft">
              No clan data yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
