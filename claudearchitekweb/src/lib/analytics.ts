/**
 * First-party, cookie-free analytics. A visitor hash = sha256(secret + day + ip + ua)
 * rotates daily, so nobody can be tracked across days. No third-party scripts.
 */
import { and, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { sha256 } from "./ids";

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
  const day = new Date().toISOString().slice(0, 10);
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

export function summary(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const e = schema.analyticsEvents;
  const totals = db
    .select({ type: e.type, count: sql<number>`count(*)`, visitors: sql<number>`count(distinct ${e.visitorHash})` })
    .from(e)
    .where(gte(e.createdAt, since))
    .groupBy(e.type)
    .all();
  const byDay = db
    .select({ day: sql<string>`substr(${e.createdAt},1,10)`, views: sql<number>`sum(case when ${e.type}='page_view' then 1 else 0 end)`, visitors: sql<number>`count(distinct case when ${e.type}='page_view' then ${e.visitorHash} end)`, leads: sql<number>`sum(case when ${e.type}='form_submit' then 1 else 0 end)` })
    .from(e)
    .where(gte(e.createdAt, since))
    .groupBy(sql`substr(${e.createdAt},1,10)`)
    .orderBy(sql`substr(${e.createdAt},1,10)`)
    .all();
  const topPages = db
    .select({ path: e.path, count: sql<number>`count(*)` })
    .from(e)
    .where(and(gte(e.createdAt, since), sql`${e.type}='page_view'`))
    .groupBy(e.path)
    .orderBy(sql`count(*) desc`)
    .limit(10)
    .all();
  const sources = db
    .select({ source: sql<string>`coalesce(nullif(${e.utmSource},''), case when ${e.referrer} is null or ${e.referrer}='' then 'direct' else ${e.referrer} end)`, count: sql<number>`count(*)` })
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
