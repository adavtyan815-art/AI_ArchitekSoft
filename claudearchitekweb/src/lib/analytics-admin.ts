/**
 * Admin analytics beyond the site tracker: CRM funnel, revenue, client pages and SMM output.
 * Plain drizzle/sql aggregations over the existing tables — nothing is precomputed.
 */
import { and, desc, eq, gte, sql, type AnyColumn } from "drizzle-orm";
import { getDb, schema } from "./db";

/** Yerevan is UTC+4 all year, so month buckets are cut in local time, not in UTC. */
const YEREVAN_OFFSET_MS = 4 * 3600_000;

/** The last `n` calendar months in Yerevan time, oldest first, as "YYYY-MM". */
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const local = new Date(Date.now() + YEREVAN_OFFSET_MS);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
}

/** "YYYY-MM" of a stored UTC timestamp, read in Yerevan time. */
const yerevanMonth = (col: AnyColumn) => sql<string>`substr(datetime(${col}, '+4 hours'), 1, 7)`;

export type CurrencyTotals = { currency: string; quoted: number; paid: number };

export function adminAnalytics(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const months = lastMonths(6);
  // first instant of the oldest month, Yerevan midnight expressed in UTC
  const monthStart = new Date(`${months[0]}-01T00:00:00+04:00`).toISOString();

  // --- CRM -----------------------------------------------------------------
  const l = schema.leads;
  const leadsByStatus = db.select({ status: l.status, c: sql<number>`count(*)` }).from(l).where(gte(l.createdAt, since)).groupBy(l.status).all();
  const leadsBySegment = db.select({ segment: l.segment, c: sql<number>`count(*)` }).from(l).where(gte(l.createdAt, since)).groupBy(l.segment).all();
  const leadSources = db.select({ source: l.source, c: sql<number>`count(*)` }).from(l).where(gte(l.createdAt, since)).groupBy(l.source).orderBy(sql`count(*) desc`).all();
  const leadsTotal = leadsByStatus.reduce((s, r) => s + r.c, 0);
  const leadsWon = leadsByStatus.find((r) => r.status === "won")?.c ?? 0;
  const leadsLost = leadsByStatus.find((r) => r.status === "lost")?.c ?? 0;
  const leadsAllTime = db.select({ total: sql<number>`count(*)`, won: sql<number>`sum(case when status='won' then 1 else 0 end)` }).from(l).get() ?? { total: 0, won: 0 };

  const p = schema.projects;
  const projectsByType = db.select({ type: p.type, c: sql<number>`count(*)` }).from(p).groupBy(p.type).orderBy(sql`count(*) desc`).all();
  const projectsByStage = db.select({ stage: p.stage, c: sql<number>`count(*)` }).from(p).where(eq(p.status, "active")).groupBy(p.stage).all();

  // Money is never added across currencies: totals come back one row per currency (all time).
  const revenueTotals: CurrencyTotals[] = db
    .select({ currency: p.currency, quoted: sql<number>`coalesce(sum(${p.quoteAmount}),0)`, paid: sql<number>`coalesce(sum(${p.paidAmount}),0)` })
    .from(p)
    .groupBy(p.currency)
    .all()
    .filter((r) => r.quoted || r.paid);
  // The chart has one money axis, so it shows the main currency only: AMD when it is used, else the largest.
  const revenueCurrency = revenueTotals.find((r) => r.currency === "AMD")?.currency ?? [...revenueTotals].sort((a, b) => b.quoted + b.paid - (a.quoted + a.paid))[0]?.currency ?? "AMD";
  const otherCurrencies = revenueTotals.filter((r) => r.currency !== revenueCurrency).map((r) => r.currency);
  // There is no payment date in the data, so amounts are attributed to the month the project was started.
  const revenueRaw = db
    .select({ month: yerevanMonth(p.createdAt), quoted: sql<number>`coalesce(sum(${p.quoteAmount}),0)`, paid: sql<number>`coalesce(sum(${p.paidAmount}),0)`, c: sql<number>`count(*)` })
    .from(p)
    .where(and(gte(p.createdAt, monthStart), eq(p.currency, revenueCurrency)))
    .groupBy(yerevanMonth(p.createdAt))
    .all();
  const revenueByMonth = months.map((m) => {
    const r = revenueRaw.find((x) => x.month === m);
    return { month: m, quoted: r?.quoted ?? 0, paid: r?.paid ?? 0, projects: r?.c ?? 0 };
  });

  // --- Client pages ---------------------------------------------------------
  const sl = schema.shareLinks;
  const se = schema.shareEvents;
  // Ranked by views inside the selected range (not by the all-time counter), so the table follows the range tabs.
  const topLinks = db
    .select({ id: sl.id, slug: sl.slug, title: sl.title, views: sql<number>`count(*)`, lastViewedAt: sl.lastViewedAt, projectId: sl.projectId, projectTitle: p.title, projectCode: p.code })
    .from(se)
    .innerJoin(sl, eq(sl.id, se.shareLinkId))
    .innerJoin(p, eq(p.id, sl.projectId))
    .where(and(eq(se.type, "view"), gte(se.createdAt, since)))
    .groupBy(sl.id)
    .orderBy(desc(sql`count(*)`), desc(sl.lastViewedAt))
    .limit(10)
    .all();
  const linkEvents = db.select({ type: se.type, c: sql<number>`count(*)` }).from(se).where(gte(se.createdAt, since)).groupBy(se.type).all();
  const ev = (t: string) => linkEvents.find((r) => r.type === t)?.c ?? 0;
  const clientPages = {
    links: db.select({ c: sql<number>`count(*)` }).from(sl).get()?.c ?? 0,
    views: ev("view"),
    openLive: ev("open_live"),
    openViewer: ev("open_viewer"),
    openAr: ev("open_ar"),
    downloads: ev("download"),
    questions: ev("question"),
    approvals: ev("approve"),
    changeRequests: ev("change_request"),
  };

  // --- SMM ------------------------------------------------------------------
  const pv = schema.postVariants;
  const postsPerPlatform = db
    .select({ platform: pv.platform, published: sql<number>`sum(case when ${pv.status}='published' then 1 else 0 end)`, simulated: sql<number>`sum(case when ${pv.status}='simulated' then 1 else 0 end)`, failed: sql<number>`sum(case when ${pv.status}='failed' then 1 else 0 end)` })
    .from(pv)
    .groupBy(pv.platform)
    .all();
  const po = schema.posts;
  const postsRaw = db
    .select({ month: yerevanMonth(po.publishedAt), c: sql<number>`count(*)` })
    .from(po)
    .where(sql`${po.publishedAt} is not null and ${po.publishedAt} >= ${monthStart}`)
    .groupBy(yerevanMonth(po.publishedAt))
    .all();
  const createdRaw = db
    .select({ month: yerevanMonth(po.createdAt), c: sql<number>`count(*)` })
    .from(po)
    .where(gte(po.createdAt, monthStart))
    .groupBy(yerevanMonth(po.createdAt))
    .all();
  const postsPerMonth = months.map((m) => ({ month: m, published: postsRaw.find((x) => x.month === m)?.c ?? 0, created: createdRaw.find((x) => x.month === m)?.c ?? 0 }));
  const postsByStatus = db.select({ status: po.status, c: sql<number>`count(*)` }).from(po).groupBy(po.status).all();

  return {
    days,
    months,
    crm: { leadsByStatus, leadsBySegment, leadSources, leadsTotal, leadsWon, leadsLost, conversion: leadsTotal ? Math.round((leadsWon / leadsTotal) * 1000) / 10 : 0, allTime: { total: leadsAllTime.total, won: leadsAllTime.won ?? 0, conversion: leadsAllTime.total ? Math.round(((leadsAllTime.won ?? 0) / leadsAllTime.total) * 1000) / 10 : 0 }, projectsByType, projectsByStage, revenueByMonth, revenueCurrency, otherCurrencies, revenueTotals },
    clientPages: { ...clientPages, topLinks },
    smm: { postsPerPlatform, postsPerMonth, postsByStatus },
  };
}

export type AdminAnalytics = ReturnType<typeof adminAnalytics>;
