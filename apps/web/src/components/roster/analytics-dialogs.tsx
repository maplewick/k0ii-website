"use client";

import type { BattleSummary, ClanNeighbor, RosterMember, RosterResponse } from "@k0ii/schemas";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dialogContentClass } from "@/components/roster/dialog-bits";
import { analyze, collectClans, computeGiniStats } from "@/lib/analytics";
import { formatDuration, formatNumber, formatPoints, formatPph, formatSignedDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

type DialogKind = "forecast" | "rank" | "gini" | "efficiency" | "enemy" | null;

export function useAnalyticsDialogs() {
  const [kind, setKind] = useState<DialogKind>(null);
  const [enemy, setEnemy] = useState<ClanNeighbor | null>(null);

  return {
    kind,
    enemy,
    openForecast: () => setKind("forecast"),
    openRank: () => setKind("rank"),
    openGini: () => setKind("gini"),
    openEfficiency: () => setKind("efficiency"),
    openEnemy: (clan: ClanNeighbor) => {
      setEnemy(clan);
      setKind("enemy");
    },
    close: () => {
      setKind(null);
      setEnemy(null);
    },
  };
}

export function AnalyticsDialogs({
  data,
  kind,
  enemy,
  onClose,
}: {
  data: RosterResponse;
  kind: DialogKind;
  enemy: ClanNeighbor | null;
  onClose: () => void;
}) {
  const open = kind !== null;
  const battle = data.battle;
  const gini = useMemo(
    () =>
      computeGiniStats(
        data.members.map((m) => ({
          roblox_username: m.displayName,
          currentPoints: m.battlePoints,
        })),
      ),
    [data.members],
  );

  const projection = useMemo(() => {
    if (!battle?.live || !battle.msRemaining || battle.msRemaining <= 0) return null;
    try {
      return analyze(collectClans(data), data.clanName, battle.msRemaining);
    } catch {
      return null;
    }
  }, [battle, data]);

  const memberPphSum = useMemo(
    () =>
      data.members.reduce((sum, m) => sum + (Number.isFinite(m.pph) ? Number(m.pph) : 0), 0),
    [data.members],
  );
  const efficiency =
    battle?.pph != null && memberPphSum > 0 ? (battle.pph / memberPphSum) * 100 : null;

  const title =
    kind === "forecast"
      ? "Projected finish"
      : kind === "rank"
        ? "Clan rank history"
        : kind === "gini"
          ? "Contribution inequality"
          : kind === "efficiency"
            ? "Clan efficiency"
            : kind === "enemy"
              ? `${enemy?.name ?? "Enemy"} vs ${data.clanName}`
              : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(dialogContentClass, "sm:max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {kind === "forecast"
              ? "Projected rank from recent PPH. Gets sharper near the end."
              : kind === "rank"
                ? "Rank over this battle from poll snapshots."
                : kind === "gini"
                  ? "How evenly battle points are shared across the roster."
                  : kind === "efficiency"
                    ? "Actual clan PPH vs sum of member PPH."
                    : "Rival pace and gap vs us."}
          </DialogDescription>
        </DialogHeader>

        {kind === "forecast" ? (
          <div className="space-y-4">
            {projection ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Projected finish" value={`#${projection.projectedRank}`} />
                  <Metric
                    label="Expected rank"
                    value={projection.standings[data.clanName]?.expectedRank?.toFixed(1) ?? "-"}
                  />
                  <Metric
                    label="To catch"
                    value={
                      projection.target
                        ? `${projection.target.name} (${formatPoints(projection.target.deficit)})`
                        : "-"
                    }
                  />
                </div>
                <Link
                  href="/roster?view=race"
                  className="inline-flex font-display text-sm font-semibold text-koi hover:text-koi-deep"
                >
                  Open Race Mode →
                </Link>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Projection available during a live battle.</p>
            )}
          </div>
        ) : null}

        {kind === "rank" ? (
          <div className="space-y-3">
            <Metric label="Current rank" value={battle?.rank != null ? `#${battle.rank}` : "-"} />
            <Metric
              label="Last battle rank"
              value={battle?.lastBattleRank != null ? `#${battle.lastBattleRank}` : "-"}
            />
            <RankSpark series={battle?.rankSeries ?? []} />
          </div>
        ) : null}

        {kind === "gini" ? (
          gini ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Gini" value={gini.gini.toFixed(3)} />
              <Metric label="Entropy (H)" value={gini.normalizedEntropy.toFixed(2)} />
              <Metric
                label="Top 20% share"
                value={`${(gini.top20Share * 100).toFixed(1)}%`}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Not enough contributor data.</p>
          )
        ) : null}

        {kind === "efficiency" ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Clan PPH" value={formatPph(battle?.pph ?? null)} />
            <Metric label="Member PPH sum" value={formatPph(memberPphSum)} />
            <Metric
              label="Efficiency"
              value={efficiency != null ? `${efficiency.toFixed(1)}%` : "-"}
            />
            <Metric label="Contributors" value={formatNumber(battle?.contributorCount)} />
          </div>
        ) : null}

        {kind === "enemy" && enemy ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Their points" value={formatPoints(enemy.points)} />
            <Metric label="Their PPH" value={formatPph(enemy.pph)} />
            <Metric label="Gap" value={formatPoints(enemy.pointsNeeded)} />
            <Metric
              label="ETA"
              value={
                enemy.etaSeconds != null ? formatDuration(enemy.etaSeconds * 1000) : "-"
              }
            />
            <Metric label="5m" value={formatSignedDelta(enemy.delta5m)} />
            <Metric label="Active (5m)" value={formatNumber(enemy.activeMembers)} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-input)] bg-card-surface-alt px-3 py-2.5">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 font-tabular text-lg font-bold text-koi">{value}</p>
    </div>
  );
}

function RankSpark({ series }: { series: Array<{ timestamp: number; value: number }> }) {
  if (series.length < 2) {
    return <p className="text-sm text-ink-soft">Not enough rank samples yet.</p>;
  }
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const w = 320;
  const h = 80;
  const points = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((p.value - min) / span) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-[var(--radius-input)] bg-card-surface-alt p-2">
      <polyline fill="none" stroke="var(--koi-orange)" strokeWidth="2" points={points} />
    </svg>
  );
}

export function BattleProjectionPanel({
  data,
}: {
  data: RosterResponse;
}) {
  const battle = data.battle;
  const projection = useMemo(() => {
    if (!battle?.live || !battle.msRemaining || battle.msRemaining <= 0) return null;
    try {
      return analyze(collectClans(data), data.clanName, battle.msRemaining);
    } catch {
      return null;
    }
  }, [battle, data]);

  if (!battle?.live) return null;

  return (
    <section className="pond-card pond-pad space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Projected finish</h2>
          <p className="text-sm text-ink-soft">
            Projected rank from recent PPH. Gets sharper near the end.
          </p>
        </div>
        <Link
          href="/roster?view=race"
          className="font-display text-sm font-semibold text-koi hover:text-koi-deep"
        >
          Race Mode →
        </Link>
      </div>
      {projection ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Projected finish" value={`#${projection.projectedRank}`} />
          <Metric
            label="Catch-up target"
            value={projection.target?.name ?? "-"}
          />
          <Metric
            label="Deficit"
            value={
              projection.target ? formatPoints(projection.target.deficit) : "-"
            }
          />
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Waiting for enough pace samples.</p>
      )}
    </section>
  );
}

export type { DialogKind, BattleSummary, RosterMember };
