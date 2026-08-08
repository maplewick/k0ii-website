import type { BattleRewardsResponse } from "@k0ii/schemas";
import { CLAN_BATTLE_GIVEAWAY, CLAN_BATTLE_PODIUM } from "@k0ii/schemas";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  extractAssetId,
  fetchActiveClanBattle,
  ps99ImageUrl,
} from "./ps99-client";

const PODIUM = CLAN_BATTLE_PODIUM.map((p) => ({
  ...p,
  prizes: [...p.prizes],
}));
const GIVEAWAY = {
  ...CLAN_BATTLE_GIVEAWAY,
  tiers: CLAN_BATTLE_GIVEAWAY.tiers.map((t) => ({
    ...t,
    rewards: [...t.rewards],
  })),
};

const COLLECTION_TTL_MS = 30 * 60 * 1000;
const ITEM_ICON_COLLECTIONS = ["Lootboxes", "Booths", "Hoverboards", "MiscItems"];

let petsCache: { fetchedAt: number; byName: Map<string, Record<string, unknown>> } = {
  fetchedAt: 0,
  byName: new Map(),
};
let itemsCache: { fetchedAt: number; byName: Map<string, Record<string, unknown>> } = {
  fetchedAt: 0,
  byName: new Map(),
};

function petVariantFromItemData(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  if (data.sh === true || data.shiny === true) return "Shiny";
  const pt = Number(data.pt);
  if (pt === 2) return "Rainbow";
  if (pt === 1) return "Golden";
  return null;
}

function formatOrdinal(n: number): string | null {
  const v = Math.trunc(n);
  if (!Number.isFinite(v)) return null;
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`;
  switch (v % 10) {
    case 1:
      return `${v}st`;
    case 2:
      return `${v}nd`;
    case 3:
      return `${v}rd`;
    default:
      return `${v}th`;
  }
}

function formatPlacementRangeLabel(best: number | null, worst: number | null): string | null {
  if (best == null || worst == null) return null;
  if (!Number.isFinite(best) || !Number.isFinite(worst) || best <= 0 || worst <= 0) {
    return null;
  }
  if (best === worst) return formatOrdinal(best);
  return `${formatOrdinal(best)}-${formatOrdinal(worst)}`;
}

async function getPetsByName(): Promise<Map<string, Record<string, unknown>>> {
  if (petsCache.byName.size > 0 && Date.now() - petsCache.fetchedAt < COLLECTION_TTL_MS) {
    return petsCache.byName;
  }
  const res = await fetch("https://ps99.biggamesapi.io/api/collection/Pets", {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Pets collection HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{ configName?: string; configData?: Record<string, unknown> }>;
  };
  const byName = new Map<string, Record<string, unknown>>();
  for (const entry of json.data ?? []) {
    const name = String(entry?.configData?.name ?? entry?.configName ?? "").trim();
    if (name) byName.set(name, entry.configData ?? entry);
  }
  petsCache = { fetchedAt: Date.now(), byName };
  return byName;
}

async function getItemsByName(): Promise<Map<string, Record<string, unknown>>> {
  if (itemsCache.byName.size > 0 && Date.now() - itemsCache.fetchedAt < COLLECTION_TTL_MS) {
    return itemsCache.byName;
  }
  const byName = new Map<string, Record<string, unknown>>();
  for (const collection of ITEM_ICON_COLLECTIONS) {
    try {
      const res = await fetch(
        `https://ps99.biggamesapi.io/api/collection/${encodeURIComponent(collection)}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: Array<{ configName?: string; configData?: Record<string, unknown> }>;
      };
      for (const entry of json.data ?? []) {
        const config = (entry?.configData ?? entry ?? {}) as Record<string, unknown>;
        const aliases = [
          String(entry?.configName ?? "").trim(),
          String(config.name ?? "").trim(),
          String(config.DisplayName ?? "").trim(),
        ].filter(Boolean);
        for (const name of [...aliases]) {
          const pipe = name.indexOf(" | ");
          if (pipe >= 0) {
            const suffix = name.slice(pipe + 3).trim();
            if (suffix) aliases.push(suffix);
          }
        }
        for (const name of aliases) {
          if (!byName.has(name)) byName.set(name, config);
        }
      }
    } catch {
      // optional collections
    }
  }
  itemsCache = { fetchedAt: Date.now(), byName };
  return byName;
}

function pickPetThumbnailAsset(
  petConfig: Record<string, unknown>,
  variant: string | null,
): string | null {
  if (variant === "Golden" && petConfig.goldenThumbnail) {
    return extractAssetId(String(petConfig.goldenThumbnail));
  }
  return extractAssetId(
    String(petConfig.thumbnail ?? petConfig.goldenThumbnail ?? ""),
  );
}

function pickItemIconAsset(itemConfig: Record<string, unknown>): string | null {
  return extractAssetId(
    String(
      itemConfig.Icon ??
        itemConfig.icon ??
        itemConfig.thumbnail ??
        itemConfig.Image ??
        itemConfig.image ??
        "",
    ),
  );
}

