import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Shared stamp so API process sees poller writes (separate Bun processes). */
const STAMP_PATH = path.resolve(
  import.meta.dir,
  "../../../../data/poll-stamp.json",
);

export async function writePollStamp(): Promise<void> {
  await mkdir(path.dirname(STAMP_PATH), { recursive: true });
  await writeFile(STAMP_PATH, JSON.stringify({ polledAt: Date.now() }), "utf8");
}

export async function readPollStamp(): Promise<number> {
  try {
    const raw = await readFile(STAMP_PATH, "utf8");
    const parsed = JSON.parse(raw) as { polledAt?: number };
    return typeof parsed.polledAt === "number" ? parsed.polledAt : 0;
  } catch {
    return 0;
  }
}
