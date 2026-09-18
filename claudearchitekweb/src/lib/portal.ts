/**
 * Client portal helpers (server-only): load everything a share link needs,
 * check access, and record views/events on share_links.
 */
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { hmac, safeEqual } from "./ids";
import { nowIso } from "./utils";
import type { Asset, Client, ClientFeedback, Company, Project, ShareLink } from "./db/schema";

export type PortalData = {
  link: ShareLink;
  project: Project;
  client: Client | null;
  company: Company | null;
  assets: Asset[];
  renders: Asset[];
  videos: Asset[];
  sketch: Asset | null;
  pdf: Asset | null;
  glb: Asset | null;
  usdz: Asset | null;
  documents: Asset[];
  feedback: ClientFeedback[];
};

export type AccessResult = "ok" | "not_found" | "expired" | "inactive" | "bad_token" | "passcode";

export const PASSCODE_COOKIE_PREFIX = "pp_";

/**
 * Keys (`?k=` tokens) of the client pages this browser has been given.
 *
 * A client page carries its key in the URL, but the files it shows are loaded from `/media/...`,
 * where that query string is gone. `src/middleware.ts` copies the key of every `/p` and `/v` request
 * into this HttpOnly cookie so the media route can serve a project's files only to a visitor who
 * actually holds one of its links — and only with the download permission of that link.
 *
 * Format: the tokens, newest first, joined with "." (they are base64url, so the dot is unambiguous),
 * capped at `LINK_KEYS_MAX`. The middleware writes it without importing this module (it must stay
 * free of database imports), so the name and the format are duplicated there — keep both in sync.
 */
export const LINK_KEYS_COOKIE = "pk";
export const LINK_KEYS_MAX = 5;

export function parseLinkKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(".")
    .filter((t) => t.length > 0 && t.length <= 200)
    .slice(0, LINK_KEYS_MAX);
}

export function passcodeCookieName(linkId: string) {
  return `${PASSCODE_COOKIE_PREFIX}${linkId}`;
}

/**
 * Value stored in the `pp_<linkId>` cookie once a visitor has entered the right code.
 *
 * It is keyed with the server secret and bound to the link, so it can neither be computed from the
 * code (a four-digit sha256 is reversed instantly) nor replayed on another client page. Changing
 * APP_SECRET or regenerating the link invalidates it, and visitors simply enter the code again.
 */
export function passcodeCookieValue(linkId: string, passcode: string) {
  return hmac(env.secret, `passcode|${linkId}|${passcode.trim()}`);
}

/** Does the code the visitor typed match the one on the link? Constant time, so it leaks no prefix. */
export function passcodeMatches(link: { passcode: string | null }, passcode: string) {
  return !!link.passcode && safeEqual(passcode.trim(), link.passcode.trim());
}

export function getShareLinkBySlug(slug: string): ShareLink | null {
  if (!slug) return null;
  return getDb().select().from(schema.shareLinks).where(eq(schema.shareLinks.slug, slug)).get() ?? null;
}

export function getPortalData(slug: string): PortalData | null {
  const db = getDb();
  const link = getShareLinkBySlug(slug);
  if (!link) return null;
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, link.projectId)).get();
  if (!project) return null;
  const client = project.clientId ? (db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() ?? null) : null;
  const companyId = project.companyId ?? client?.companyId ?? null;
  const company = companyId ? (db.select().from(schema.companies).where(eq(schema.companies.id, companyId)).get() ?? null) : null;

  const assets = db
    .select()
    .from(schema.assets)
    .where(eq(schema.assets.projectId, project.id))
    .orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt))
    .all();

  // Only this project's own files. A role column that still points at a file which has been moved to
  // another project resolves to nothing instead of quietly showing the other project's work.
  const byId = (id: string | null | undefined) => (id ? (assets.find((a) => a.id === id) ?? null) : null);
  const firstOfKind = (kind: string) => assets.find((a) => a.kind === kind) ?? null;

  const isImage = (a: Asset) => a.mime.startsWith("image/");
  const renders = assets.filter((a) => isImage(a) && !["sketch", "poster", "client_upload"].includes(a.kind));
  const videos = assets.filter((a) => a.kind === "video" || a.mime.startsWith("video/"));
  const sketch = byId(project.sketchAssetId) ?? firstOfKind("sketch");
  const pdf = byId(project.pdfAssetId) ?? firstOfKind("pdf");
  const glb = byId(project.arGlbAssetId) ?? firstOfKind("model_glb");
  const usdz = byId(project.arUsdzAssetId) ?? firstOfKind("model_usdz");
  const documents = assets.filter((a) => (a.kind === "pdf" || a.kind === "other") && a.id !== pdf?.id);

  const feedback = db
    .select()
    .from(schema.clientFeedback)
    .where(eq(schema.clientFeedback.projectId, project.id))
    .orderBy(desc(schema.clientFeedback.createdAt))
    .all();

  return { link, project, client, company, assets, renders, videos, sketch, pdf, glb, usdz, documents, feedback };
}

