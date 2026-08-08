import { prisma } from "../lib/prisma";

const PLAYER_SNAP_LIVE_MS = 14 * 60 * 60 * 1000;
const CLAN_SNAP_KEEP_MS = 48 * 60 * 60 * 1000;

/** Batched retention deletes. Returns approximate Prisma op count. */
export async function pruneSnapshots(opts: {
  liveBattleId?: string | null;
  archivedBattleId?: string | null;
}): Promise<number> {
  let ops = 0;
  const now = Date.now();

  if (opts.archivedBattleId) {
    const r = await prisma.playerPointSnapshot.deleteMany({
      where: { battleId: opts.archivedBattleId },
    });
    ops += 1;
    if (r.count > 0) {
      console.log(
        `[prune] dropped ${r.count} player snaps for archived ${opts.archivedBattleId}`,
      );
    }
  }

  if (opts.liveBattleId) {
    const cutoff = new Date(now - PLAYER_SNAP_LIVE_MS);
    const r = await prisma.playerPointSnapshot.deleteMany({
      where: {
        battleId: opts.liveBattleId,
        capturedAt: { lt: cutoff },
      },
    });
    ops += 1;
    if (r.count > 0) {
      console.log(`[prune] dropped ${r.count} stale player snaps (<14h keep)`);
    }
  }

  const clanCutoff = new Date(now - CLAN_SNAP_KEEP_MS);
  const clanDel = await prisma.clanBattleSnapshot.deleteMany({
    where: { capturedAt: { lt: clanCutoff } },
  });
  ops += 1;
  if (clanDel.count > 0) {
    console.log(`[prune] dropped ${clanDel.count} clan snaps (>48h)`);
  }

  return ops;
}
