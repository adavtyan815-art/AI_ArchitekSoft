/**
 * Admin analytics beyond the site tracker: CRM funnel, revenue, client pages and SMM output.
 * Plain drizzle/sql aggregations over the existing tables — nothing is precomputed.
 */
import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
}

export function adminAnalytics(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const months = lastMonths(6);
  const monthStart = `${months[0]}-01`;

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
  const revenueRaw = db
    .select({ month: sql<string>`substr(${p.createdAt},1,7)`, quoted: sql<number>`coalesce(sum(${p.quoteAmount}),0)`, paid: sql<number>`coalesce(sum(${p.paidAmount}),0)`, c: sql<number>`count(*)` })
    .from(p)
    .where(gte(p.createdAt, monthStart))
    .groupBy(sql`substr(${p.createdAt},1,7)`)
    .all();
  const revenueByMonth = months.map((m) => {
    const r = revenueRaw.find((x) => x.month === m);
    return { month: m, quoted: r?.quoted ?? 0, paid: r?.paid ?? 0, projects: r?.c ?? 0 };
  });
  const revenueTotals = db.select({ quoted: sql<number>`coalesce(sum(${p.quoteAmount}),0)`, paid: sql<number>`coalesce(sum(${p.paidAmount}),0)` }).from(p).get() ?? { quoted: 0, paid: 0 };

  // --- Client pages ---------------------------------------------------------
  const sl = schema.shareLinks;
  const topLinks = db
    .select({ id: sl.id, slug: sl.slug, title: sl.title, views: sl.viewsCount, lastViewedAt: sl.lastViewedAt, projectId: sl.projectId, projectTitle: p.title, projectCode: p.code })
    .from(sl)
    .innerJoin(p, eq(p.id, sl.projectId))
    .orderBy(desc(sl.viewsCount))
    .limit(10)
    .all();
  const se = schema.shareEvents;
  const linkEvents = db.select({ type: se.type, c: sql<number>`count(*)` }).from(se).where(gte(se.createdAt, since)).groupBy(se.type).all();
  const ev = (t: string) => linkEvents.find((r) => r.type === t)?.c ?? 0;
  const clientPages = { links: db.select({ c: sql<number>`count(*)` }).from(sl).get()?.c ?? 0, views: ev("view"), openLive: ev("open_live"), openViewer: ev("open_viewer"), openAr: ev("open_ar"), downloads: ev("download"), approvals: ev("approve"), changeRequests: ev("change_request") };

  // --- SMM ------------------------------------------------------------------
  const pv = schema.postVariants;
  const postsPerPlatform = db
    .select({ platform: pv.platform, published: sql<number>`sum(case when ${pv.status}='published' then 1 else 0 end)`, simulated: sql<number>`sum(case when ${pv.status}='simulated' then 1 else 0 end)`, failed: sql<number>`sum(case when ${pv.status}='failed' then 1 else 0 end)` })
    .from(pv)
    .groupBy(pv.platform)
    .all();
  const po = schema.posts;
  const postsRaw = db
    .select({ month: sql<string>`substr(${po.publishedAt},1,7)`, c: sql<number>`count(*)` })
    .from(po)
    .where(sql`${po.publishedAt} is not null and ${po.publishedAt} >= ${monthStart}`)
    .groupBy(sql`substr(${po.publishedAt},1,7)`)
    .all();
  const createdRaw = db
    .select({ month: sql<string>`substr(${po.createdAt},1,7)`, c: sql<number>`count(*)` })
    .from(po)
    .where(gte(po.createdAt, monthStart))
    .groupBy(sql`substr(${po.createdAt},1,7)`)
    .all();
  const postsPerMonth = months.map((m) => ({ month: m, published: postsRaw.find((x) => x.month === m)?.c ?? 0, created: createdRaw.find((x) => x.month === m)?.c ?? 0 }));
  const postsByStatus = db.select({ status: po.status, c: sql<number>`count(*)` }).from(po).groupBy(po.status).all();

  return {
    days,
    months,
    crm: { leadsByStatus, leadsBySegment, leadSources, leadsTotal, leadsWon, leadsLost, conversion: leadsTotal ? Math.round((leadsWon / leadsTotal) * 1000) / 10 : 0, allTime: { total: leadsAllTime.total, won: leadsAllTime.won ?? 0, conversion: leadsAllTime.total ? Math.round(((leadsAllTime.won ?? 0) / leadsAllTime.total) * 1000) / 10 : 0 }, projectsByType, projectsByStage, revenueByMonth, revenueTotals },
    clientPages: { ...clientPages, topLinks },
    smm: { postsPerPlatform, postsPerMonth, postsByStatus },
  };
}

export type AdminAnalytics = ReturnType<typeof adminAnalytics>;
