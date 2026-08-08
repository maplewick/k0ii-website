import { readPollStamp } from "./poll-stamp";

type CacheEntry<T> = { value: T; expiresAt: number; pollStamp: number };

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number,
  pollStamp: number,
): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs, pollStamp });
}

/** Drop all response caches (same-process only; poller uses poll-stamp file). */
export function invalidateResponseCache(): void {
  store.clear();
}

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const stamp = await readPollStamp();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() <= hit.expiresAt && hit.pollStamp >= stamp) {
    return hit.value;
  }
  if (hit) store.delete(key);
  const value = await loader();
  cacheSet(key, value, ttlMs, stamp);
  return value;
}
