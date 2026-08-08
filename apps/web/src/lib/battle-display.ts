import type { BattleSummary } from "@k0ii/schemas";

import { formatRelativeTime } from "@/lib/format";

export function hasBattleSnapshot(
  battle: BattleSummary | null | undefined,
): battle is BattleSummary {
  return battle != null;
}

export function battleBadgeLabel(
  battle: BattleSummary | null | undefined,
): string {
  if (!battle) return "Between wars";
  if (battle.live) return "Live battle";
  return "Battle ended";
}

export function battleBadgeVariant(
  battle: BattleSummary | null | undefined,
): "success" | "secondary" | "outline" {
  if (!battle) return "secondary";
  if (battle.live) return "success";
  return "outline";
}

export function battleEndedCaption(
  battle: BattleSummary | null | undefined,
): string | null {
  if (!battle || battle.live) return null;
  const endedAt = battle.endedAt;
  if (endedAt != null && Number.isFinite(endedAt)) {
    return `Ended ${formatRelativeTime(endedAt)}`;
  }
  return "Final war stats";
}
