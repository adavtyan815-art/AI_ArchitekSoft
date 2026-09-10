/**
 * CRM helpers: leads → clients/companies → projects, activity log, stats.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { nowIso, projectCode, slugify } from "./utils";
import { newId, newToken } from "./ids";
import type { Lead } from "./db/schema";

/** Plain Armenian names for lead sources, used when writing activity-log lines outside a request locale. */
const SOURCE_HY: Record<string, string> = {
  website: "Կայք", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", telegram: "Telegram",
  whatsapp: "WhatsApp", phone: "Զանգ", referral: "Խորհուրդ", youtube: "YouTube", other: "Այլ",
};

export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export const PROJECT_STAGES = ["request", "survey", "design", "configuration", "approval", "production_prep", "production", "installation", "handover", "archived"] as const;
export const PROJECT_TYPES = ["kitchen", "wardrobe", "living", "bedroom", "bathroom", "office", "apartment", "house", "commercial", "other"] as const;
export const COMPANY_TYPES = ["manufacturer", "studio", "retailer", "developer", "architect", "other"] as const;
export const LEAD_SOURCES = ["website", "instagram", "facebook", "linkedin", "telegram", "whatsapp", "phone", "referral", "youtube", "other"] as const;

export function logActivity(entityType: string, entityId: string, content: string, type = "system", userId?: string | null) {
  getDb().insert(schema.activities).values({ entityType, entityId, type, content, userId: userId ?? null }).run();
}

export function nextProjectCode(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const row = db.select({ c: sql<number>`count(*)` }).from(schema.projects).where(sql`code like ${`AT-${year}-%`}`).get();
  let seq = (row?.c ?? 0) + 1;
  while (db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.code, projectCode(seq, year))).get()) seq++;
  return projectCode(seq, year);
}

export type NewLeadInput = {
  segment: "b2b" | "b2c";
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  preferredChannel?: string;
  language?: string;
  service?: string;
  roomType?: string;
  budget?: string;
  message?: string;
  details?: Record<string, unknown>;
  files?: string[];
  utm?: Record<string, string>;
  pagePath?: string;
  source?: string;
};

export function createLead(input: NewLeadInput): Lead {
  const db = getDb();
  const id = newId("lead");
  db.insert(schema.leads)
    .values({
      id,
      segment: input.segment,
      status: "new",
      source: input.source ?? "website",
      name: input.name.trim().slice(0, 120),
      companyName: input.companyName?.trim().slice(0, 120) || null,
      phone: input.phone?.trim().slice(0, 40) || null,
      email: input.email?.trim().slice(0, 120) || null,
      telegram: input.telegram?.trim().slice(0, 60) || null,
      preferredChannel: input.preferredChannel || null,
      language: input.language || "hy",
      service: input.service || null,
      roomType: input.roomType || null,
      budget: input.budget || null,
      message: input.message?.trim().slice(0, 4000) || null,
      details: input.details ? JSON.stringify(input.details) : null,
      files: input.files?.length ? JSON.stringify(input.files) : null,
      utm: input.utm && Object.keys(input.utm).length ? JSON.stringify(input.utm) : null,
      pagePath: input.pagePath || null,
    })
    .run();
  logActivity("lead", id, `Հարցումը ստացվել է՝ ${SOURCE_HY[input.source ?? "website"] ?? (input.source ?? "website")} · ${input.segment === "b2b" ? "Բիզնես" : "Անհատ"}`);
  return db.select().from(schema.leads).where(eq(schema.leads.id, id)).get()!;
}

/** Convert a lead into a client (+ company for B2B) and a project. Idempotent per lead. */
/** Sentences written into the activity log while converting. Callers pass localised versions. */
export type ConvertMessages = {
  companyFromLead: (leadName: string) => string;
  clientFromLead: string;
  converted: (title: string) => string;
  projectFromLead: string;
};

const DEFAULT_CONVERT_MESSAGES: ConvertMessages = {
  companyFromLead: (leadName: string) => `Created from lead ${leadName}`,
  clientFromLead: "Created from lead",
  converted: (title: string) => `Converted to project ${title}`,
  projectFromLead: "Project created from lead",
};

