/**
 * First-party, cookie-free analytics. A visitor hash = sha256(secret + day + ip + ua)
 * rotates daily, so nobody can be tracked across days. No third-party scripts.
 */
import { and, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { sha256 } from "./ids";
import { yerevanDay } from "./tz";

/** Asia/Yerevan is a fixed UTC+4 with no daylight saving, so a plain offset is exact. */
const YEREVAN_OFFSET_MS = 4 * 3600_000;

/** Start of the Yerevan calendar day `backDays` days ago, as the UTC timestamp rows are stored with. */
function yerevanDayStart(backDays: number): string {
  const wall = new Date(Date.now() + YEREVAN_OFFSET_MS);
  const startWall = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - backDays);
  return new Date(startWall - YEREVAN_OFFSET_MS).toISOString();
}

/** `days` consecutive "YYYY-MM-DD" keys (Yerevan calendar), oldest first, ending today. */
function dayKeys(days: number): string[] {
  const wall = new Date(Date.now() + YEREVAN_OFFSET_MS);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - i)).toISOString().slice(0, 10));
  return out;
}

/** Host names that are this site itself: traffic from them is internal navigation, not a source. */
function ownHosts(): string[] {
  let host = "";
  try {
    host = new URL(env.appUrl).host.toLowerCase();
  } catch {
    host = "";
  }
  if (!host) return [];
  return [...new Set([host, host.replace(/^www\./, ""), `www.${host.replace(/^www\./, "")}`])];
}

export type TrackInput = {
  type: "page_view" | "cta_click" | "form_start" | "form_submit" | "portal_view" | "portal_action";
  path?: string;
  locale?: string;
  segment?: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
};

export function visitorHash(ip: string, ua: string): string {
  // The Yerevan calendar day, the same bucket the charts group by: a visitor active at 01:00 local
  // time is one visitor for that day, not two.
  const day = yerevanDay(new Date().toISOString());
  return sha256(`${env.secret}|${day}|${ip}|${ua}`).slice(0, 24);
}

export function track(input: TrackInput) {
  try {
    getDb()
      .insert(schema.analyticsEvents)
      .values({
        type: input.type,
        path: input.path?.slice(0, 300) ?? null,
        locale: input.locale ?? null,
        segment: input.segment ?? null,
        referrer: input.referrer?.slice(0, 300) ?? null,
        utmSource: input.utm?.source?.slice(0, 100) ?? null,
        utmMedium: input.utm?.medium?.slice(0, 100) ?? null,
        utmCampaign: input.utm?.campaign?.slice(0, 100) ?? null,
        visitorHash: visitorHash(input.ip ?? "", input.userAgent ?? ""),
        meta: input.meta ? JSON.stringify(input.meta).slice(0, 1000) : null,
      })
      .run();
  } catch (e) {
    console.warn("[analytics] track failed", (e as Error).message);
  }
}

/**
 * Everything the dashboard and the analytics page show for the last `days` **Yerevan calendar days**,
 * today included. `byDay` always has exactly `days` consecutive entries: a day without traffic is a
 * zero, not a gap the chart would draw straight through.
 */
export function summary(days = 30) {
  const db = getDb();
  const since = yerevanDayStart(days - 1);
  const e = schema.analyticsEvents;
  /** The calendar day a row belongs to, in Yerevan time (fixed UTC+4). */
  const day = sql<string>`strftime('%Y-%m-%d', ${e.createdAt}, '+4 hours')`;
  const internal = ownHosts();
  const totals = db
    .select({ type: e.type, count: sql<number>`count(*)`, visitors: sql<number>`count(distinct ${e.visitorHash})` })
    .from(e)
    .where(gte(e.createdAt, since))
    .groupBy(e.type)
    .all();
  const rows = db
    .select({ day, views: sql<number>`sum(case when ${e.type}='page_view' then 1 else 0 end)`, visitors: sql<number>`count(distinct case when ${e.type}='page_view' then ${e.visitorHash} end)`, leads: sql<number>`sum(case when ${e.type}='form_submit' then 1 else 0 end)` })
    .from(e)
    .where(gte(e.createdAt, since))
    .groupBy(day)
    .orderBy(day)
    .all();
  const byDayRows = new Map(rows.map((r) => [r.day, r]));
  const byDay = dayKeys(days).map((key) => byDayRows.get(key) ?? { day: key, views: 0, visitors: 0, leads: 0 });
  const topPages = db
    .select({ path: e.path, count: sql<number>`count(*)` })
    .from(e)
    .where(and(gte(e.createdAt, since), sql`${e.type}='page_view'`))
    .groupBy(e.path)
    .orderBy(sql`count(*) desc`)
    .limit(10)
    .all();
  // A referrer that is this site itself is internal navigation: it counts as direct, not as a source.
  // (New rows no longer store it at all — see the /api/track route — this also covers older rows.)
  const external = internal.length ? sql`case when lower(${e.referrer}) in (${sql.join(internal.map((h) => sql`${h}`), sql`, `)}) then null else ${e.referrer} end` : sql`${e.referrer}`;
  const sources = db
    .select({ source: sql<string>`coalesce(nullif(${e.utmSource},''), case when ${external} is null or ${external}='' then 'direct' else ${external} end)`, count: sql<number>`count(*)` })
    .from(e)
    .where(and(gte(e.createdAt, since), sql`${e.type}='page_view'`))
    .groupBy(sql`1`)
    .orderBy(sql`count(*) desc`)
    .limit(8)
    .all();
  const locales = db
    .select({ locale: e.locale, count: sql<number>`count(*)` })
    .from(e)
    .where(and(gte(e.createdAt, since), sql`${e.type}='page_view'`))
    .groupBy(e.locale)
    .all();
  const segments = db
    .select({ segment: e.segment, count: sql<number>`count(*)` })
    .from(e)
    .where(and(gte(e.createdAt, since), sql`${e.type} in ('form_submit','cta_click')`))
    .groupBy(e.segment)
    .all();
  return { totals, byDay, topPages, sources, locales, segments };
}
