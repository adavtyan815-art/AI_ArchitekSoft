/**
 * In-memory limiters shared by the public API routes, the client-page passcode check and the admin login.
 *
 * The site runs as one Node process, so a process-local store is enough. State lives on `globalThis`
 * so that separately bundled routes (and dev hot reloads) share one store per limiter name.
 *
 * Two shapes:
 *  - `createLimiter`  sliding window of timestamps per key, optionally with an escalating lock
 *                     (`take()` for request throttling, `blocked()/fail()/reset()` for failure lockouts).
 *  - `createQuota`    fixed-window budget per key (bytes uploaded per day, …).
 */

type Entry = { stamps: number[]; lockedUntil: number; strikes: number; seen: number };
type QuotaEntry = { used: number; reset: number };

type Stores = { limiters: Map<string, Map<string, Entry>>; quotas: Map<string, Map<string, QuotaEntry>> };
const g = globalThis as typeof globalThis & { __atRateLimit?: Stores };
const stores: Stores = (g.__atRateLimit ??= { limiters: new Map(), quotas: new Map() });

/** Strikes (how many times a key was locked in a row) are forgotten after a quiet day. */
const STRIKE_TTL_MS = 24 * 3600_000;

export type LimiterOptions = {
  /** Events allowed inside one window. */
  limit: number;
  windowMs: number;
  /** Lock the key once the limit is reached. An array escalates: first lock, second lock, … (last value repeats). */
  lockMs?: number | number[];
  /** Upper bound of tracked keys (oldest are dropped first). */
  maxKeys?: number;
};

export type LimitResult = { ok: boolean; retryAfterSec: number };

export type Limiter = {
  /** Count one request. `ok:false` when the key is over its limit (the request is not counted) or locked. */
  take(key: string): LimitResult;
  /** Is the key locked (or, without `lockMs`, already at its limit)? Counts nothing. */
  blocked(key: string): LimitResult;
  /** Count one failure; reaching the limit locks the key. Returns the state after counting. */
  fail(key: string): LimitResult;
  /** Forget the key (successful login, correct passcode). */
  reset(key: string): void;
};

const secs = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export function createLimiter(name: string, opts: LimiterOptions): Limiter {
  const maxKeys = opts.maxKeys ?? 5000;
  const locks = opts.lockMs === undefined ? [] : Array.isArray(opts.lockMs) ? opts.lockMs : [opts.lockMs];
  let store = stores.limiters.get(name);
  if (!store) stores.limiters.set(name, (store = new Map()));
  const map = store;

  const idle = (e: Entry, now: number) => e.lockedUntil <= now && (e.stamps.length === 0 || e.stamps[e.stamps.length - 1] <= now - opts.windowMs) && (e.strikes === 0 || e.seen <= now - STRIKE_TTL_MS);

  function prune(now: number) {
    if (map.size <= maxKeys) return;
    for (const [k, e] of map) if (idle(e, now)) map.delete(k);
    // still too many: drop the oldest keys (Map keeps insertion order)
    for (const k of map.keys()) {
      if (map.size <= maxKeys) break;
      map.delete(k);
    }
  }

  function entry(key: string, now: number, create: boolean): Entry | null {
    let e = map.get(key);
    if (!e) {
      if (!create) return null;
      e = { stamps: [], lockedUntil: 0, strikes: 0, seen: now };
      map.set(key, e);
      prune(now);
    }
    const cut = now - opts.windowMs;
    while (e.stamps.length && e.stamps[0] <= cut) e.stamps.shift();
    if (e.strikes && e.seen <= now - STRIKE_TTL_MS) e.strikes = 0;
    return e;
  }

  function state(e: Entry | null, now: number): LimitResult {
    if (!e) return { ok: true, retryAfterSec: 0 };
    if (e.lockedUntil > now) return { ok: false, retryAfterSec: secs(e.lockedUntil - now) };
    if (!locks.length && e.stamps.length >= opts.limit) return { ok: false, retryAfterSec: secs(e.stamps[0] + opts.windowMs - now) };
    return { ok: true, retryAfterSec: 0 };
  }

  function lock(e: Entry, now: number) {
    const ms = locks[Math.min(e.strikes, locks.length - 1)];
    e.lockedUntil = now + ms;
    e.strikes += 1;
    e.stamps = [];
  }

  return {
    take(key) {
      const now = Date.now();
      const e = entry(key, now, true)!;
      const s = state(e, now);
      if (!s.ok) return s;
      e.stamps.push(now);
      e.seen = now;
      if (locks.length && e.stamps.length > opts.limit) {
        lock(e, now);
        return state(e, now);
      }
      return { ok: true, retryAfterSec: 0 };
    },
    blocked(key) {
      const now = Date.now();
      return state(entry(key, now, false), now);
    },
    fail(key) {
      const now = Date.now();
      const e = entry(key, now, true)!;
      if (e.lockedUntil > now) return state(e, now);
      e.stamps.push(now);
      e.seen = now;
      if (e.stamps.length >= opts.limit) {
        if (locks.length) lock(e, now);
        return state(e, now);
      }
      return { ok: true, retryAfterSec: 0 };
    },
    reset(key) {
      map.delete(key);
    },
  };
}

export type Quota = {
  /** Reserve `amount` units for the key; `false` when the window budget would be exceeded (nothing is reserved). */
  spend(key: string, amount: number): boolean;
  /** Give back units reserved by `spend` (a rejected upload). */
  refund(key: string, amount: number): void;
};

export function createQuota(name: string, opts: { limit: number; windowMs: number; maxKeys?: number }): Quota {
  const maxKeys = opts.maxKeys ?? 5000;
  let store = stores.quotas.get(name);
  if (!store) stores.quotas.set(name, (store = new Map()));
  const map = store;
  return {
    spend(key, amount) {
      const now = Date.now();
      let e = map.get(key);
      if (!e || e.reset <= now) {
        e = { used: 0, reset: now + opts.windowMs };
        map.set(key, e);
        if (map.size > maxKeys) {
          for (const [k, v] of map) if (v.reset <= now) map.delete(k);
          for (const k of map.keys()) {
            if (map.size <= maxKeys) break;
            map.delete(k);
          }
        }
      }
      if (e.used + amount > opts.limit) return false;
      e.used += amount;
      return true;
    },
    refund(key, amount) {
      const e = map.get(key);
      if (e) e.used = Math.max(0, e.used - amount);
    },
  };
}

/**
 * The visitor's address as reported by OUR reverse proxy.
 * Only `X-Real-IP` is trusted: the proxy overwrites it on every request, whereas the left-most
 * `X-Forwarded-For` entry is whatever the client chose to send. Empty when there is no proxy (local runs).
 */
export function clientIp(h: Headers): string {
  const ip = (h.get("x-real-ip") ?? "").trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "";
}

/** `Retry-After` header for a 429 answer. */
export function retryHeaders(r: LimitResult): Record<string, string> {
  return { "Retry-After": String(Math.max(1, r.retryAfterSec)) };
}
