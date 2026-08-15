"use client";

import { useEffect, useState } from "react";

/**
 * Live remaining ms from a snapshot (`msRemaining` at `generatedAt`).
 * First paint uses `generatedAt` as "now" so SSR + hydration match; wall clock
 * starts after mount.
 */
export function useBattleRemaining(
  msRemaining: number | null | undefined,
  generatedAt: number,
): number | null {
  const [now, setNow] = useState(generatedAt);

  useEffect(() => {
    setNow(Date.now());
    if (msRemaining == null || !Number.isFinite(msRemaining) || msRemaining <= 0) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [msRemaining, generatedAt]);

  if (msRemaining == null || !Number.isFinite(msRemaining)) return null;
  const elapsed = Math.max(0, now - generatedAt);
  return Math.max(0, msRemaining - elapsed);
}
