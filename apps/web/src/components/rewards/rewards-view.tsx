"use client";

/**
 * THESIS: Clan podium + fish giveaway first; PS99 placement rewards below.
 * OWN-WORLD: Pond cards, koi champion wash, Fredoka display, lily-pad prize tiles.
 * STORY: What top-3 pays, giveaway bands from prize-pool, then in-game placement rewards.
 * FIRST VIEWPORT: Title + lede; champion + runner-up payouts; giveaway bands.
 * FORM: Operate refinement of pond + join CompeteSection podium.
 */

import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { HubEmpty, HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { Button } from "@/components/ui/button";
import { useBattleRewards } from "@/lib/hooks/use-api";
import {
  clanBattleGiveawayDisplay,
  clanBattlePodiumDisplay,
} from "@/lib/prize-copy";
import { cn } from "@/lib/utils";

type PlacementItem = {
  name: string;
  quantity: number | null;
  imageUrl: string | null;
  variant: string | null;
};

type PlacementRow = {
  place: string;
  items: PlacementItem[];
};

function httpsImage(url: string | null | undefined): string | null {
  if (!url || !/^https:\/\//i.test(url)) return null;
  return url;
}

function displayDash(label: string): string {
  return label.replace(/[–—]/g, "-");
}

function PrizeLines({
  lines,
  size = "md",
}: {
  lines: readonly string[];
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg"
      ? "font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl"
      : size === "sm"
        ? "font-display text-base font-semibold text-ink"
        : "font-display text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl";

  if (lines.length <= 1) {
    return <p className={text}>{displayDash(lines[0] ?? "")}</p>;
  }

  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line} className={text}>
          {displayDash(line)}
        </li>
      ))}
    </ul>
  );
}

function placeSortKey(place: string): number {
  const n = Number.parseInt(place.replace(/[^\d].*$/, ""), 10);
  return Number.isFinite(n) ? n : 9999;
}

function isPackPlace(place: string): boolean {
  const nums = place.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
    return (nums[1]! - nums[0]!) > 10;
  }
  return false;
}

function oddsBarWidth(oddsLabel: string): string {
  const m = oddsLabel.match(/([\d.]+)\s*%/);
  if (!m) return "w-1/3";
  const pct = Number(m[1]);
  if (pct >= 8) return "w-full";
  if (pct >= 5) return "w-2/3";
  return "w-1/3";
}

function weightFromOdds(oddsLabel: string): string {
  const m = oddsLabel.match(/([\d.]+)\s*%/);
  if (!m) return "";
  const pct = Number(m[1]);
  if (pct >= 8) return "3× weight";
  if (pct >= 5) return "2× weight";
  return "1× weight";
}

function variantTone(variant: string | null | undefined) {
  if (variant === "Rainbow") {
    return "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi";
  }
  if (variant === "Golden") {
    return "bg-[color-mix(in_srgb,var(--koi-orange)_14%,var(--card-surface-alt))] text-ink";
  }
  if (variant === "Shiny") {
    return "bg-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)] text-pond-teal";
  }
  return "bg-card-surface-alt text-ink-soft";
}

function VariantChip({
  variant,
  size = "sm",
}: {
  variant: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-semibold leading-none tracking-wide",
        size === "md" ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[9px]",
        variantTone(variant),
      )}
    >
      {variant}
    </span>
  );
}

function RewardArt({
  item,
  size = "md",
}: {
  item: PlacementItem;
  size?: "sm" | "md" | "lg";
}) {
  const src = httpsImage(item.imageUrl);
  const initial = item.name.trim().slice(0, 1).toUpperCase() || "?";
  const frame =
    size === "lg" ? "size-14" : size === "sm" ? "size-9" : "size-11";
  const img = size === "lg" ? "size-11" : size === "sm" ? "size-7" : "size-9";

  return (
    <div
      className={cn(
        frame,
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-input)]",
        "bg-gradient-to-br from-card-surface-alt to-[color-mix(in_srgb,var(--pond-teal)_18%,var(--card-surface-alt))]",
        "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]",
        item.variant === "Golden" &&
          "ring-2 ring-[color-mix(in_srgb,var(--koi-orange)_70%,transparent)]",
        item.variant === "Rainbow" && "reward-art-rainbow",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn(
            img,
            "object-contain drop-shadow-sm",
            item.variant === "Rainbow" && "reward-art-rainbow-img",
          )}
        />
      ) : (
        <span className="font-display text-sm font-bold text-koi" aria-hidden>
          {initial}
        </span>
      )}
    </div>
  );
}

