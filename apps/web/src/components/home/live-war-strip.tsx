"use client";

import Link from "next/link";
import { ChevronRight, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RosterResponse } from "@k0ii/schemas";
import {
  battleBadgeLabel,
  battleBadgeVariant,
  battleEndedCaption,
  hasBattleSnapshot,
} from "@/lib/battle-display";
import {
  formatNumber,
  formatPoints,
  formatPph,
  formatRelativeTime,
  formatSignedDelta,
} from "@/lib/format";
import { useBattleRemaining } from "@/lib/use-battle-remaining";
import { cn } from "@/lib/utils";

function formatBattleLeft(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "Ended";
  const totalH = Math.floor(ms / 3_600_000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  const m = Math.max(1, Math.round((ms % 3_600_000) / 60_000));
  if (d > 0) return `${d}d ${h}h left`;
  if (totalH > 0) return `${totalH}h left`;
  return `${m}m left`;
}

type Cell = {
  label: string;
  value: string;
  primary?: boolean;
  tone?: number | null;
};

function MetricCell({ cell }: { cell: Cell }) {
  const toneClass =
    typeof cell.tone === "number"
      ? cell.tone > 0
        ? "text-lily"
        : cell.tone < 0
          ? "text-alert"
          : "text-koi"
      : cell.primary
        ? "text-koi"
        : "text-ink";

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <dt className="pond-label">{cell.label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-display font-bold tabular-nums tracking-tight",
          cell.primary ? "text-2xl sm:text-[1.75rem]" : "text-xl sm:text-2xl",
          toneClass,
        )}
      >
        {cell.value}
      </dd>
    </div>
  );
}

export function LiveWarStrip({
  data,
  error,
}: {
  data: RosterResponse | null;
  error: string | null;
}) {
  const battle = data?.battle;
  const remaining = useBattleRemaining(
    battle?.live ? battle.msRemaining : null,
    data?.generatedAt ?? 0,
  );

  if (error || !data) {
    return (
      <div className="pond-card px-6 py-8 text-center sm:px-8">
        <p className="font-display text-lg font-semibold text-ink">Live stats offline</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          Start the API and poll job, then reload.
        </p>
        <Link
          href="/roster"
          className="mt-4 inline-flex items-center gap-1 font-display text-sm font-semibold text-koi transition-[color,transform] duration-200 ease-[var(--ease-out)] hover:text-koi-deep active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Jump to live battle
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const live = Boolean(battle?.live);
  const hasBattle = hasBattleSnapshot(battle);
  const endedCaption = battleEndedCaption(battle);

  const cells: Cell[] = hasBattle
    ? [
        {
          label: "Rank",
          value: battle.rank != null ? `#${formatNumber(battle.rank)}` : "—",
          primary: true,
        },
        {
          label: "Points",
          value: formatPoints(battle.points),
          primary: true,
        },
        { label: "PPH", value: formatPph(battle.pph) },
        {
          label: "5m Pace",
          value: formatSignedDelta(battle.delta5m),
          tone: battle.delta5m,
        },
        {
          label: "Members",
          value: formatNumber(battle.memberCount ?? data.members.length),
        },
      ]
    : [];

  return (
    <div
      className={cn(
        "pond-card overflow-hidden",
        "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-surface)_94%,var(--pond-teal)),var(--card-surface))]",
        live &&
          "ring-1 ring-[color-mix(in_srgb,var(--lily-green)_28%,transparent)]",
        hasBattle && !live && "opacity-[0.94]",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]",
          "px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4",
          live && "bg-[color-mix(in_srgb,var(--lily-green)_6%,transparent)]",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="font-display text-base font-semibold tracking-tight text-ink sm:text-lg">
            {data.clanName}
          </span>
          <Badge variant={battleBadgeVariant(battle)} className="gap-1.5">
            {live ? (
              <span className="size-1.5 rounded-full bg-lily motion-safe:animate-pulse" aria-hidden />
            ) : null}
            {battleBadgeLabel(battle)}
          </Badge>
          {endedCaption ? (
            <span className="text-xs font-medium text-ink-soft">{endedCaption}</span>
          ) : null}
          {live && remaining != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card-surface-alt/80 px-2.5 py-1 text-xs font-medium text-ink-soft">
              <Timer className="size-3.5 text-pond-teal" aria-hidden />
              {formatBattleLeft(remaining)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-ink-soft">
            Updated {formatRelativeTime(data.generatedAt)}
          </span>
          <Link
            href="/roster"
            className="inline-flex items-center gap-0.5 font-display text-sm font-semibold text-koi transition-[color,transform] duration-200 ease-[var(--ease-out)] hover:text-koi-deep active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Jump to live battle
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {hasBattle ? (
        <dl className="grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          {cells.map((cell) => (
            <MetricCell key={cell.label} cell={cell} />
          ))}
        </dl>
      ) : (
        <div className="px-5 py-6 sm:px-6">
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            No active battle snapshot yet. Roster still shows the last known members.
          </p>
        </div>
      )}
    </div>
  );
}
