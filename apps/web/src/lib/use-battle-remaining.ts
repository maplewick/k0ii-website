"use client";

import { useEffect, useState } from "react";

export function useBattleRemaining(
  msRemaining: number | null | undefined,
  generatedAt: number,
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (msRemaining == null || !Number.isFinite(msRemaining) || msRemaining <= 0) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [msRemaining]);

  if (msRemaining == null || !Number.isFinite(msRemaining)) return null;
  const elapsed = Math.max(0, now - generatedAt);
  return Math.max(0, msRemaining - elapsed);
}
