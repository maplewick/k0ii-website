import type { BattleSummary, ClanNeighbor } from "@k0ii/schemas";

import {
  formatActiveRoster,
  formatNeighborPph,
  formatNumber,
  formatPassEta,
  formatPoints,
  formatSignedDelta,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { cn } from "@/lib/utils";

function clanInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function Signed5m({
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

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-ink-soft">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate font-tabular text-sm font-semibold text-ink",
          className,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ClanLogo({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-5" : "size-8";
  const safe = httpsOnlyUrl(url);
  if (safe) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safe}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn(dim, "shrink-0 rounded-full object-cover")}
      />
    );
  }
  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-display text-[10px] font-bold text-ink",
      )}
      aria-hidden
    >
      {clanInitials(name)}
    </div>
  );
}

function CompactNeighborRow({ clan }: { clan: ClanNeighbor }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-[var(--radius-input)] bg-card-surface-alt px-2.5 py-1.5 text-left">
      <span className="w-7 shrink-0 font-tabular text-xs text-ink-soft">
        #{formatNumber(clan.rank)}
      </span>
      <ClanLogo url={clan.iconUrl} name={clan.name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
        {clan.name}
      </span>
      <Signed5m value={clan.delta5m} className="shrink-0 text-xs" />
      <span className="shrink-0 font-tabular text-xs text-ink-soft">
        {formatActiveRoster(clan.activeMembers, clan.activeRosterSize)}
      </span>
      <strong className="shrink-0 font-tabular text-xs text-ink-soft">
        {formatNeighborPph(clan.pph)}
      </strong>
    </div>
  );
}

