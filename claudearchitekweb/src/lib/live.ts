/**
 * Integration with the existing Pixel Streaming backend (website/ → live.architeksoft.com).
 * It exposes an admin API guarded by an express-session cookie. We log in, create an
 * instance with quotas, and build the client link:  {backend}/?instanceUuid={uuid}
 * Without credentials the functions return dry-run results so the UI still works.
 */
import { env } from "./env";
import { getSetting } from "./settings";

type LiveInstance = {
  uuid: string;
  instanceId: string;
  displayLimitHours: number;
  realLimitHours: number;
  displayTimeUsedSeconds: number;
  realTimeUsedSeconds: number;
  status: string;
  expiresAt?: string;
  assignedTo?: string | null;
  lastActiveAt?: string;
};

export function liveConfigured() {
  return !!(env.live.username && env.live.password);
}

export function liveLinkFor(uuid: string) {
  const base = getSetting("live").backendUrl.replace(/\/$/, "");
  return `${base}/?instanceUuid=${encodeURIComponent(uuid)}`;
}

async function loginCookie(): Promise<string> {
  const base = getSetting("live").backendUrl;
  const res = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.live.username, password: env.live.password }),
  });
  if (!res.ok) throw new Error(`Live backend login failed (${res.status})`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("Live backend returned no session cookie");
  return cookie.split(";")[0];
}

export async function listLiveInstances(): Promise<{ ok: boolean; instances: LiveInstance[]; error?: string }> {
  if (!liveConfigured()) return { ok: false, instances: [], error: "LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD դրված չեն։" };
  try {
    const cookie = await loginCookie();
    const base = getSetting("live").backendUrl;
    const res = await fetch(`${base}/api/admin/instances`, { headers: { Cookie: cookie } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, LiveInstance>;
    return { ok: true, instances: Object.values(data) };
  } catch (e) {
    return { ok: false, instances: [], error: (e as Error).message };
  }
}

export async function createLiveInstance(opts: { assignedTo: string; displayLimitHours?: number; realLimitHours?: number; days?: number; explicitInstanceId?: string }) {
  const live = getSetting("live");
  const expiresAt = new Date(Date.now() + (opts.days ?? live.defaultDays) * 86400_000).toISOString();
  if (!liveConfigured()) {
    // Dry run: return a placeholder uuid so the admin can still see the link shape.
    const uuid = `dry-${Math.random().toString(36).slice(2, 10)}`;
    return { ok: false as const, dryRun: true, uuid, url: liveLinkFor(uuid), expiresAt, error: "Live սերվերի մուտքի տվյալները կարգավորված չեն։" };
  }
  const cookie = await loginCookie();
  const res = await fetch(`${live.backendUrl}/api/admin/instances`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      assignedTo: opts.assignedTo,
      displayLimitHours: opts.displayLimitHours ?? live.defaultDisplayHours,
      realLimitHours: opts.realLimitHours ?? live.defaultRealHours,
      expiresAt,
      explicitInstanceId: opts.explicitInstanceId,
    }),
  });
  if (!res.ok) throw new Error(`Live backend create failed (${res.status})`);
  const data = (await res.json()) as { success: boolean; uuid: string };
  return { ok: true as const, dryRun: false, uuid: data.uuid, url: liveLinkFor(data.uuid), expiresAt };
}

export async function stopLiveInstance(uuid: string) {
  if (!liveConfigured()) return { ok: false, error: "Live սերվերը կարգավորված չէ։" };
  const cookie = await loginCookie();
  const res = await fetch(`${getSetting("live").backendUrl}/api/admin/instances/${uuid}/stop`, { method: "POST", headers: { Cookie: cookie } });
  return { ok: res.ok };
}

export async function liveBalance(uuid: string) {
  try {
    const res = await fetch(`${getSetting("live").backendUrl}/api/instances/${uuid}/balance`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return (await res.json()) as { timeLeft: string; displayLimitText: string; expired: boolean; remainingDays: number; linkExpired: boolean };
  } catch {
    return null;
  }
}
