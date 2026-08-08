import { loadEnv } from "../env";
import { pollPs99 } from "../services/poll-ps99";
import { refreshGlobalPlayerIndex } from "../services/refresh-global-index";

const env = loadEnv();

let lastGlobalRefreshAt = 0;
let globalRefreshRunning = false;

async function maybeRefreshGlobal(live: boolean): Promise<void> {
  if (!live) return;
  if (globalRefreshRunning) return;
  const due =
    lastGlobalRefreshAt === 0 ||
    Date.now() - lastGlobalRefreshAt >= env.GLOBAL_INDEX_REFRESH_MS;
  if (!due) return;

  globalRefreshRunning = true;
  try {
    const result = await refreshGlobalPlayerIndex(env);
    if (result.ran) {
      lastGlobalRefreshAt = Date.now();
    } else if (result.skipped === "no-live-battle") {
      // Battle flipped idle mid-tick — wait full interval before retry.
      lastGlobalRefreshAt = Date.now();
    }
    // in-flight / empty-clan-list: leave lastGlobalRefreshAt so we retry soon
  } catch (error) {
    console.error("[global-index] refresh failed", error);
  } finally {
    globalRefreshRunning = false;
  }
}

async function loop() {
  let live = false;
  try {
    const result = await pollPs99(env);
    live = result.live;
  } catch (error) {
    console.error("[poll] failed", error);
  }

  // Fire-and-forget so 500 clan fetches never block the next poll tick.
  void maybeRefreshGlobal(live);

  const nextMs = live ? env.POLL_INTERVAL_MS : env.POLL_INTERVAL_IDLE_MS;
  console.log(`[poll] next tick in ${nextMs}ms (live=${live})`);
  setTimeout(loop, nextMs);
}

console.log(
  `[poll] starting adaptive poll live=${env.POLL_INTERVAL_MS}ms idle=${env.POLL_INTERVAL_IDLE_MS}ms clan=${env.CLAN_NAME}`,
);
console.log(
  `[global-index] cadence=${env.GLOBAL_INDEX_REFRESH_MS}ms clans=${env.GLOBAL_INDEX_CLAN_LIMIT} concurrency=${env.GLOBAL_INDEX_FETCH_CONCURRENCY}`,
);

// Kick first global build soon after start if we are live (poll sets live on first tick).
await loop();
