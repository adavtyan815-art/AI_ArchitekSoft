/** Read-only helpers shared by admin pages (option lists, labels, thumbnails, search, dates). Server only. */
import { and, desc, inArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { YEREVAN_TZ, yerevanDay } from "./tz";
import { formatMoney, relativeTime } from "./utils";
import type { AdminLocale } from "./i18n/admin";
import type { Asset } from "./db/schema";

// ---------------------------------------------------------------------------
// Query-string and search helpers
// ---------------------------------------------------------------------------

/** First value of a query-string key. A repeated key (`?q=a&q=b`) arrives as an array. */
export function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Escape the LIKE wildcards so user text is matched literally. Use together with `ESCAPE '\'`. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** SQLite folds case only for ASCII, so Armenian and Cyrillic words are also tried in lower, upper and title case. */
function caseVariants(token: string): string[] {
  if (!/[^ -~]/.test(token)) return [token];
  const lower = token.toLocaleLowerCase();
  const title = lower.replace(/(^|[-'’«(])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase());
  return [...new Set([token, lower, token.toLocaleUpperCase(), title])];
}

const PHONE_QUERY = /^[\d\s+()-]{5,}$/;

/**
 * WHERE clause for a free-text admin search.
 * - Every word of the query must appear in at least one of the `text` columns, so "First Last" finds a person
 *   whose names live in two columns.
 * - `%` and `_` are matched literally.
 * - A query made of digits and phone punctuation is also compared with the `phones` columns stripped of
 *   spaces, dashes and brackets, so "99000777" finds "+374 99 000 777".
 * - `extra` can add one more alternative per word (for example a request number).
 * Returns undefined for an empty query.
 */
export function searchWhere(cols: { text: (AnyColumn | SQL)[]; phones?: (AnyColumn | SQL)[] }, q: string, extra?: (token: string) => SQL | undefined): SQL | undefined {
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!tokens.length) return undefined;
  const perToken = tokens.map((token) => {
    const alts: SQL[] = [];
    for (const variant of caseVariants(token)) {
      const pattern = `%${escapeLike(variant)}%`;
      for (const col of cols.text) alts.push(sql`${col} like ${pattern} escape '\\'`);
    }
    const more = extra?.(token);
    if (more) alts.push(more);
    return or(...alts)!;
  });
  const byWords = and(...perToken)!;
  const digits = q.replace(/\D/g, "");
  if (cols.phones?.length && PHONE_QUERY.test(q) && digits.length >= 5) {
    const pattern = `%${digits}%`;
    const byPhone = cols.phones.map((col) => sql`replace(replace(replace(replace(coalesce(${col}, ''), ' ', ''), '-', ''), '(', ''), ')', '') like ${pattern}`);
    return or(byWords, ...byPhone);
  }
  return byWords;
}

/**
 * An absolute https URL for a website field that was typed without a scheme ("qa-example.com"),
 * so the link opens the external site instead of resolving under /admin. Anything that is not a
 * plain http(s) address (javascript:, mailto:, a bare word) returns null and is shown as text.
 */
export function externalUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\/[^\s/?#]+\.[^\s/?#]/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
  if (!/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(v)) return null;
  return `https://${v}`;
}

/** Request number a visitor sees after sending the site form: the last 6 characters of the lead id, upper-cased. */
export function leadCode(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Condition that finds a lead by its request number (any letter case, optional leading #), or undefined when the word cannot be one. */
export function leadCodeMatch(token: string): SQL | undefined {
  const code = token.replace(/^#/, "");
  if (!/^[A-Za-z0-9_-]{6}$/.test(code)) return undefined;
  return sql`upper(substr(${schema.leads.id}, -6)) = ${code.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Money and dates
// ---------------------------------------------------------------------------

export type MoneyTotal = { currency: string; amount: number };

/** Sum amounts per currency. Amounts in different currencies are never added together. */
export function sumByCurrency<T>(rows: T[], amount: (r: T) => number | null | undefined, currency: (r: T) => string | null | undefined): MoneyTotal[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = amount(r);
    if (!v) continue;
    const cur = currency(r) || "AMD";
    map.set(cur, (map.get(cur) ?? 0) + v);
  }
  return [...map].map(([cur, total]) => ({ currency: cur, amount: total }));
}

/** "1,500,000 ֏ · 5,000 USD": one figure per currency, AMD first. No amounts at all gives "0 ֏". */
export function formatMoneyTotals(totals: MoneyTotal[]): string {
  const rows = totals.filter((r) => r.amount).sort((a, b) => (a.currency === b.currency ? 0 : a.currency === "AMD" ? -1 : b.currency === "AMD" ? 1 : a.currency.localeCompare(b.currency)));
  if (!rows.length) return formatMoney(0);
  return rows.map((r) => formatMoney(r.amount, r.currency)).join(" · ");
}

const DATE_LOCALE: Record<AdminLocale, string> = { hy: "hy-AM", en: "en-GB" };

/** Admin date in the interface language and always in Yerevan time, whatever the server time zone is. */
export function fmtAdminDate(iso: string | null | undefined, locale: AdminLocale, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = DATE_LOCALE[locale] ?? DATE_LOCALE.hy;
  const date = d.toLocaleDateString(tag, { timeZone: YEREVAN_TZ, day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return date;
  return `${date} ${d.toLocaleTimeString(tag, { timeZone: YEREVAN_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`;
}

/** A calendar day ("YYYY-MM-DD") in the interface language. No time-zone shift is applied. */
export function fmtAdminDay(day: string, locale: AdminLocale): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(DATE_LOCALE[locale] ?? DATE_LOCALE.hy, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The calendar day a task is due. A date-only form value is stored as UTC midnight, so that shape is read
 * as the day that was typed; any other instant is read in Yerevan time.
 */
export function taskDueDay(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.0+)?Z)?$/.test(dueAt)) return dueAt.slice(0, 10);
  return Number.isNaN(new Date(dueAt).getTime()) ? null : yerevanDay(dueAt);
}

/** A task is overdue only once its due day has ended in Yerevan. */
export function isTaskOverdue(task: { done: boolean; dueAt: string | null }, now: Date = new Date()): boolean {
  if (task.done) return false;
  const day = taskDueDay(task.dueAt);
  return !!day && day < yerevanDay(now.toISOString());
}

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
  return fmtAdminDate(iso, "hy");
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

/**
 * Labels for the records a list of tasks or activities points at, keyed `type:id`.
 * One query per entity type, limited to the ids that are actually referenced, so a link never
 * disappears because its record is older than some "newest N" list.
 */
export function entityLabels(refs: { entityType: string | null; entityId: string | null }[], leadPrefix: (name: string) => string = (n) => n): Record<string, string> {
  const ids: Record<string, Set<string>> = { project: new Set(), lead: new Set(), client: new Set(), company: new Set() };
  for (const r of refs) if (r.entityType && r.entityId && ids[r.entityType]) ids[r.entityType].add(r.entityId);
  const db = getDb();
  const out: Record<string, string> = {};
  const chunks = (set: Set<string>) => {
    const all = [...set];
    const parts: string[][] = [];
    for (let i = 0; i < all.length; i += 400) parts.push(all.slice(i, i + 400));
    return parts;
  };
  for (const part of chunks(ids.project)) for (const p of db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).where(inArray(schema.projects.id, part)).all()) out[`project:${p.id}`] = `${p.code} ${p.title}`;
  for (const part of chunks(ids.lead)) for (const l of db.select({ id: schema.leads.id, name: schema.leads.name }).from(schema.leads).where(inArray(schema.leads.id, part)).all()) out[`lead:${l.id}`] = leadPrefix(l.name);
  for (const part of chunks(ids.client)) for (const c of db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).where(inArray(schema.clients.id, part)).all()) out[`client:${c.id}`] = clientLabel(c);
  for (const part of chunks(ids.company)) for (const c of db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).where(inArray(schema.companies.id, part)).all()) out[`company:${c.id}`] = c.name;
  return out;
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
