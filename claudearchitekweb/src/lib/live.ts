/**
 * Integration with the existing Pixel Streaming backend (website/ → live.architeksoft.com).
 * It exposes an admin API guarded by an express-session cookie. We log in, create an
 * instance with quotas, and build the client link:  {backend}/?instanceUuid={uuid}
 * Without credentials the functions return dry-run results so the UI still works.
 *
 * The admin username/password come from the environment only. They are posted to the backend
 * URL, which is editable in Settings, so every credentialed request goes through
 * `safeBackendBase()`: https only (plain http is accepted for localhost), no redirects, 10 s timeout.
 */
import { env } from "./env";
import { getSetting } from "./settings";
import { getAdminLocale, local, type AdminLocale } from "./i18n/admin";

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

/** Machine-readable reason next to the localised `error` text, so pages can pick their own wording. */
export type LiveErrorCode = "not_configured" | "unsafe_url" | "timeout" | "unreachable" | "login_failed" | "backend_error";

const REQUEST_TIMEOUT_MS = 10_000;
const DRY_RUN_PREFIX = "dry-";

/** Sentences returned to the admin UI. The locale is the admin language cookie (Armenian outside a request). */
const strings = (locale: AdminLocale) =>
  local(
    {
      hy: {
        notConfigured: "LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD փոփոխականները նշված չեն։",
        dryRun: "Live 3D սերվերի մուտքի տվյալները նշված չեն, ուստի սերվերում ոչինչ չի ստեղծվել (փորձնական ռեժիմ)։",
        unsafeUrl: "Live 3D սերվերի հասցեն պետք է սկսվի https://-ով (http թույլատրվում է միայն localhost-ի համար)։ Մուտքի տվյալները չուղարկվեցին։",
        timeout: "Live 3D սերվերը 10 վայրկյանում չպատասխանեց։",
        unreachable: "Live 3D սերվերին միանալ չհաջողվեց։",
        loginFailed: (status: number) => `Live 3D սերվերը մերժեց մուտքը (HTTP ${status})։ Ստուգիր LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD-ը։`,
        noCookie: "Live 3D սերվերը մուտքից հետո սեսիա չվերադարձրեց։",
        backendError: (status: number) => `Live 3D սերվերը վերադարձրեց սխալ (HTTP ${status})։`,
      },
      en: {
        notConfigured: "LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD are not set.",
        dryRun: "The Live 3D backend credentials are not set, so nothing was created on the backend (dry run).",
        unsafeUrl: "The Live 3D backend URL must start with https:// (plain http is allowed for localhost only). The credentials were not sent.",
        timeout: "The Live 3D backend did not answer within 10 seconds.",
        unreachable: "Could not reach the Live 3D backend.",
        loginFailed: (status: number) => `The Live 3D backend rejected the login (HTTP ${status}). Check LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD.`,
        noCookie: "The Live 3D backend returned no session after login.",
        backendError: (status: number) => `The Live 3D backend returned an error (HTTP ${status}).`,
      },
    },
    locale
  );

type LiveStrings = ReturnType<typeof strings>;

async function liveStrings(): Promise<LiveStrings> {
  let locale: AdminLocale = "hy";
  try {
    locale = await getAdminLocale();
  } catch {
    /* called outside a request (worker, scripts): keep the default admin language */
  }
  return strings(locale);
}

/** An error whose message is already localised for the admin and which carries a stable code. */
export class LiveError extends Error {
  code: LiveErrorCode;
  constructor(code: LiveErrorCode, message: string) {
    super(message);
    this.name = "LiveError";
    this.code = code;
  }
}

export function liveConfigured() {
  return !!(env.live.username && env.live.password);
}

/**
 * True when the URL may receive the backend admin credentials: https anywhere, or plain http on
 * this machine (local development). Settings validation and every credentialed request use it.
 */
export function isSafeLiveBackendUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.username || u.password) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

/** Placeholder ids produced by a dry run. They never exist on the backend and must not be shown to clients. */
export function isDryRunLiveUuid(uuid: string | null | undefined): boolean {
  return !!uuid && uuid.startsWith(DRY_RUN_PREFIX);
}

/** True for a link built from a dry-run placeholder id (…/?instanceUuid=dry-xxxx). */
export function isDryRunLiveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return isDryRunLiveUuid(new URL(url).searchParams.get("instanceUuid"));
  } catch {
    return /[?&]instanceUuid=dry-/.test(url);
  }
}

function backendBase(): string {
  return getSetting("live").backendUrl.replace(/\/+$/, "");
}

