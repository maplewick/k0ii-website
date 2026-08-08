/**
 * One-shot: drop ClanMembership rows not on the live PS99 roster.
 * Usage: bun --env-file=../../.env scripts/prune-stale-memberships.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CLAN = process.env.CLAN_NAME ?? "K0i2";

async function main() {
  const res = await fetch(
    `https://ps99.biggamesapi.io/api/clan/${encodeURIComponent(CLAN)}`,
  );
  const body = (await res.json()) as {
    status?: string;
    data?: {
      Members?: Array<{ UserID: number }>;
      Owner?: number;
      MemberCapacity?: number;
    };
  };
  if (body.status !== "ok" || !body.data) {
    throw new Error("PS99 clan fetch failed");
  }

  const members = body.data.Members ?? [];
  const owner = body.data.Owner ? String(body.data.Owner) : null;
  const ids = members.map((m) => String(m.UserID)).filter(Boolean);
  if (owner && !ids.includes(owner)) ids.unshift(owner);

  if (ids.length === 0) {
    throw new Error("Empty PS99 roster — refuse to prune");
  }

  const before = await prisma.clanMembership.count({ where: { clanId: CLAN } });
  const result = await prisma.clanMembership.deleteMany({
    where: {
      clanId: CLAN,
      robloxUserId: { notIn: ids.map((id) => BigInt(id)) },
    },
  });
  const after = await prisma.clanMembership.count({ where: { clanId: CLAN } });

  console.log(
    JSON.stringify(
      {
        clan: CLAN,
        ps99Roster: ids.length,
        capacity: body.data.MemberCapacity ?? null,
        before,
        pruned: result.count,
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
