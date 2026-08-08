import type { BattleSummary, RosterMember } from "@k0ii/schemas";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatDuration,
  formatNumber,
  formatPoints,
  formatPph,
  formatSignedDelta,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { cn } from "@/lib/utils";

function StatLabel({
  children,
  clickable,
}: {
  children: ReactNode;
  clickable?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-ink-soft">
      <span>{children}</span>
      {clickable ? <ArrowUpRight className="size-3 opacity-70" aria-hidden /> : null}
    </div>
  );
}

function StatCell({
  children,
  className,
  title,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const Comp = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      title={title}
      onClick={onClick}
      className={cn(
        "flex min-h-[4.75rem] flex-col justify-between gap-2 p-3.5 text-left sm:p-4",
        interactive &&
          "cursor-pointer transition-transform duration-150 ease-[var(--ease-out)] hover:bg-card-surface-alt/60 active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

function findMvp24h(members: RosterMember[]): { member: RosterMember; delta: number } | null {
  const ranked = members
    .map((member) => ({
      member,
      delta: Number(member.delta24h ?? member.delta12h),
    }))
    .filter((entry) => Number.isFinite(entry.delta) && entry.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  return ranked[0] ?? null;
}

function kickRemaining(endsAt: number | null | undefined): string {
  if (endsAt == null) return "-";
  const left = endsAt - Date.now();
  if (left <= 0) return "Ready";
  return formatDuration(left);
}

export function BattleStatStrip({
  battle,
  members = [],
  onOpenMember,
  onOpenRank,
  onOpenForecast,
  onOpenEfficiency,
  onOpenGini,
}: {
  battle: BattleSummary;
  members?: RosterMember[];
  onOpenMember?: (name: string) => void;
  onOpenRank?: () => void;
  onOpenForecast?: () => void;
  onOpenEfficiency?: () => void;
  onOpenGini?: () => void;
}) {
  const ended = !battle.live;
  const mvp = findMvp24h(members);
  const mvpAvatar = mvp ? httpsOnlyUrl(mvp.member.avatarUrl) : null;
  const pace5m = battle.delta5m;
  const paceTone =
    pace5m != null && pace5m > 0
      ? "text-lily"
      : pace5m != null && pace5m < 0
        ? "text-alert"
        : "text-koi";

  return (
    <div
      className={cn(
        "pond-card relative overflow-hidden",
        "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_20%,transparent)]",
        ended && "opacity-[0.92] saturate-[0.92]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--pond-teal)_10%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] lg:grid-cols-4 xl:grid-cols-8 xl:divide-y-0">
        <StatCell title="Clan rank" onClick={onOpenRank}>
          <StatLabel clickable={Boolean(onOpenRank)}>Rank</StatLabel>
          <p className="font-tabular text-2xl font-bold text-koi">
            {battle.rank != null ? `#${formatNumber(battle.rank)}` : "-"}
          </p>
        </StatCell>

        <StatCell title="Battle points" onClick={onOpenForecast}>
          <StatLabel clickable={Boolean(onOpenForecast)}>Points</StatLabel>
          <p className="font-tabular text-2xl font-bold text-koi">
            {formatPoints(battle.points)}
          </p>
        </StatCell>

        <StatCell title="Gap to clan above us">
          <StatLabel>Gap to Above</StatLabel>
          <p className="font-tabular text-2xl font-bold text-koi">
            {formatPoints(battle.gapToAbove ?? null)}
          </p>
        </StatCell>

        <StatCell title="Points gained in the last ~5 minutes">
          <StatLabel>5m</StatLabel>
          <p className={cn("font-tabular text-2xl font-bold", paceTone)}>
            {formatSignedDelta(pace5m)}
          </p>
        </StatCell>

        <StatCell title="Points per hour" onClick={onOpenEfficiency}>
          <StatLabel clickable={Boolean(onOpenEfficiency)}>PPH</StatLabel>
          <p className="font-tabular text-2xl font-bold text-koi">
            {formatPph(battle.pph)}
          </p>
        </StatCell>

        <StatCell title="Kick cooldown remaining">
          <StatLabel>Kick Cooldown</StatLabel>
          <p className="font-tabular text-xl font-bold text-koi sm:text-2xl">
            {kickRemaining(battle.kickCooldownEndsAt)}
          </p>
        </StatCell>

        <StatCell title="Contributors this battle" onClick={onOpenGini}>
          <StatLabel clickable={Boolean(onOpenGini)}>Contributors</StatLabel>
          <p className="font-tabular text-2xl font-bold text-koi">
            {formatNumber(battle.contributorCount ?? members.length)}
          </p>
        </StatCell>

        <StatCell title="Highest point gain in the last 24 hours">
          <StatLabel clickable={Boolean(mvp && onOpenMember)}>24H MVP</StatLabel>
          {mvp ? (
            <button
              type="button"
              className={cn(
                "flex w-full items-end justify-between gap-2 text-left",
                onOpenMember &&
                  "cursor-pointer rounded-[var(--radius-input)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
              )}
              onClick={
                onOpenMember
                  ? () => onOpenMember(mvp.member.displayName)
                  : undefined
              }
              disabled={!onOpenMember}
            >
              <div className="min-w-0">
                <p className="font-tabular text-2xl font-bold text-koi">
                  {formatSignedDelta(mvp.delta)}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {mvp.member.displayName}
                </p>
              </div>
              {mvpAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mvpAvatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-8 shrink-0 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]"
                />
              ) : (
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-surface-alt font-display text-xs font-bold text-koi ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]"
                  aria-hidden
                >
                  {mvp.member.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <p className="font-tabular text-2xl font-bold text-ink-soft">-</p>
          )}
        </StatCell>
      </div>
    </div>
  );
}
