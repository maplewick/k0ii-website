"use client";

import { formatBattleCountdown } from "@/lib/format";
import { useBattleRemaining } from "@/lib/use-battle-remaining";
import { cn } from "@/lib/utils";

export function BattleCountdown({
  msRemaining,
  generatedAt,
  className,
}: {
  msRemaining: number | null | undefined;
  generatedAt: number;
  className?: string;
}) {
  const remaining = useBattleRemaining(msRemaining, generatedAt);

  return (
    <p
      className={cn(
        "font-display font-bold tabular-nums tracking-tight text-koi",
        className,
      )}
      aria-live="polite"
    >
      {formatBattleCountdown(remaining)}
    </p>
  );
}
