"use client";

import type { RosterResponse } from "@k0ii/schemas";
import { parseAsString, useQueryState } from "nuqs";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo } from "react";

import { Heading } from "@/components/layout/heading";
import { PanelErrorBoundary } from "@/components/layout/panel-error-boundary";
import {
  AnalyticsDialogs,
  BattleProjectionPanel,
  useAnalyticsDialogs,
} from "@/components/roster/analytics-dialogs";
import { BattleCountdown } from "@/components/roster/battle-countdown";
import { BattleStatStrip } from "@/components/roster/battle-stat-strip";
import { ClanComparison } from "@/components/roster/clan-comparison";
import { MemberDialog } from "@/components/roster/member-dialog";
import {
  normalizeRosterSortKey,
  RosterTable,
  sortMembers,
  type RosterSortKey,
  type RosterSortOrder,
} from "@/components/roster/roster-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  battleBadgeLabel,
  battleBadgeVariant,
  battleEndedCaption,
  hasBattleSnapshot,
} from "@/lib/battle-display";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { useRoster } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

export function RosterClient({
  data: initialData,
  embedded = false,
}: {
  data: RosterResponse;
  embedded?: boolean;
}) {
  const { data: liveData, isRefetching, refetch, dataUpdatedAt } = useRoster({
    initialData,
  });
  const data = liveData ?? initialData;

  const dialogs = useAnalyticsDialogs();
  const [player, setPlayer] = useQueryState("player", parseAsString);
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("battlePoints"),
  );
  const [order, setOrder] = useQueryState(
    "order",
    parseAsString.withDefault("desc"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  const sortKey = normalizeRosterSortKey(sort);
  const sortOrder: RosterSortOrder = order === "asc" ? "asc" : "desc";

  const battle = data.battle;
  const live = Boolean(battle?.live);
  const hasBattle = hasBattleSnapshot(battle);
  const endedCaption = battleEndedCaption(battle);
  const members = data.members;
  const memberCount = battle?.memberCount ?? members.length;
  const generatedAt = dataUpdatedAt || data.generatedAt;

  function handleSort(key: RosterSortKey) {
    if (key === sortKey) {
      void setOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    void setSort(key);
    void setOrder(
      key === "displayName" || key === "rank" || key === "avgPlacement"
        ? "asc"
        : "desc",
    );
  }

  function handleSortSelect(key: RosterSortKey) {
    void setSort(key);
    void setOrder(
      key === "displayName" || key === "rank" || key === "avgPlacement"
        ? "asc"
        : "desc",
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? members.filter((m) => m.displayName.toLowerCase().includes(q))
      : members;
    return sortMembers(list, sortKey, sortOrder);
  }, [members, search, sortKey, sortOrder]);

  const activeMember = useMemo(() => {
    if (!player) return null;
    const needle = player.toLowerCase();
    return (
      members.find((m) => m.displayName.toLowerCase() === needle) ??
      members.find((m) => m.displayName.toLowerCase().includes(needle)) ??
      null
    );
  }, [members, player]);

  useEffect(() => {
    if (player && !activeMember) void setPlayer(null);
  }, [player, activeMember, setPlayer]);

  function openMember(name: string) {
    void setPlayer(name);
  }

  function closeMember(open: boolean) {
    if (!open) void setPlayer(null);
  }

  return (
    <div className={embedded ? "pond-stack" : "pond-page"}>
      <article
        className={cn(
          "pond-card relative p-5 sm:p-6",
          "animate-fade-rise",
          live
            ? "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_16%,var(--card-surface)),var(--card-surface)_64%)] ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_28%,transparent)]"
            : "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_68%)] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div
            className={cn(
              "absolute -right-10 -top-12 size-44 rounded-full blur-2xl",
              live
                ? "bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_38%,transparent),transparent_70%)]"
                : "bg-[radial-gradient(circle,color-mix(in_srgb,var(--pond-teal)_36%,transparent),transparent_70%)]",
            )}
          />
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            {embedded ? null : (
              <>
                <Heading as="h1">
                  Clan <span className="text-koi">Roster</span>
                </Heading>
                <p className="pond-lede max-w-xl">
                  {live
                    ? `Live battle for ${data.clanName}. Neighbors, countdown, and member stats.`
                    : hasBattle
                      ? `Last war snapshot for ${data.clanName}. Stats hold until the next battle.`
                      : `War tracker for ${data.clanName}. Waiting for the next battle.`}
                </p>
              </>
            )}
            {embedded ? (
              <div className="space-y-1">
                <Heading as="h2" className="text-2xl sm:text-3xl">
                  {data.clanName}
                </Heading>
                <p className="text-sm text-ink-soft">
                  {live
                    ? "Members, nearby clans, and live pace."
                    : hasBattle
                      ? "Snapshot board from the last war."
                      : "Waiting for the next battle snapshot."}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={battleBadgeVariant(battle)}>
                {battleBadgeLabel(battle)}
              </Badge>
              {endedCaption ? (
                <Badge variant="secondary">{endedCaption}</Badge>
              ) : null}
              <Badge variant="info">{formatNumber(memberCount)} members</Badge>
              <Badge variant="secondary">
                Updated {formatRelativeTime(generatedAt)}
                {isRefetching ? " · syncing" : ""}
              </Badge>
              {battle?.lastBattleRank != null ? (
                <Badge variant="secondary">
                  Last battle #{battle.lastBattleRank}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            {hasBattle ? (
              <div className="text-left sm:text-right">
                <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                  {live ? "Battle ends in" : "Battle status"}
                </p>
                {live ? (
                  <BattleCountdown
                    msRemaining={battle.msRemaining}
                    generatedAt={data.generatedAt}
                    className="min-w-[9ch] text-3xl sm:text-4xl"
                  />
                ) : (
                  <p className="font-display text-3xl font-bold text-ink-soft tabular-nums sm:text-4xl">
                    Ended
                  </p>
                )}
              </div>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              className="self-start sm:self-end"
              onClick={() => void refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={isRefetching ? "animate-spin" : undefined} />
              Reload
            </Button>
          </div>
        </div>
      </article>

      {hasBattle ? (
        <PanelErrorBoundary title="Battle stats failed">
          <BattleStatStrip
            battle={battle}
            members={members}
            onOpenMember={openMember}
            onOpenRank={dialogs.openRank}
            onOpenForecast={dialogs.openForecast}
            onOpenEfficiency={dialogs.openEfficiency}
            onOpenGini={dialogs.openGini}
          />
        </PanelErrorBoundary>
      ) : (
        <div className="pond-card pond-pad">
          <Heading as="h2">Between wars</Heading>
          <p className="mt-2 text-sm text-ink-soft">
            No battle snapshot in the database yet. Once a war runs, final stats
            stay here after it ends.
          </p>
        </div>
      )}

      <section className="pond-section animate-fade-rise" style={{ animationDelay: "40ms" }}>
        <div className="pond-section-head">
          <Heading as="h2">Nearby clans</Heading>
          <p className="text-sm text-ink-soft">
            {live
              ? "Who we're chasing, and who's chasing us."
              : hasBattle
                ? "Where we sat relative to nearby clans."
                : "Neighbor cards appear once a battle has data."}
          </p>
        </div>
        <PanelErrorBoundary title="Neighbor cards failed">
          <ClanComparison
            clanName={data.clanName}
            battle={battle}
            aboveClans={data.comparison.aboveClans}
            belowClans={data.comparison.belowClans}
            live={live}
            onSelectEnemy={dialogs.openEnemy}
          />
        </PanelErrorBoundary>
      </section>

      {live ? (
        <PanelErrorBoundary title="Projection failed">
          <BattleProjectionPanel data={data} />
        </PanelErrorBoundary>
      ) : null}

      <section className="pond-section animate-fade-rise" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="pond-section-head">
            <Heading as="h2">Members</Heading>
            <p className="text-sm text-ink-soft">
              {search.trim()
                ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
                : `${filtered.length} players`}
            </p>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search players</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value || null)}
              placeholder="Search players"
              className="h-11 pl-9"
            />
          </label>
        </div>

        <PanelErrorBoundary title="Member list failed">
          {filtered.length > 0 ? (
            <RosterTable
              members={filtered}
              battleLive={hasBattle}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={handleSort}
              onSortSelect={handleSortSelect}
              onSelectMember={(member) => openMember(member.displayName)}
            />
          ) : (
            <div className="pond-card px-6 py-12 text-center">
              <p className="font-display text-base font-semibold text-ink">
                {members.length === 0 ? "Waiting on poll" : "No matches"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {members.length === 0
                  ? "First poll tick will fill this board."
                  : "Clear search or try another name."}
              </p>
            </div>
          )}
        </PanelErrorBoundary>
      </section>

      <MemberDialog
        member={activeMember}
        members={members}
        clanTotalPoints={battle?.points}
        open={Boolean(activeMember)}
        onOpenChange={closeMember}
      />

      <AnalyticsDialogs
        data={data}
        kind={dialogs.kind}
        enemy={dialogs.enemy}
        onClose={dialogs.close}
      />
    </div>
  );
}