export function liveLinkFor(uuid: string) {
  return `${backendBase()}/?instanceUuid=${encodeURIComponent(uuid)}`;
}

function safeBackendBase(S: LiveStrings): string {
  const base = backendBase();
  if (!isSafeLiveBackendUrl(base)) throw new LiveError("unsafe_url", S.unsafeUrl);
  return base;
}

/** fetch() for the backend admin API: never follows redirects (they could carry the credentials elsewhere), always times out. */
async function backendFetch(S: LiveStrings, url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") throw new LiveError("timeout", S.timeout);
    throw new LiveError("unreachable", S.unreachable);
  }
}

async function loginCookie(S: LiveStrings, base: string): Promise<string> {
  const res = await backendFetch(S, `${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.live.username, password: env.live.password }),
  });
  if (!res.ok) throw new LiveError("login_failed", S.loginFailed(res.status));
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new LiveError("login_failed", S.noCookie);
  return cookie.split(";")[0];
}

function failure(e: unknown): { error: string; errorCode: LiveErrorCode } {
  if (e instanceof LiveError) return { error: e.message, errorCode: e.code };
  return { error: (e as Error)?.message || "Error", errorCode: "backend_error" };
}

export async function listLiveInstances(): Promise<{ ok: boolean; instances: LiveInstance[]; error?: string; errorCode?: LiveErrorCode }> {
  const S = await liveStrings();
  if (!liveConfigured()) return { ok: false, instances: [], error: S.notConfigured, errorCode: "not_configured" };
  try {
    const base = safeBackendBase(S);
    const cookie = await loginCookie(S, base);
    const res = await backendFetch(S, `${base}/api/admin/instances`, { headers: { Cookie: cookie } });
    if (!res.ok) throw new LiveError("backend_error", S.backendError(res.status));
    const data = (await res.json()) as Record<string, LiveInstance> | LiveInstance[] | null;
    return { ok: true, instances: data && typeof data === "object" ? Object.values(data) : [] };
  } catch (e) {
    return { ok: false, instances: [], ...failure(e) };
  }
}

/**
 * Create a streaming instance. Without credentials this is a dry run: nothing exists on the backend and
 * the returned uuid/url are placeholders (`isDryRunLiveUuid`) that only show the link shape in the admin.
 * Callers must not store a dry-run link on a project or show it to a client.
 * Throws a LiveError (localised message) when the backend cannot be used.
 */
export async function createLiveInstance(opts: { assignedTo: string; displayLimitHours?: number; realLimitHours?: number; days?: number; explicitInstanceId?: string }) {
  const S = await liveStrings();
  const live = getSetting("live");
  const expiresAt = new Date(Date.now() + (opts.days ?? live.defaultDays) * 86400_000).toISOString();
  if (!liveConfigured()) {
    const uuid = `${DRY_RUN_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
    return { ok: false as const, dryRun: true, uuid, url: liveLinkFor(uuid), expiresAt, error: S.dryRun, errorCode: "not_configured" as LiveErrorCode };
  }
  const base = safeBackendBase(S);
  const cookie = await loginCookie(S, base);
  const res = await backendFetch(S, `${base}/api/admin/instances`, {
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
  if (!res.ok) throw new LiveError("backend_error", S.backendError(res.status));
  const data = (await res.json()) as { success?: boolean; uuid?: string };
  if (!data?.uuid) throw new LiveError("backend_error", S.backendError(res.status));
  return { ok: true as const, dryRun: false, uuid: data.uuid, url: liveLinkFor(data.uuid), expiresAt };
}

export async function stopLiveInstance(uuid: string): Promise<{ ok: boolean; error?: string; errorCode?: LiveErrorCode }> {
  const S = await liveStrings();
  if (!liveConfigured()) return { ok: false, error: S.notConfigured, errorCode: "not_configured" };
  try {
    const base = safeBackendBase(S);
    const cookie = await loginCookie(S, base);
    const res = await backendFetch(S, `${base}/api/admin/instances/${encodeURIComponent(uuid)}/stop`, { method: "POST", headers: { Cookie: cookie } });
    return res.ok ? { ok: true } : { ok: false, error: S.backendError(res.status), errorCode: "backend_error" };
  } catch (e) {
    return { ok: false, ...failure(e) };
  }
}

export async function liveBalance(uuid: string) {
  if (isDryRunLiveUuid(uuid)) return null;
  try {
    const res = await fetch(`${backendBase()}/api/instances/${encodeURIComponent(uuid)}/balance`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { timeLeft: string; displayLimitText: string; expired: boolean; remainingDays: number; linkExpired: boolean };
  } catch {
    return null;
  }
}