/**
 * Decide whether a visitor may see the page.
 * `passcodeCookie` is the raw value of cookie `pp_<linkId>` (see `passcodeCookieValue`) if present.
 */
export function checkAccess(link: ShareLink | null | undefined, token: string | null | undefined, passcodeCookie?: string | null): AccessResult {
  if (!link) return "not_found";
  if (!token || !safeEqual(token, link.token)) return "bad_token";
  if (!link.isActive) return "inactive";
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return "expired";
  if (link.passcode) {
    if (!passcodeCookie || !safeEqual(passcodeCookie, passcodeCookieValue(link.id, link.passcode))) return "passcode";
  }
  return "ok";
}

/** The columns `holdsLink` needs; a full `ShareLink` satisfies it. */
export type LinkCredentials = Pick<ShareLink, "id" | "token" | "passcode" | "isActive" | "expiresAt">;

/**
 * Does this browser hold this exact link right now — the same question `checkAccess` answers for the
 * page, asked where the URL is no longer available (the media route). `keys` comes from the `pk`
 * cookie and `passcodeCookie` from `pp_<linkId>`; a link behind a passcode counts as held only once
 * the code has been entered, so the code protects the files and not just the page.
 */
export function holdsLink(link: LinkCredentials, keys: string[], passcodeCookie?: string | null): boolean {
  if (!link.isActive) return false;
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return false;
  if (!keys.some((k) => safeEqual(k, link.token))) return false;
  if (link.passcode && !(passcodeCookie && safeEqual(passcodeCookie, passcodeCookieValue(link.id, link.passcode)))) return false;
  return true;
}

/**
 * Pseudonymous visitor key stored with client-page events. Keyed with the server secret: a plain
 * sha256 of an address can be reversed by trying all of IPv4, which would turn a database copy into
 * a record of who opened which page.
 */
function ipHashOf(ip: string, ua = "") {
  // Local runs and direct hits have no address; the user agent then keeps separate visitors apart
  // instead of collapsing everyone into one "unknown".
  return hmac(env.secret, ip ? `portal|${ip}` : `portal|ua|${ua.slice(0, 300)}`).slice(0, 24);
}

/** Insert a `view` event (de-duplicated per visitor within 30 minutes) and bump counters. */
export function recordView(linkId: string, ip: string, ua: string) {
  const db = getDb();
  const ipHash = ipHashOf(ip, ua);
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const recent = db
    .select({ id: schema.shareEvents.id })
    .from(schema.shareEvents)
    .where(and(eq(schema.shareEvents.shareLinkId, linkId), eq(schema.shareEvents.type, "view"), eq(schema.shareEvents.ipHash, ipHash), gte(schema.shareEvents.createdAt, since)))
    .get();
  if (recent) {
    db.update(schema.shareLinks).set({ lastViewedAt: nowIso() }).where(eq(schema.shareLinks.id, linkId)).run();
    return false;
  }
  db.insert(schema.shareEvents).values({ shareLinkId: linkId, type: "view", ipHash, userAgent: ua.slice(0, 300) || null }).run();
  db.update(schema.shareLinks)
    .set({ viewsCount: sql`${schema.shareLinks.viewsCount} + 1`, lastViewedAt: nowIso() })
    .where(eq(schema.shareLinks.id, linkId))
    .run();
  return true;
}

export function recordEvent(linkId: string, type: string, meta?: Record<string, unknown> | string | null, ctx?: { ip?: string; ua?: string }) {
  const metaStr = meta == null ? null : typeof meta === "string" ? meta.slice(0, 1000) : JSON.stringify(meta).slice(0, 1000);
  getDb()
    .insert(schema.shareEvents)
    .values({ shareLinkId: linkId, type, meta: metaStr, ipHash: ctx?.ip || ctx?.ua ? ipHashOf(ctx?.ip ?? "", ctx?.ua ?? "") : null, userAgent: ctx?.ua?.slice(0, 300) ?? null })
    .run();
}
