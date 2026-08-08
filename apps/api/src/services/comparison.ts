export function selectComparisonClans(
  window: Array<{ name: string }>,
  currentIndex: number,
  limit = 3,
): { aboveClans: typeof window; belowClans: typeof window } {
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || limit <= 0) {
    return { aboveClans: [], belowClans: [] };
  }
  return {
    aboveClans: window.slice(Math.max(0, currentIndex - limit), currentIndex),
    belowClans: window.slice(currentIndex + 1, currentIndex + 1 + limit),
  };
}

export function enrichNeighborCompactFlags<T extends { name: string }>(
  aboveClans: T[],
  belowClans: T[],
): Array<T & { compact?: boolean }> {
  const mark = (list: T[], side: "above" | "below") =>
    list.map((clan, index) => {
      const isOuter =
        (side === "above" && index < list.length - 1) ||
        (side === "below" && index > 0);
      return isOuter && list.length > 1 ? { ...clan, compact: true } : clan;
    });

  return [...mark(aboveClans, "above"), ...mark(belowClans, "below")];
}