export function convertLead(leadId: string, opts: { userId?: string; projectType?: string; title?: string; messages?: ConvertMessages } = {}) {
  const M = opts.messages ?? DEFAULT_CONVERT_MESSAGES;
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("Lead not found");
  if (lead.projectId) {
    const existing = db.select().from(schema.projects).where(eq(schema.projects.id, lead.projectId)).get();
    if (existing) return { project: existing, clientId: lead.clientId, companyId: lead.companyId, created: false };
  }

  let companyId = lead.companyId ?? null;
  if (lead.segment === "b2b" && lead.companyName && !companyId) {
    const found = db.select().from(schema.companies).where(sql`lower(name) = lower(${lead.companyName})`).get();
    if (found) companyId = found.id;
    else {
      companyId = newId("co");
      const details = lead.details ? (JSON.parse(lead.details) as Record<string, string>) : {};
      db.insert(schema.companies).values({ id: companyId, name: lead.companyName, type: details.companyType || "manufacturer", phone: lead.phone, email: lead.email, source: lead.source, status: "prospect" }).run();
      logActivity("company", companyId, M.companyFromLead(lead.name));
    }
  }

  let clientId = lead.clientId ?? null;
  if (!clientId) {
    const [firstName, ...rest] = lead.name.split(" ");
    const found = lead.phone ? db.select().from(schema.clients).where(eq(schema.clients.phone, lead.phone)).get() : undefined;
    if (found) clientId = found.id;
    else {
      clientId = newId("cl");
      db.insert(schema.clients)
        .values({ id: clientId, kind: companyId ? "contact" : "individual", companyId, firstName, lastName: rest.join(" ") || null, phone: lead.phone, email: lead.email, telegram: lead.telegram, language: lead.language, source: lead.source, status: "active" })
        .run();
      logActivity("client", clientId, M.clientFromLead);
    }
  }

  const projectId = newId("prj");
  const type = opts.projectType || lead.roomType || "kitchen";
  const title = opts.title || `${lead.companyName || lead.name} — ${type}`;
  const details = lead.details ? (JSON.parse(lead.details) as Record<string, unknown>) : {};
  db.insert(schema.projects)
    .values({
      id: projectId,
      code: nextProjectCode(),
      title,
      segment: lead.segment,
      type,
      stage: "request",
      status: "active",
      clientId,
      companyId,
      leadId: lead.id,
      description: lead.message,
      room: details.dims ? JSON.stringify(details.dims) : null,
      materials: (details.style as string) || null,
    })
    .run();
  // attach uploaded files to the project
  const files = lead.files ? (JSON.parse(lead.files) as string[]) : [];
  for (const assetId of files) db.update(schema.assets).set({ projectId, kind: "client_upload" }).where(eq(schema.assets.id, assetId)).run();

  db.update(schema.leads).set({ status: lead.status === "new" || lead.status === "contacted" ? "qualified" : lead.status, clientId, companyId, projectId, updatedAt: nowIso() }).where(eq(schema.leads.id, leadId)).run();
  logActivity("lead", leadId, M.converted(title), "status", opts.userId);
  logActivity("project", projectId, M.projectFromLead, "system", opts.userId);
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get()!;
  return { project, clientId, companyId, created: true };
}

export function createShareLink(projectId: string, opts: { title?: string; message?: string; language?: string; expiresDays?: number | null; passcode?: string | null; showLive?: boolean; showViewer?: boolean; showPdf?: boolean; allowDownload?: boolean; allowFeedback?: boolean }) {
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) throw new Error("Project not found");
  const client = project.clientId ? db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() : null;
  let base = slugify(`${client?.firstName ?? project.title}-${project.type}`) || "project";
  let slug = base;
  let i = 2;
  while (db.select({ id: schema.shareLinks.id }).from(schema.shareLinks).where(eq(schema.shareLinks.slug, slug)).get()) slug = `${base}-${i++}`;
  const id = newId("shl");
  db.insert(schema.shareLinks)
    .values({
      id,
      projectId,
      slug,
      token: newToken(12),
      title: opts.title ?? null,
      message: opts.message ?? null,
      language: opts.language ?? client?.language ?? "hy",
      expiresAt: opts.expiresDays ? new Date(Date.now() + opts.expiresDays * 86400_000).toISOString() : null,
      passcode: opts.passcode || null,
      showLive: opts.showLive ?? true,
      showViewer: opts.showViewer ?? true,
      showPdf: opts.showPdf ?? false,
      allowDownload: opts.allowDownload ?? false,
      allowFeedback: opts.allowFeedback ?? true,
    })
    .run();
  logActivity("project", projectId, `Նոր հաճախորդի էջ՝ /p/${slug}`);
  return db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get()!;
}

export function shareUrl(link: { slug: string; token: string }, base: string) {
  return `${base}/p/${link.slug}?k=${link.token}`;
}

