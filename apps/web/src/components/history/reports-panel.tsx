"use client";

import { useEffect, useMemo } from "react";

import {
  BattlePicker,
  battleLabel,
} from "@/components/history/battle-picker";
import { HubEmpty, HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { MetricTile } from "@/components/roster/dialog-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration, formatNumber, formatPoints } from "@/lib/format";
import { useBattleArchive, useBattleDetail } from "@/lib/hooks/use-api";
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

export function ReportsPanel({
  battleId,
  onBattleIdChange,
}: {
  battleId: string | null;
  onBattleIdChange: (id: string) => void;
}) {
  const { data: archive, isLoading, error, refetch } = useBattleArchive();
  const battles = useMemo(() => {
    const list = [...(archive?.battles ?? [])];
    list.sort(
      (a, b) =>
        (b.finalizedAt ?? b.endedAt ?? 0) - (a.finalizedAt ?? a.endedAt ?? 0),
    );
    return list;
  }, [archive?.battles]);

  const defaultBattleId = battles[0]?.battleId ?? null;
  const effectiveId = battleId ?? defaultBattleId;
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useBattleDetail(effectiveId);

  useEffect(() => {
    if (!battleId && defaultBattleId) {
      onBattleIdChange(defaultBattleId);
    }
  }, [battleId, defaultBattleId, onBattleIdChange]);

  const selectedMeta = useMemo(
    () => battles.find((b) => b.battleId === effectiveId) ?? null,
    [battles, effectiveId],
  );

  const members = detail?.members ?? [];
  const durationMs =
    detail?.startedAt != null && detail?.endedAt != null
      ? detail.endedAt - detail.startedAt
      : selectedMeta?.startedAt != null && selectedMeta?.endedAt != null
        ? selectedMeta.endedAt - selectedMeta.startedAt
        : null;

  const displayName = selectedMeta
    ? battleLabel(selectedMeta)
    : detail?.title?.trim() ||
      (effectiveId ? effectiveId : "Select a battle");

  if (isLoading && !archive) {
    return <HubSkeleton className="h-64" />;
  }

  if (error) {
    return (
      <div className="pond-card flex flex-col items-start gap-3 pond-pad">
        <Heading as="h2" className="text-2xl">
          Reports
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

  if (!battles.length) {
    return (
      <HubEmpty
        title="No archived battles"
        detail="When wars finalize, standings and contributors land here."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start">
      <BattlePicker
        battles={battles}
        selectedId={effectiveId}
        onSelect={onBattleIdChange}
        loading={isLoading}
      />

      <div className="animate-fade-rise pond-stack" style={{ animationDelay: "40ms" }}>
        <article
          className={cn(
            "pond-card relative overflow-hidden p-5 sm:p-6",
            "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_18%,var(--card-surface)),var(--card-surface)_62%)]",
            "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_28%,transparent)]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_36%,transparent),transparent_68%)] blur-2xl"
            aria-hidden
          />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {detail?.live ? <Badge variant="success">Live</Badge> : null}
                  {selectedMeta?.medal || detail?.medal ? (
                    <Badge variant="info">
                      {selectedMeta?.medal ?? detail?.medal}
                    </Badge>
                  ) : null}
                  <Heading as="h2" className="text-2xl sm:text-3xl">
                    {displayName}
                  </Heading>
                </div>
                <p className="text-sm text-ink-soft">
                  {detailLoading
                    ? "Loading contributors…"
                    : detailError
                      ? "Could not load this battle detail."
                      : members.length
                        ? `${formatNumber(members.length)} contributors ranked by points`
                        : "No member rows for this battle"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricTile
                label="Final rank"
                value={
                  (detail?.ourRank ?? selectedMeta?.ourRank) != null
                    ? `#${formatNumber(detail?.ourRank ?? selectedMeta?.ourRank)}`
                    : "-"
                }
                accent
              />
              <MetricTile
                label="Points"
                value={formatPoints(
                  detail?.ourPoints ?? selectedMeta?.ourPoints,
                )}
              />
              <MetricTile
                label="Members"
                value={formatNumber(
                  selectedMeta?.participantCount ??
                    (members.length ? members.length : null),
                )}
              />
              <MetricTile
                label="Duration"
                value={
                  durationMs != null
                    ? formatDuration(durationMs)
                    : detail?.live
                      ? "Ongoing"
                      : "-"
                }
              />
            </div>
          </div>
        </article>

        {detailLoading && !members.length ? (
          <div
            className="pond-card h-72 animate-pulse bg-card-surface-alt"
            aria-hidden
          />
        ) : detailError && !members.length ? (
          <div className="pond-card px-6 py-12 text-center">
            <p className="font-display text-base font-semibold text-ink">
              Detail unavailable
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Try another battle from the list, or reload the page.
            </p>
          </div>
        ) : (
          <>
            <div className="pond-card hidden overflow-hidden sm:block">
              <div className="max-h-[min(70vh,52rem)] overflow-auto overscroll-contain">
                <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      {(
                        [
                          { label: "#", align: "left" as const, w: "w-12" },
                          { label: "Player", align: "left" as const },
                          { label: "Points", align: "right" as const },
                          { label: "Share", align: "right" as const },
                        ] as const
                      ).map((col) => (
                        <th
                          key={col.label}
                          scope="col"
                          className={cn(
                            "sticky top-0 z-10 h-12 bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] px-3",
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
                    {members.map((m, i) => {
                      const avatar = httpsAvatar(m.avatarUrl);
                      const label = memberLabel(m.displayName, m.robloxUserId);
                      return (
                        <tr
                          key={m.robloxUserId}
                          className={cn(
                            "border-0",
                            i % 2 === 1 &&
                              "bg-[color-mix(in_srgb,var(--pond-teal)_5%,transparent)]",
                            i === 0 &&
                              "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]",
                          )}
                        >
                          <td className="px-3 py-2.5 font-tabular text-ink-soft">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2.5">
                              {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatar}
                                  alt=""
                                  width={28}
                                  height={28}
                                  className="size-7 shrink-0 rounded-full ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span
                                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card-surface-alt font-display text-[11px] font-semibold text-ink-soft ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]"
                                  aria-hidden
                                >
                                  {label.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <span className="truncate font-display font-semibold text-ink">
                                {label}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-tabular">
                            {formatPoints(m.battlePoints)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-tabular text-ink-soft">
                            {m.contributionPct != null
                              ? `${m.contributionPct.toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!members.length ? (
                <p className="px-4 py-8 text-center text-sm text-ink-soft">
                  Select a battle or wait for archive data.
                </p>
              ) : null}
            </div>

            <ul className="space-y-2 sm:hidden">
              {members.map((m, i) => {
                const avatar = httpsAvatar(m.avatarUrl);
                const label = memberLabel(m.displayName, m.robloxUserId);
                return (
                  <li
                    key={m.robloxUserId}
                    className={cn(
                      "pond-card flex items-center gap-3 p-3.5",
                      i === 0 &&
                        "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_35%,transparent)]",
                    )}
                  >
                    <span className="w-6 shrink-0 font-tabular text-sm text-ink-soft">
                      {i + 1}
                    </span>
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt=""
                        width={36}
                        height={36}
                        className="size-9 shrink-0 rounded-full ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-surface-alt font-display text-sm font-semibold text-ink-soft"
                        aria-hidden
                      >
                        {label.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold text-ink">
                        {label}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {formatPoints(m.battlePoints)}
                        {m.contributionPct != null
                          ? ` · ${m.contributionPct.toFixed(1)}%`
                          : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
              {!members.length ? (
                <li className="pond-card px-4 py-8 text-center text-sm text-ink-soft">
                  Select a battle or wait for archive data.
                </li>
              ) : null}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