async function fetchRobloxAssetThumbnails(
  assetIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(assetIds.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/assets?assetIds=${unique.join(",")}&size=150x150&format=Png&isCircular=false`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      data?: Array<{ targetId?: number; imageUrl?: string }>;
    };
    const map: Record<string, string> = {};
    for (const entry of data.data ?? []) {
      const id = String(entry.targetId ?? "");
      if (id && entry.imageUrl) map[id] = entry.imageUrl;
    }
    return map;
  } catch {
    return {};
  }
}

type MappedReward = {
  place: string;
  name: string;
  variant: string | null;
  assetId: string | null;
  best: number | null;
  worst: number | null;
};

function mapRawPlacementEntries(raw: unknown): MappedReward[] {
  if (!Array.isArray(raw)) return [];
  const out: MappedReward[] = [];

  for (let index = 0; index < raw.length; index++) {
    const entry = raw[index] as Record<string, unknown>;

    // Legacy / mistaken Place+Items shape
    if (Array.isArray(entry.Items) || Array.isArray(entry.items) || Array.isArray(entry.Rewards)) {
      const place =
        typeof entry.Place === "number"
          ? formatOrdinal(entry.Place) ?? `${entry.Place}`
          : typeof entry.place === "string"
            ? entry.place
            : `${index + 1}`;
      const itemsRaw = (entry.Items ?? entry.items ?? entry.Rewards) as unknown[];
      for (const item of itemsRaw) {
        const it = item as Record<string, unknown>;
        const name = String(it.DisplayName ?? it.Name ?? it.name ?? "Reward");
        const icon = String(it.Icon ?? it.icon ?? "");
        const variant = it.Variant
          ? String(it.Variant)
          : it.Shiny
            ? "Shiny"
            : it.Golden
              ? "Golden"
              : it.Rainbow
                ? "Rainbow"
                : null;
        out.push({
          place,
          name,
          variant,
          assetId: extractAssetId(icon),
          best: null,
          worst: null,
        });
      }
      continue;
    }

    // Live PS99 shape: Item._data + Best/Worst
    const itemBlob = (entry.Item ?? entry.item) as Record<string, unknown> | undefined;
    const itemData = (
      itemBlob && typeof itemBlob === "object" && "_data" in itemBlob
        ? (itemBlob._data as Record<string, unknown>)
        : itemBlob
    ) as Record<string, unknown> | undefined;
    const itemId = String(itemData?.id ?? "").trim();
    if (!itemId) continue;

    const best = Number.isFinite(Number(entry.Best)) ? Number(entry.Best) : null;
    const worst = Number.isFinite(Number(entry.Worst))
      ? Number(entry.Worst)
      : best;
    const place =
      formatPlacementRangeLabel(best, worst) ??
      (best != null ? String(best) : `${index + 1}`);
    const variant = petVariantFromItemData(itemData ?? null);

    out.push({
      place,
      name: itemId,
      variant,
      assetId: null,
      best,
      worst,
    });
  }

  return out;
}

async function enrichWithAssets(mapped: MappedReward[]): Promise<MappedReward[]> {
  let petsByName = new Map<string, Record<string, unknown>>();
  let itemsByName = new Map<string, Record<string, unknown>>();
  try {
    petsByName = await getPetsByName();
  } catch (error) {
    console.warn(
      `[rewards] pets collection: ${error instanceof Error ? error.message : error}`,
    );
  }
  try {
    itemsByName = await getItemsByName();
  } catch (error) {
    console.warn(
      `[rewards] item collections: ${error instanceof Error ? error.message : error}`,
    );
  }

  return mapped.map((row) => {
    if (row.assetId) return row;
    const pet = petsByName.get(row.name);
    if (pet) {
      return { ...row, assetId: pickPetThumbnailAsset(pet, row.variant) };
    }
    const item = itemsByName.get(row.name);
    if (item) {
      return { ...row, assetId: pickItemIconAsset(item) };
    }
    return row;
  });
}

async function parsePlacementRewards(
  raw: unknown,
): Promise<BattleRewardsResponse["placementRewards"]> {
  const mapped = await enrichWithAssets(mapRawPlacementEntries(raw));
  const thumbMap = await fetchRobloxAssetThumbnails(
    mapped.map((m) => m.assetId).filter((id): id is string => Boolean(id)),
  );

  // One row per placement reward (matches web prize tiles).
  return mapped.map((m) => ({
    place: m.place,
    items: [
      {
        name: m.name,
        quantity: null,
        imageUrl:
          (m.assetId && thumbMap[m.assetId]) ||
          (m.assetId ? ps99ImageUrl(m.assetId) : null),
        variant: m.variant,
      },
    ],
  }));
}

async function loadBattleWithRewards() {
  const live = await prisma.battle.findFirst({
    where: { state: "live" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, rewardsJson: true, state: true },
  });
  if (live) return live;
  return prisma.battle.findFirst({
    where: { state: "past" },
    orderBy: { endTime: "desc" },
    select: { id: true, title: true, rewardsJson: true, state: true },
  });
}

/**
 * Prefer live PS99 PlacementRewards (quick fetch). Persist when tied to a battle row.
 * Fall back to DB snapshot when PS99 has nothing.
 */
export async function buildBattleRewardsResponse(): Promise<BattleRewardsResponse> {
  let battle = await loadBattleWithRewards();
  const active = await fetchActiveClanBattle();
  const liveRaw = active?.configData?.PlacementRewards;

  if (
    battle &&
    Array.isArray(liveRaw) &&
    liveRaw.length > 0 &&
    (active?.configName === battle.id || battle.rewardsJson == null)
  ) {
    const json = JSON.parse(JSON.stringify(liveRaw)) as Prisma.InputJsonValue;
    await prisma.battle.update({
      where: { id: battle.id },
      data: { rewardsJson: json },
    });
    battle = { ...battle, rewardsJson: json as Prisma.JsonValue };
    console.log(`[rewards] synced placement rewards for ${battle.id}`);
  }

  const source =
    Array.isArray(liveRaw) && liveRaw.length > 0 ? liveRaw : battle?.rewardsJson;
  const placementRewards = await parsePlacementRewards(source);

  const battleId = battle?.id ?? active?.configName ?? null;
  const battleTitle =
    battle?.title ?? battle?.id ?? active?.configName ?? null;

  return {
    generatedAt: Date.now(),
    battleId,
    battleTitle,
    podium: PODIUM,
    placementRewards,
    giveaway: GIVEAWAY,
  };
}