export function dashboardStats() {
  const db = getDb();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const c = (q: { get: () => { c: number } | undefined }) => q.get()?.c ?? 0;
  const leadsNew = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(eq(schema.leads.status, "new")));
  const leads30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(gte(schema.leads.createdAt, since30)));
  const leadsB2b30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(and(gte(schema.leads.createdAt, since30), eq(schema.leads.segment, "b2b"))));
  const leadsWon30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(and(gte(schema.leads.updatedAt, since30), eq(schema.leads.status, "won"))));
  const companies = c(db.select({ c: sql<number>`count(*)` }).from(schema.companies));
  const individuals = c(db.select({ c: sql<number>`count(*)` }).from(schema.clients).where(eq(schema.clients.kind, "individual")));
  const contacts = c(db.select({ c: sql<number>`count(*)` }).from(schema.clients).where(eq(schema.clients.kind, "contact")));
  const projectsActive = c(db.select({ c: sql<number>`count(*)` }).from(schema.projects).where(eq(schema.projects.status, "active")));
  const projectsDone = c(db.select({ c: sql<number>`count(*)` }).from(schema.projects).where(eq(schema.projects.status, "done")));
  const pipelineValue = db.select({ v: sql<number>`coalesce(sum(quote_amount),0)` }).from(schema.projects).where(eq(schema.projects.status, "active")).get()?.v ?? 0;
  const paidValue = db.select({ v: sql<number>`coalesce(sum(paid_amount),0)` }).from(schema.projects).get()?.v ?? 0;
  const assets = c(db.select({ c: sql<number>`count(*)` }).from(schema.assets));
  const links = c(db.select({ c: sql<number>`count(*)` }).from(schema.shareLinks).where(eq(schema.shareLinks.isActive, true)));
  const linkViews30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.shareEvents).where(and(gte(schema.shareEvents.createdAt, since30), eq(schema.shareEvents.type, "view"))));
  const postsAwaiting = c(db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "awaiting_approval")));
  const postsScheduled = c(db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "scheduled")));
  const postsPublished30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(and(gte(schema.posts.publishedAt, since30), sql`status in ('published','partially_published')`)));
  const feedbackOpen = c(db.select({ c: sql<number>`count(*)` }).from(schema.clientFeedback).where(eq(schema.clientFeedback.resolved, false)));
  const tasksOpen = c(db.select({ c: sql<number>`count(*)` }).from(schema.tasks).where(eq(schema.tasks.done, false)));

  const stageRows = db.select({ stage: schema.projects.stage, c: sql<number>`count(*)` }).from(schema.projects).where(eq(schema.projects.status, "active")).groupBy(schema.projects.stage).all();
  const leadStatusRows = db.select({ status: schema.leads.status, segment: schema.leads.segment, c: sql<number>`count(*)` }).from(schema.leads).groupBy(schema.leads.status, schema.leads.segment).all();
  const leadsByDay = db
    .select({ day: sql<string>`substr(created_at,1,10)`, b2b: sql<number>`sum(case when segment='b2b' then 1 else 0 end)`, b2c: sql<number>`sum(case when segment='b2c' then 1 else 0 end)` })
    .from(schema.leads)
    .where(gte(schema.leads.createdAt, since30))
    .groupBy(sql`substr(created_at,1,10)`)
    .orderBy(sql`substr(created_at,1,10)`)
    .all();
  const sourceRows = db.select({ source: schema.leads.source, c: sql<number>`count(*)` }).from(schema.leads).groupBy(schema.leads.source).orderBy(desc(sql`count(*)`)).all();
  const typeRows = db.select({ type: schema.projects.type, c: sql<number>`count(*)` }).from(schema.projects).groupBy(schema.projects.type).orderBy(desc(sql`count(*)`)).all();
  const recentLeads = db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(6).all();
  const recentFeedback = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.resolved, false)).orderBy(desc(schema.clientFeedback.createdAt)).limit(5).all();
  const upcomingPosts = db.select().from(schema.posts).where(sql`status in ('scheduled','awaiting_approval','approved')`).orderBy(schema.posts.scheduledAt).limit(5).all();

  return { leadsNew, leads30, leadsB2b30, leadsWon30, companies, individuals, contacts, projectsActive, projectsDone, pipelineValue, paidValue, assets, links, linkViews30, postsAwaiting, postsScheduled, postsPublished30, feedbackOpen, tasksOpen, stageRows, leadStatusRows, leadsByDay, sourceRows, typeRows, recentLeads, recentFeedback, upcomingPosts };
}
