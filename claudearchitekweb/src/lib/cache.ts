/**
 * Tiny in-process TTL cache for hot read paths (settings, portfolio, dashboard stats).
 * Invalidate with `bust(prefix)` after writes. Single-process by design (one server).
 */
type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<unknown>>();

export function cached<T>(key: string, ttlMs: number, compute: () => T): T {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value as T;
  const value = compute();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

export function bust(prefix = ""): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
