import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootEnv = resolve(import.meta.dir, "../../../.env");
for (const line of readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (process.env[key] === undefined) process.env[key] = value;
}

const { prisma } = await import("../src/lib/prisma");
const file = resolve(import.meta.dir, "../../../data/global-player-index.json");
const payload = JSON.parse(readFileSync(file, "utf8")) as {
  battleId: string;
  totalPlayers: number;
  clansIndexed: number;
  updatedAt: number;
};

await prisma.globalPlayerIndexSnapshot.upsert({
  where: { id: "current" },
  create: { id: "current", payload },
  update: { payload },
});

console.log(
  `[seed-global] upserted ${payload.totalPlayers} players (${payload.battleId})`,
);
await prisma.$disconnect();