function NeighborRows({ clans, our5m }: { clans: ClanNeighbor[]; our5m: number | null }) {
  if (clans.length === 0) return null;

  return (
    <div className="mt-auto space-y-1.5 border-t border-border/60 pt-3">
      {clans.map((clan, i) => {
        const their5m = clan.delta5m;
        const vsUs = our5m != null && their5m != null ? our5m - their5m : null;
        return (
          <div
            key={`${clan.name}-${clan.rank ?? i}`}
            className="flex w-full items-center gap-2 rounded-[var(--radius-input)] bg-card-surface-alt px-2.5 py-1.5"
          >
            <span className="w-7 shrink-0 font-tabular text-xs text-ink-soft">
              #{formatNumber(clan.rank)}
            </span>
            <ClanLogo url={clan.iconUrl} name={clan.name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
              {clan.name}
            </span>
            <Signed5m value={vsUs ?? their5m} className="shrink-0 text-xs" />
            <span className="shrink-0 font-tabular text-xs text-ink-soft">
              {formatActiveRoster(clan.activeMembers, clan.activeRosterSize)}
            </span>
            <strong className="shrink-0 font-tabular text-xs text-ink-soft">
              {formatNeighborPph(clan.pph)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function RivalCard({
  kicker,
  clan,
  emptyLabel,
  our5m,
  neighbors,
  live,
  onSelect,
}: {
  kicker: string;
  clan: ClanNeighbor | null | undefined;
  emptyLabel: string;
  our5m: number | null;
  neighbors: ClanNeighbor[];
  live: boolean;
  onSelect?: (clan: ClanNeighbor) => void;
}) {
  const hasClan = Boolean(clan);
  const name = hasClan ? clan!.name : emptyLabel;
  const relative = Number(clan?.relativePPH ?? 0);
  const catchingUp = live && hasClan && relative > 0;
  const their5m = hasClan ? clan!.delta5m : null;
  const vsUs =
    hasClan && our5m != null && their5m != null ? our5m - their5m : null;

  return (
    <div
      className={cn(
        "pond-card flex h-full flex-col gap-3 p-5",
        catchingUp && "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_50%,transparent)]",
        !live && hasClan && "opacity-[0.92] saturate-[0.92]",
      )}
    >
      <button
        type="button"
        disabled={!hasClan || !onSelect}
        onClick={() => hasClan && onSelect?.(clan!)}
        className={cn(
          "w-full text-left",
          hasClan && onSelect && "cursor-pointer rounded-[var(--radius-input)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClanLogo url={hasClan ? clan!.iconUrl : null} name={name} />
            <span className="font-display text-sm font-semibold text-koi">{kicker}</span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-tabular text-xs font-semibold",
              catchingUp
                ? "bg-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)] text-ink"
                : "bg-card-surface-alt text-ink-soft",
            )}
          >
            {hasClan && clan!.rank != null ? `#${formatNumber(clan!.rank)}` : "-"}
          </span>
        </div>

        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">{name}</h2>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Metric label="Points" value={hasClan ? formatPoints(clan!.points) : "-"} />
          <Metric
            label="PPH"
            value={hasClan ? formatNeighborPph(clan!.pph) : "-"}
          />
          <Metric
            label="Gap"
            value={hasClan ? formatPoints(clan!.pointsNeeded) : "-"}
          />
          <Metric
            label="ETA"
            value={
              !live && hasClan
                ? "Battle Ended"
                : hasClan
                  ? formatPassEta(clan!.etaSeconds)
                  : "-"
            }
            className={
              live && hasClan && (clan!.etaSeconds == null || clan!.etaSeconds <= 0)
                ? "text-xs leading-snug text-ink-soft"
                : !live && hasClan
                  ? "text-xs leading-snug text-ink-soft"
                  : undefined
            }
          />
          <Metric
            label="5m"
            value={hasClan ? formatSignedDelta(their5m) : "-"}
            className={
              their5m != null && their5m > 0
                ? "text-lily"
                : their5m != null && their5m < 0
                  ? "text-alert"
                  : undefined
            }
          />
          <Metric
            label="5m vs us"
            value={hasClan ? formatSignedDelta(vsUs) : "-"}
            className={
              vsUs != null && vsUs > 0
                ? "text-lily"
                : vsUs != null && vsUs < 0
                  ? "text-alert"
                  : undefined
            }
          />
          <Metric
            label="Active"
            value={
              hasClan
                ? formatActiveRoster(clan!.activeMembers, clan!.activeRosterSize)
                : "-"
            }
          />
        </div>
      </button>

      {hasClan && neighbors.length > 0 ? (
        <NeighborRows clans={neighbors} our5m={our5m} />
      ) : null}
    </div>
  );
}

function CurrentCard({
  clanName,
  battle,
  our5m,
}: {
  clanName: string;
  battle: BattleSummary | null | undefined;
  our5m: number | null;
}) {
  const hasBattle = battle != null;
  const ended = hasBattle && !battle.live;
  const ppd =
    battle?.pph != null && Number.isFinite(battle.pph) ? battle.pph * 24 : null;

  return (
    <div
      className={cn(
        "pond-card flex h-full flex-col gap-3 p-5 ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_42%,transparent)] shadow-[0_10px_28px_color-mix(in_srgb,var(--koi-orange)_14%,transparent)]",
        ended && "opacity-[0.92] saturate-[0.92]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ClanLogo url={battle?.iconUrl} name={clanName} />
          <span className="font-display text-sm font-semibold text-koi">Current</span>
        </div>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] px-2.5 py-1 font-tabular text-xs font-semibold text-ink">
          {hasBattle && battle.rank != null ? `#${formatNumber(battle.rank)}` : "-"}
        </span>
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{clanName}</h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label="Points" value={hasBattle ? formatPoints(battle.points) : "-"} />
        <Metric label="PPH" value={hasBattle ? formatNeighborPph(battle.pph) : "-"} />
        <Metric label="PPD" value={hasBattle ? formatPoints(ppd) : "-"} />
        <Metric
          label="Members"
          value={hasBattle ? formatNumber(battle.memberCount) : "-"}
        />
        <Metric
          label="5m"
          value={hasBattle ? formatSignedDelta(our5m) : "-"}
          className={
            our5m != null && our5m > 0
              ? "text-lily"
              : our5m != null && our5m < 0
                ? "text-alert"
                : undefined
          }
        />
      </div>
    </div>
  );
}

export function ClanComparison({
  clanName,
  battle,
  aboveClans,
  belowClans,
  live,
  onSelectEnemy,
}: {
  clanName: string;
  battle: BattleSummary | null | undefined;
  aboveClans: ClanNeighbor[];
  belowClans: ClanNeighbor[];
  live: boolean;
  onSelectEnemy?: (clan: ClanNeighbor) => void;
}) {
  if (!battle && aboveClans.length === 0 && belowClans.length === 0) {
    return null;
  }

  const above = aboveClans.length > 0 ? aboveClans[aboveClans.length - 1] : null;
  const below = belowClans.length > 0 ? belowClans[0] : null;
  const aboveNeighbors = aboveClans.slice(0, -1);
  const belowNeighbors = belowClans.slice(1);
  const our5m = battle?.delta5m ?? null;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div className="order-2 lg:order-1">
        <RivalCard
          kicker="Above"
          clan={above}
          emptyLabel="No clan above"
          our5m={our5m}
          neighbors={aboveNeighbors}
          live={live}
          onSelect={onSelectEnemy}
        />
      </div>
      <div className="order-1 md:col-span-2 lg:order-2 lg:col-span-1">
        <CurrentCard clanName={clanName} battle={battle} our5m={our5m} />
      </div>
      <div className="order-3">
        <RivalCard
          kicker="Below"
          clan={below}
          emptyLabel="No clan below"
          our5m={our5m}
          neighbors={belowNeighbors}
          live={live}
          onSelect={onSelectEnemy}
        />
      </div>
      {!live && (aboveClans.length > 0 || belowClans.length > 0) ? (
        <div className="order-4 space-y-2 md:col-span-2 lg:col-span-3">
          {[...aboveClans, ...belowClans].map((clan) =>
            clan.compact ? (
              <CompactNeighborRow key={`${clan.name}-${clan.rank}`} clan={clan} />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