function FeaturedPlacement({ row }: { row: PlacementRow }) {
  const lead = row.items[0];
  if (!lead) return null;

  return (
    <article
      className={cn(
        "animate-fade-rise flex flex-col gap-3 rounded-[var(--radius-input)] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4",
        "bg-[color-mix(in_srgb,var(--koi-orange)_10%,var(--card-surface))]",
        "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_35%,transparent)]",
      )}
    >
      <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
        <RewardArt item={lead} size="lg" />
        <div className="min-w-0">
          <p className="pond-label">{displayDash(row.place)} place</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {lead.name}
              {lead.quantity != null ? ` ×${lead.quantity}` : ""}
            </p>
            {lead.variant ? <VariantChip variant={lead.variant} size="md" /> : null}
          </div>
        </div>
      </div>
      {row.items.length > 1 ? (
        <ul className="flex flex-wrap gap-2 sm:justify-end">
          {row.items.slice(1).map((item) => (
            <li
              key={`${row.place}-${item.name}`}
              className="flex items-center gap-2 rounded-full bg-card-surface-alt/80 px-2.5 py-1.5 text-xs ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]"
            >
              <RewardArt item={item} size="sm" />
              <span className="font-medium text-ink">
                {item.name}
                {item.quantity != null ? ` ×${item.quantity}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function PlaceRewardTile({
  row,
  index,
  pack,
}: {
  row: PlacementRow;
  index: number;
  pack?: boolean;
}) {
  const lead = row.items[0];
  if (!lead) return null;

  return (
    <li
      className={cn(
        "animate-fade-rise flex items-start gap-3 rounded-[var(--radius-input)] px-3 py-2.5 sm:gap-3.5 sm:px-3.5 sm:py-3",
        pack
          ? "bg-[color-mix(in_srgb,var(--pond-teal)_10%,var(--card-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]"
          : "bg-card-surface-alt/70 ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]",
        "shadow-[var(--shadow-button)]",
        "transition-[background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        !pack &&
          "hover:bg-[color-mix(in_srgb,var(--koi-orange)_8%,var(--card-surface-alt))]",
        pack &&
          "hover:bg-[color-mix(in_srgb,var(--pond-teal)_16%,var(--card-surface-alt))]",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}
    >
      <RewardArt item={lead} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-bold leading-none tracking-tight text-koi sm:text-[0.8125rem]">
          {displayDash(row.place)} place
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-ink sm:text-base">
            {lead.name}
            {lead.quantity != null ? ` ×${lead.quantity}` : ""}
          </p>
          {lead.variant ? <VariantChip variant={lead.variant} size="md" /> : null}
        </div>
        {row.items.length > 1 ? (
          <ul className="mt-2 space-y-1">
            {row.items.slice(1).map((item) => (
              <li
                key={`${row.place}-${item.name}-extra`}
                className="flex items-center gap-2 text-xs text-ink-soft"
              >
                <RewardArt item={item} size="sm" />
                <span>
                  {item.name}
                  {item.quantity != null ? ` ×${item.quantity}` : ""}
                  {item.variant ? (
                    <span className="ml-1.5 inline-block align-middle">
                      <VariantChip variant={item.variant} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function RewardsView() {
  const { data, isLoading, error, refetch, isFetching } = useBattleRewards();
  const podium = data?.podium?.length
    ? data.podium
    : clanBattlePodiumDisplay();
  const giveaway = data?.giveaway ?? clanBattleGiveawayDisplay();
  const giveawayPlaces =
    giveaway.placesLabel ??
    giveaway.tiers.map((t) => t.places).join(", ") ??
    "Giveaways";

  const { placement, packs } = useMemo(() => {
    const rows = [...(data?.placementRewards ?? [])].sort(
      (a, b) => placeSortKey(a.place) - placeSortKey(b.place),
    );
    const placementList: PlacementRow[] = [];
    const packList: PlacementRow[] = [];
    for (const row of rows) {
      if (!row.items.length) continue;
      if (isPackPlace(row.place)) packList.push(row);
      else placementList.push(row);
    }
    return { placement: placementList, packs: packList };
  }, [data?.placementRewards]);

  const champion = podium.find((p) => p.featured) ?? podium[0];
  const restPodium = podium.filter((p) => p !== champion);

  if (isLoading && !data) {
    return (
      <div className="pond-page">
        <HubSkeleton className="h-28" />
        <div className="grid gap-3 lg:grid-cols-3">
          <HubSkeleton className="h-40 lg:col-span-1" />
          <HubSkeleton className="h-40 lg:col-span-2" />
        </div>
        <HubSkeleton className="h-48" />
        <HubSkeleton className="h-56" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pond-page">
        <HubEmpty
          title="Battle rewards"
          detail="Could not load rewards. Try again in a moment."
        />
        <div className="mt-4">
          <Button size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pond-page">
      <header className="animate-fade-rise pond-section-head space-y-3">
        <Heading as="h1" className="pond-glow">
          Battle <span className="text-koi">Rewards</span>
        </Heading>
        <p className="pond-lede">
          Clan payouts for top finishes, plus in-game placement rewards from
          Pet Simulator 99.
        </p>
      </header>

      <section className="pond-section">
        <div
          className="pond-section-head animate-fade-rise max-w-xl"
          style={{ animationDelay: "40ms" }}
        >
          <Heading as="h2">Clan Payouts</Heading>
          <p className="text-base leading-relaxed text-ink-soft">
            Funded by K0ii, on top of whatever the game awards.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {champion ? (
            <article
              className={cn(
                "pond-card relative overflow-hidden p-6 sm:p-8 lg:col-span-1",
                "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_22%,var(--card-surface)),var(--card-surface)_58%)]",
                "ring-2 ring-[color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
                "shadow-[var(--shadow-card-hover)]",
                "animate-fade-rise",
              )}
              style={{ animationDelay: "70ms" }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_40%,transparent),transparent_68%)] blur-2xl"
                aria-hidden
              />
              <p className="pond-label relative">{champion.place} place</p>
              <p className="relative mt-3 font-display text-5xl font-bold tracking-tight text-koi sm:text-6xl">
                {champion.place}
              </p>
              <div className="relative mt-4">
                <PrizeLines lines={champion.prizes} size="lg" />
              </div>
              <p className="relative mt-2 text-sm text-ink-soft">Clan payout</p>
            </article>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {restPodium.map((p, i) => (
              <article
                key={p.place}
                className={cn(
                  "pond-card flex flex-col justify-center gap-2 p-5 sm:p-6",
                  "animate-fade-rise",
                  "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]",
                )}
                style={{ animationDelay: `${110 + i * 40}ms` }}
              >
                <p className="pond-label">{p.place} place</p>
                <PrizeLines lines={p.prizes} size="md" />
                <p className="text-sm text-ink-soft">Clan payout</p>
              </article>
            ))}

            <article
              className={cn(
                "pond-card relative overflow-hidden p-5 sm:col-span-2 sm:p-6",
                "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_68%)]",
                "animate-fade-rise",
              )}
              style={{ animationDelay: "180ms" }}
            >
              <Image
                src="/badges/koi-10.png"
                alt=""
                width={110}
                height={110}
                className="pointer-events-none absolute -right-2 -bottom-3 size-24 opacity-40 drop-shadow-md sm:size-28"
              />
              <div className="relative max-w-[calc(100%-5.5rem)] space-y-2">
                <p className="pond-label">{displayDash(giveawayPlaces)}</p>
                <p className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                  {displayDash(giveaway.title)}
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {displayDash(giveaway.description)}
                </p>
              </div>
            </article>
          </div>
        </div>

        {giveaway.tiers.length > 0 ? (
          <div
            className="pond-card animate-fade-rise pond-pad"
            style={{ animationDelay: "220ms" }}
          >
            <Heading as="h3">Giveaway Bands</Heading>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Placement band sets which giveaway you enter. Awarded by the clan.
            </p>
            <div className="mt-5 space-y-3">
              {giveaway.tiers.map((t) => {
                const oddsLine = t.rewards.find((r) => /%/.test(r));
                const hasPct = Boolean(oddsLine);
                return (
                  <div
                    key={t.places}
                    className={cn(
                      "grid gap-1.5 sm:items-center sm:gap-3",
                      hasPct
                        ? "sm:grid-cols-[7rem_1fr_4.5rem]"
                        : "sm:grid-cols-[7rem_1fr]",
                    )}
                  >
                    <p className="font-display text-sm font-semibold text-ink">
                      {displayDash(t.places)}
                    </p>
                    {hasPct && oddsLine ? (
                      <>
                        <div className="h-2.5 overflow-hidden rounded-full bg-card-surface-alt">
                          <div
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r from-koi to-[color-mix(in_srgb,var(--pond-teal)_70%,var(--koi-orange))]",
                              "transition-[width] duration-300 ease-[var(--ease-out)]",
                              oddsBarWidth(oddsLine),
                            )}
                          />
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-tabular text-base font-bold text-koi">
                            {oddsLine.replace(/\s*odds each/i, "").trim()}
                          </p>
                          <p className="text-[11px] font-medium text-ink-soft">
                            {weightFromOdds(oddsLine)}
                          </p>
                        </div>
                        {t.rewards.length > 1 ? (
                          <div className="sm:col-span-3">
                            <PrizeLines
                              lines={t.rewards.filter((r) => r !== oddsLine)}
                              size="sm"
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <PrizeLines lines={t.rewards} size="sm" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="pond-section">
        <div
          className="animate-fade-rise flex flex-wrap items-end justify-between gap-3"
          style={{ animationDelay: "120ms" }}
        >
          <div className="max-w-xl space-y-1">
            <Heading as="h2">In-Game Rewards</Heading>
            <p className="text-sm leading-relaxed text-ink-soft">
              Placement rewards from PS99. Top contributors claim the pet.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
          >
            <RefreshCw
              className={cn("size-4", isFetching && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
        </div>

        {placement.length === 0 && packs.length === 0 ? (
          <div className="pond-card pond-pad">
            <Heading as="h3">No placement rewards yet</Heading>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">
              PS99 has not published rewards for this battle. Clan payouts
              above still apply.
            </p>
          </div>
        ) : (
          <div className="pond-card animate-fade-rise space-y-5 pond-pad">
            {placement[0] ? <FeaturedPlacement row={placement[0]} /> : null}

            {placement.length > 1 ? (
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                {placement.slice(1).map((row, index) => (
                  <PlaceRewardTile
                    key={`place-${row.place}`}
                    row={row}
                    index={index}
                  />
                ))}
              </ul>
            ) : null}

            {packs.length > 0 ? (
              <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] pt-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <p className="font-display text-sm font-semibold tracking-tight text-ink sm:text-base">
                    Pack rewards
                  </p>
                  <p className="text-xs text-ink-soft sm:text-sm">
                    Cosmetics and gifts for wider finish bands
                  </p>
                </div>
                <ul
                  className={cn(
                    "grid gap-2.5 sm:gap-3",
                    packs.length >= 3
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : packs.length === 2
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1",
                  )}
                >
                  {packs.map((row, index) => (
                    <PlaceRewardTile
                      key={`pack-${row.place}`}
                      row={row}
                      index={index}
                      pack
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
