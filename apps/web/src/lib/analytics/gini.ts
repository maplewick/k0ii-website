export type GiniMember = {
  roblox_username?: string | null;
  currentPoints?: number | null;
};

export type LorenzPoint = { x: number; y: number };

export type GiniStats = {
  gini: number;
  rawEntropy: number;
  normalizedEntropy: number;
  n: number;
  allMembers: number;
  total: number;
  top20Share: number;
  lorenzPoints: LorenzPoint[];
  sortedDesc: { name: string; points: number; share: number }[];
};

export function computeGiniStats(
  members: Array<GiniMember | number>,
): GiniStats | null {
  const contributors = members
    .map((m) => {
      if (typeof m === "number") {
        return { name: "Member", points: Math.max(0, m) };
      }
      return {
        name: String(m.roblox_username ?? "Unknown"),
        points: Math.max(0, Number(m.currentPoints) || 0),
      };
    })
    .filter((m) => m.points > 0);

  const allMembers = members.length;
  const n = contributors.length;
  if (n === 0) return null;

  const sortedAsc = [...contributors].sort((a, b) => a.points - b.points);
  const total = sortedAsc.reduce((s, m) => s + m.points, 0);
  if (total <= 0) return null;

  // Gini via relative mean absolute difference
  let absDiffSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      absDiffSum += Math.abs(sortedAsc[i]!.points - sortedAsc[j]!.points);
    }
  }
  const gini = absDiffSum / (2 * n * n * (total / n));

  // Shannon entropy
  let rawEntropy = 0;
  for (const m of sortedAsc) {
    const p = m.points / total;
    if (p > 0) rawEntropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(n);
  const normalizedEntropy = maxEntropy > 0 ? rawEntropy / maxEntropy : 0;

  const lorenzPoints: LorenzPoint[] = [{ x: 0, y: 0 }];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += sortedAsc[i]!.points;
    lorenzPoints.push({ x: (i + 1) / n, y: cum / total });
  }

  const sortedDesc = [...contributors]
    .sort((a, b) => b.points - a.points)
    .map((m) => ({
      name: m.name,
      points: m.points,
      share: m.points / total,
    }));

  const top20Count = Math.max(1, Math.ceil(n * 0.2));
  const top20Share = sortedDesc
    .slice(0, top20Count)
    .reduce((s, m) => s + m.share, 0);

  return {
    gini,
    rawEntropy,
    normalizedEntropy,
    n,
    allMembers,
    total,
    top20Share,
    lorenzPoints,
    sortedDesc,
  };
}
