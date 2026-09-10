/**
 * Client portal helpers (server-only): load everything a share link needs,
 * check access, and record views/events on share_links.
 */
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { sha256 } from "./ids";
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

export function passcodeCookieName(linkId: string) {
  return `${PASSCODE_COOKIE_PREFIX}${linkId}`;
}

export function hashPasscode(passcode: string) {
  return sha256(`passcode|${passcode.trim()}`);
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

  const byId = (id: string | null | undefined) => (id ? (assets.find((a) => a.id === id) ?? db.select().from(schema.assets).where(eq(schema.assets.id, id)).get() ?? null) : null);
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
 * `passcodeCookie` is the raw value of cookie `pp_<linkId>` (sha256 of the passcode) if present.
 */
export function checkAccess(link: ShareLink | null | undefined, token: string | null | undefined, passcodeCookie?: string | null): AccessResult {
  if (!link) return "not_found";
  if (!token || token !== link.token) return "bad_token";
  if (!link.isActive) return "inactive";
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return "expired";
  if (link.passcode) {
    if (!passcodeCookie || passcodeCookie !== hashPasscode(link.passcode)) return "passcode";
  }
  return "ok";
}

function ipHashOf(ip: string) {
  return sha256(`portal|${ip || "unknown"}`).slice(0, 24);
}

/** Insert a `view` event (de-duplicated per ipHash within 30 minutes) and bump counters. */
export function recordView(linkId: string, ip: string, ua: string) {
  const db = getDb();
  const ipHash = ipHashOf(ip);
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
    .values({ shareLinkId: linkId, type, meta: metaStr, ipHash: ctx?.ip ? ipHashOf(ctx.ip) : null, userAgent: ctx?.ua?.slice(0, 300) ?? null })
    .run();
}
