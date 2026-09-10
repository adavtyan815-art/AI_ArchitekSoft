/** Read-only helpers shared by admin pages (option lists, labels, thumbnails). Server only. */
import { desc, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { formatDate, relativeTime } from "./utils";
import type { AdminLocale } from "./i18n/admin";
import type { Asset } from "./db/schema";

/** "3 ր առաջ" / "2 օր առաջ" — plain Armenian relative time; falls back to an absolute date after a month. */
export function relativeTimeHy(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "հենց նոր";
  if (m < 60) return `${m} ր առաջ`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ժ առաջ`;
  const days = Math.round(h / 24);
  if (days === 1) return "երեկ";
  if (days < 30) return `${days} օր առաջ`;
  return formatDate(iso);
}

/** Locale-aware relative time for admin screens. */
export function relTime(iso: string | null | undefined, locale: AdminLocale): string {
  return locale === "hy" ? relativeTimeHy(iso) : relativeTime(iso);
}

export function entityHref(type: string | null | undefined, id: string | null | undefined): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "lead":
      return `/admin/leads/${id}`;
    case "client":
      return `/admin/clients/${id}`;
    case "company":
      return `/admin/companies/${id}`;
    case "project":
      return `/admin/projects/${id}`;
    case "post":
      return `/admin/smm/${id}`;
    default:
      return null;
  }
}

export function clientLabel(c: { firstName: string; lastName?: string | null } | null | undefined): string {
  if (!c) return "";
  return `${c.firstName} ${c.lastName ?? ""}`.trim();
}

export function projectOptions() {
  return getDb().select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, status: schema.projects.status }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
}

export function clientOptions() {
  return getDb()
    .select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName, kind: schema.clients.kind, companyId: schema.clients.companyId })
    .from(schema.clients)
    .orderBy(schema.clients.firstName)
    .all();
}

export function companyOptions() {
  return getDb().select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).orderBy(schema.companies.name).all();
}

export function assetsByIds(ids: string[]): Asset[] {
  if (!ids.length) return [];
  return getDb().select().from(schema.assets).where(inArray(schema.assets.id, ids)).all();
}

/** Best available preview URL for an asset (thumbnail, else the original image), or null for icon-only kinds. */
export function thumbUrlFor(a: { relPath: string; thumbRelPath: string | null; mime: string }, width?: number): string | null {
  if (a.thumbRelPath) return mediaUrl(a.thumbRelPath, width);
  if (a.mime.startsWith("image/")) return mediaUrl(a.relPath, width);
  return null;
}

/** `srcset` for a grid thumbnail (1× / 2×), or undefined when the asset has no image preview. */
export function thumbSrcSetFor(a: { relPath: string; thumbRelPath: string | null; mime: string }, width = 320): string | undefined {
  const one = thumbUrlFor(a, width);
  const two = thumbUrlFor(a, width * 2);
  if (!one || !two || one === two) return undefined;
  return `${one} ${width}w, ${two} ${width * 2}w`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return "";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Map a task/activity entity to a human label. */
export function entityTitle(type: string | null | undefined, id: string | null | undefined): string | null {
  if (!type || !id) return null;
  const db = getDb();
  if (type === "project") {
    const p = db.select({ code: schema.projects.code, title: schema.projects.title }).from(schema.projects).where(inArray(schema.projects.id, [id])).get();
    return p ? `${p.code} ${p.title}` : null;
  }
  if (type === "lead") {
    const l = db.select({ name: schema.leads.name }).from(schema.leads).where(inArray(schema.leads.id, [id])).get();
    return l ? `Lead: ${l.name}` : null;
  }
  if (type === "client") {
    const c = db.select({ firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).where(inArray(schema.clients.id, [id])).get();
    return c ? clientLabel(c) : null;
  }
  if (type === "company") {
    const c = db.select({ name: schema.companies.name }).from(schema.companies).where(inArray(schema.companies.id, [id])).get();
    return c ? c.name : null;
  }
  return null;
}
