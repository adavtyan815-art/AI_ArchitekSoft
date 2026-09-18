/**
 * CRM helpers: leads → clients/companies → projects, activity log, stats.
 *
 * Two rules hold everywhere in this file:
 *  - every multi-row write runs inside one SQLite transaction, so a failure never leaves half a lead
 *    converted (an orphan company, a client without a project, files attached to nothing);
 *  - nothing user-visible is written in a fixed language. Sentences come from the caller, and system
 *    events are stored as `{ e, … }` in `activities.meta` and rendered by `formatActivity`.
 */
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb, getSqlite, schema } from "./db";
import { nowIso, parseJson, projectCode, slugify, yerevanYear } from "./utils";
import { yerevanDay } from "./tz";
import { newId, newToken } from "./ids";
import { labelFor, local, type AdminDict, type AdminLocale } from "./i18n/admin";
import type { Lead } from "./db/schema";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export const PROJECT_STAGES = ["request", "survey", "design", "configuration", "approval", "production_prep", "production", "installation", "handover", "archived"] as const;
export const PROJECT_TYPES = ["kitchen", "wardrobe", "living", "bedroom", "bathroom", "office", "apartment", "house", "commercial", "other"] as const;
export const COMPANY_TYPES = ["manufacturer", "studio", "retailer", "developer", "architect", "other"] as const;
export const LEAD_SOURCES = ["website", "instagram", "facebook", "linkedin", "telegram", "whatsapp", "phone", "referral", "youtube", "other"] as const;

const DAY_MS = 86_400_000;
/** Asia/Yerevan is a fixed UTC+4 with no daylight saving, so a plain offset is exact. */
const YEREVAN_OFFSET_MS = 4 * 3_600_000;

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

/**
 * A system timeline entry in a language-independent form. It is stored in `activities.meta`
 * next to a plain-text `content` fallback, and rendered in the reader's language by
 * `formatActivity`, so a record created from the public site does not freeze the admin's language.
 */
export type ActivityEvent =
  | { e: "lead_received"; source: string; segment: string }
  | { e: "portal_feedback"; kind: "approve" | "change_request" | "question"; slug: string; message?: string }
  | { e: "stage_changed"; from: string; to: string; by?: "client" | "admin" };

export function logActivity(entityType: string, entityId: string, content: string, type = "system", userId?: string | null, meta?: ActivityEvent | null) {
  getDb()
    .insert(schema.activities)
    .values({ entityType, entityId, type, content, userId: userId ?? null, meta: meta ? JSON.stringify(meta) : null })
    .run();
}

const timelineText = (locale: AdminLocale) =>
  local(
    {
      hy: {
        leadReceived: (source: string, segment: string) => `Հարցումը ստացվել է՝ ${source} · ${segment}`,
        approve: (slug: string) => `Հաճախորդը հաստատեց նախագիծը «${slug}» էջից`,
        change_request: (slug: string) => `Հաճախորդը փոփոխություն խնդրեց «${slug}» էջից`,
        question: (slug: string) => `Հաճախորդը հարց ուղղեց «${slug}» էջից`,
        stage: (from: string, to: string) => `Փուլ՝ ${from} → ${to}`,
        byClient: "հաճախորդի հաստատումից հետո",
      },
      en: {
        leadReceived: (source: string, segment: string) => `Request received: ${source} · ${segment}`,
        approve: (slug: string) => `Client approved the project from “${slug}”`,
        change_request: (slug: string) => `Client asked for a change from “${slug}”`,
        question: (slug: string) => `Client asked a question from “${slug}”`,
        stage: (from: string, to: string) => `Stage: ${from} → ${to}`,
        byClient: "after the client's approval",
      },
    },
    locale
  );

/**
 * The sentence to show for one timeline row. Rows written with an `ActivityEvent` are rendered in
 * the reader's language; notes and older rows fall back to the stored text unchanged.
 */
export function formatActivity(activity: { content: string; meta?: string | null }, t: AdminDict, locale: AdminLocale): string {
  const meta = parseJson<Partial<ActivityEvent> | null>(activity.meta ?? null, null);
  if (!meta || typeof meta !== "object" || !meta.e) return activity.content;
  const L = timelineText(locale);
  if (meta.e === "lead_received") {
    const m = meta as Extract<ActivityEvent, { e: "lead_received" }>;
    const segments = t.segments as Record<string, string>;
    return L.leadReceived(labelFor(t, "leadSources", m.source), segments[m.segment] ?? m.segment);
  }
  if (meta.e === "portal_feedback") {
    const m = meta as Extract<ActivityEvent, { e: "portal_feedback" }>;
    const head = L[m.kind] ? L[m.kind](m.slug) : activity.content;
    return m.message ? `${head}: ${m.message}` : head;
  }
  if (meta.e === "stage_changed") {
    const m = meta as Extract<ActivityEvent, { e: "stage_changed" }>;
    const line = L.stage(labelFor(t, "projectStage", m.from), labelFor(t, "projectStage", m.to));
    return m.by === "client" ? `${line} (${L.byClient})` : line;
  }
  return activity.content;
}

// ---------------------------------------------------------------------------
// Project codes
// ---------------------------------------------------------------------------

/**
 * Next free project code for the current Yerevan year (a project created at 01:00 on 1 January must
 * not get last year's code on a UTC server).
 *
 * The sequence is a counter row that only ever moves forward, never `count(*)` and never `max(code)`:
 * deleting AT-2026-0005 used to free that code for the next project, so two different projects ended
 * up sharing a code in quotes, file names and old links.
 */
export function nextProjectCode(): string {
  const db = getDb();
  const sqlite = getSqlite();
  const year = yerevanYear();
  // Seed (and repair) the counter from the highest code this year, so an existing database and any
  // manually entered code continue the numbering instead of colliding with it.
  const highest =
    db
      .select({ m: sql<number | null>`max(cast(substr(code, 9) as integer))` })
      .from(schema.projects)
      .where(sql`code like ${`AT-${year}-%`}`)
      .get()?.m ?? 0;
  const bump = sqlite.prepare<[string, number], { value: number }>(
    `INSERT INTO counters (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = max(counters.value + 1, excluded.value) RETURNING value`
  );
  const next = sqlite.prepare<[string], { value: number }>(`UPDATE counters SET value = value + 1 WHERE key = ? RETURNING value`);
  const key = `project_seq:${year}`;
  let seq = bump.get(key, highest + 1)?.value ?? highest + 1;
  while (db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.code, projectCode(seq, year))).get()) {
    seq = next.get(key)?.value ?? seq + 1;
  }
  return projectCode(seq, year);
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

/**
 * Comparison key for a company name. SQLite's `lower()` folds ASCII only, so "Вуд Дримс" and
 * "вуд дримс" (or "Փայտ" / "փայտ") looked like two companies. `toLowerCase` — not the locale-aware
 * variant — keeps the result independent of the server's own locale.
 */
export function companyNameKey(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Comparison key for a phone number: digits only, with the Armenian country code made explicit, so
 * "+374 94 00 00 00", "0 94 000000" and "37494000000" are recognised as the same person.
 */
export function phoneKey(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2); // international prefix
  if (d.startsWith("0")) d = `374${d.slice(1)}`; // national form: 0XX XXXXXX
  else if (d.length === 8) d = `374${d}`; // local number without the trunk prefix
  return d;
}

type Db = ReturnType<typeof getDb>;

/** Existing company with the same name, compared in JS (see `companyNameKey`). */
function findCompanyByName(db: Db, name: string) {
  const key = companyNameKey(name);
  if (!key) return null;
  const rows = db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all();
  return rows.find((r) => companyNameKey(r.name) === key) ?? null;
}

/**
 * Existing person with the same phone number. A company lead matches only people already inside that
 * company: an office number must not attach the project to an unrelated individual, and the other way round.
 */
function findClientByPhone(db: Db, phone: string | null | undefined, companyId: string | null) {
  const key = phoneKey(phone);
  if (!key) return null;
  const rows = db.select({ id: schema.clients.id, phone: schema.clients.phone, companyId: schema.clients.companyId }).from(schema.clients).all();
  return rows.find((r) => phoneKey(r.phone) === key && (companyId ? r.companyId === companyId : !r.companyId)) ?? null;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

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

/** Attachments are claimed at most once, and only from files nobody else owns. */
const MAX_LEAD_FILES = 20;

export function createLead(input: NewLeadInput): Lead {
  const db = getDb();
  const id = newId("lead");
  const source = input.source ?? "website";
  const requested = (input.files ?? []).filter((v): v is string => typeof v === "string" && !!v).slice(0, MAX_LEAD_FILES);

  getSqlite().transaction(() => {
    db.insert(schema.leads)
      .values({
        id,
        segment: input.segment,
        status: "new",
        source,
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
        files: null,
        utm: input.utm && Object.keys(input.utm).length ? JSON.stringify(input.utm) : null,
        pagePath: input.pagePath || null,
      })
      .run();

    // Asset ids are visible in /media URLs, so a submitted id is only accepted when it is still an
    // unclaimed public upload. Anything else (another project's render, another lead's file) is dropped.
    const claimed: string[] = [];
    for (const assetId of requested) {
      const res = db
        .update(schema.assets)
        .set({ leadId: id })
        .where(and(eq(schema.assets.id, assetId), eq(schema.assets.kind, "client_upload"), isNull(schema.assets.projectId), isNull(schema.assets.leadId)))
        .run();
      if (res.changes > 0) claimed.push(assetId);
    }
    if (claimed.length) db.update(schema.leads).set({ files: JSON.stringify(claimed) }).where(eq(schema.leads.id, id)).run();

    logActivity("lead", id, `Request received: ${source} · ${input.segment.toUpperCase()}`, "system", null, { e: "lead_received", source, segment: input.segment });
  })();

  return db.select().from(schema.leads).where(eq(schema.leads.id, id)).get()!;
}

// ---------------------------------------------------------------------------
// Lead → client / company / project
// ---------------------------------------------------------------------------

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

/** `details` is free-form JSON from a public form: read it defensively, never bind it straight to a column. */
function readDetails(raw: string | null): Record<string, unknown> {
  const parsed = parseJson<unknown>(raw, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}

function detailCompanyType(details: Record<string, unknown>): (typeof COMPANY_TYPES)[number] {
  const v = details.companyType;
  return typeof v === "string" && (COMPANY_TYPES as readonly string[]).includes(v) ? (v as (typeof COMPANY_TYPES)[number]) : "manufacturer";
}

/** Convert a lead into a client (+ company for B2B) and a project. Idempotent per lead. */
export function convertLead(leadId: string, opts: { userId?: string; projectType?: string; title?: string; messages?: ConvertMessages } = {}) {
  const M = opts.messages ?? DEFAULT_CONVERT_MESSAGES;
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("Lead not found");
  if (lead.projectId) {
    const existing = db.select().from(schema.projects).where(eq(schema.projects.id, lead.projectId)).get();
    if (existing) return { project: existing, clientId: lead.clientId, companyId: lead.companyId, created: false };
  }

  // One transaction: a failure half-way (a bad `details` value, a unique-code race) must not leave a
  // company and a client behind that the next attempt would duplicate.
  const result = getSqlite().transaction(() => {
    const details = readDetails(lead.details);

    let companyId = lead.companyId ?? null;
    if (lead.segment === "b2b" && lead.companyName && !companyId) {
      const found = findCompanyByName(db, lead.companyName);
      if (found) companyId = found.id;
      else {
        companyId = newId("co");
        db.insert(schema.companies)
          .values({ id: companyId, name: lead.companyName.trim(), type: detailCompanyType(details), phone: lead.phone, email: lead.email, source: lead.source, status: "prospect" })
          .run();
        logActivity("company", companyId, M.companyFromLead(lead.name));
      }
    }

    let clientId = lead.clientId ?? null;
    if (!clientId) {
      const [firstName, ...rest] = lead.name.trim().split(/\s+/);
      const found = findClientByPhone(db, lead.phone, companyId);
      if (found) clientId = found.id;
      else {
        clientId = newId("cl");
        db.insert(schema.clients)
          .values({
            id: clientId,
            kind: companyId ? "contact" : "individual",
            companyId,
            firstName: firstName || lead.name.trim() || "—",
            lastName: rest.join(" ") || null,
            phone: lead.phone,
            email: lead.email,
            telegram: lead.telegram,
            language: lead.language,
            source: lead.source,
            status: "active",
          })
          .run();
        logActivity("client", clientId, M.clientFromLead);
      }
    }

    const projectId = newId("prj");
    const type = opts.projectType || lead.roomType || "kitchen";
    const title = (opts.title || `${lead.companyName || lead.name} — ${type}`).slice(0, 200);
    const dims = details.dims;
    const style = details.style;
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
        // both come from a public form, so anything that is not a plain object / string is dropped
        room: dims && typeof dims === "object" && !Array.isArray(dims) ? JSON.stringify(dims) : null,
        materials: typeof style === "string" ? style.slice(0, 2000) : null,
        // the estimate the lead was qualified with is the natural starting quote
        quoteAmount: lead.estimatedValue ?? null,
        currency: lead.currency || "AMD",
      })
      .run();

    // Attach the files the lead itself claimed on arrival — never an id somebody else owns.
    for (const assetId of parseJson<string[]>(lead.files, [])) {
      db.update(schema.assets)
        .set({ projectId, kind: "client_upload" })
        .where(and(eq(schema.assets.id, assetId), eq(schema.assets.leadId, lead.id), isNull(schema.assets.projectId)))
        .run();
    }

    db.update(schema.leads)
      .set({ status: lead.status === "new" || lead.status === "contacted" ? "qualified" : lead.status, clientId, companyId, projectId, updatedAt: nowIso() })
      .where(eq(schema.leads.id, leadId))
      .run();
    logActivity("lead", leadId, M.converted(title), "status", opts.userId);
    logActivity("project", projectId, M.projectFromLead, "system", opts.userId);
    return { projectId, clientId, companyId };
  })();

  const project = db.select().from(schema.projects).where(eq(schema.projects.id, result.projectId)).get()!;
  return { project, clientId: result.clientId, companyId: result.companyId, created: true };
}

// ---------------------------------------------------------------------------
// Client pages
// ---------------------------------------------------------------------------

/** A link may run for at most ten years; anything else is "no expiry". */
const MAX_LINK_DAYS = 3650;

export function createShareLink(
  projectId: string,
  opts: { title?: string; message?: string; language?: string; expiresDays?: number | null; passcode?: string | null; showLive?: boolean; showViewer?: boolean; showPdf?: boolean; allowDownload?: boolean; allowFeedback?: boolean }
) {
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) throw new Error("Project not found");
  const client = project.clientId ? db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() : null;
  const base = slugify(`${client?.firstName ?? project.title}-${project.type}`) || "project";
  let slug = base;
  let i = 2;
  while (db.select({ id: schema.shareLinks.id }).from(schema.shareLinks).where(eq(schema.shareLinks.slug, slug)).get()) slug = `${base}-${i++}`;
  // A zero or negative number used to create a link that had already expired, so the client only ever
  // saw "this link has expired". Only a positive number sets an expiry date; anything else means none.
  const days = opts.expiresDays && opts.expiresDays >= 1 ? Math.min(Math.round(opts.expiresDays), MAX_LINK_DAYS) : null;
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
      expiresAt: days ? new Date(Date.now() + days * DAY_MS).toISOString() : null,
      passcode: opts.passcode || null,
      showLive: opts.showLive ?? true,
      showViewer: opts.showViewer ?? true,
      showPdf: opts.showPdf ?? false,
      allowDownload: opts.allowDownload ?? false,
      allowFeedback: opts.allowFeedback ?? true,
    })
    .run();
  // The caller logs the localised "client page created" entry; a second, Armenian-only line here
  // used to produce two timeline entries for one link.
  return db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get()!;
}

export function shareUrl(link: { slug: string; token: string }, base: string) {
  return `${base}/p/${link.slug}?k=${link.token}`;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** The last `n` calendar days in Yerevan, oldest first, as "YYYY-MM-DD". */
function lastYerevanDays(n: number, now = new Date()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(yerevanDay(new Date(now.getTime() - i * DAY_MS).toISOString()));
  return days;
}

/** The UTC instant at which a Yerevan calendar day begins. */
function yerevanDayStart(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - YEREVAN_OFFSET_MS).toISOString();
}

export function dashboardStats() {
  const db = getDb();
  const now = new Date();
  // Whole Yerevan days, so "last 30 days" matches the day labels under the chart.
  const days = lastYerevanDays(30, now);
  const since30 = yerevanDayStart(days[0]);
  const nowStamp = now.toISOString();
  const c = (q: { get: () => { c: number } | undefined }) => q.get()?.c ?? 0;
  const leadsNew = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(eq(schema.leads.status, "new")));
  const leads30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(gte(schema.leads.createdAt, since30)));
  const leadsB2b30 = c(db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(and(gte(schema.leads.createdAt, since30), eq(schema.leads.segment, "b2b"))));
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

  // Days are Yerevan days (+4 h), not UTC days: a lead at 02:30 Yerevan belongs to that morning,
  // not to the previous evening. Days without a lead are filled in below so the axis really shows 30 days.
  const dayExpr = sql<string>`strftime('%Y-%m-%d', created_at, '+4 hours')`;
  const counted = db
    .select({ day: dayExpr, b2b: sql<number>`sum(case when segment='b2b' then 1 else 0 end)`, b2c: sql<number>`sum(case when segment='b2c' then 1 else 0 end)` })
    .from(schema.leads)
    .where(gte(schema.leads.createdAt, since30))
    .groupBy(dayExpr)
    .all();
  const byDay = new Map(counted.map((r) => [r.day, r]));
  const leadsByDay = days.map((day) => ({ day, b2b: byDay.get(day)?.b2b ?? 0, b2c: byDay.get(day)?.b2c ?? 0 }));

  // Both breakdowns sit under the "last 30 days" heading, so both are limited to that window.
  const sourceRows = db
    .select({ source: schema.leads.source, c: sql<number>`count(*)` })
    .from(schema.leads)
    .where(gte(schema.leads.createdAt, since30))
    .groupBy(schema.leads.source)
    .orderBy(desc(sql`count(*)`))
    .all();
  /** What the last 30 days of leads asked for (room type). The all-time project mix is `typeRows`. */
  const roomRows = db
    .select({ type: sql<string>`coalesce(room_type, 'other')`, c: sql<number>`count(*)` })
    .from(schema.leads)
    .where(gte(schema.leads.createdAt, since30))
    .groupBy(sql`coalesce(room_type, 'other')`)
    .orderBy(desc(sql`count(*)`))
    .all();
  /** All-time project mix — every status, not a 30-day figure. */
  const typeRows = db.select({ type: schema.projects.type, c: sql<number>`count(*)` }).from(schema.projects).groupBy(schema.projects.type).orderBy(desc(sql`count(*)`)).all();

  const recentLeads = db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(6).all();
  const recentFeedback = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.resolved, false)).orderBy(desc(schema.clientFeedback.createdAt)).limit(5).all();
  // SQLite sorts NULLs first, so undated posts used to push the next scheduled ones out of the panel.
  const upcomingPosts = db
    .select()
    .from(schema.posts)
    .where(sql`status in ('scheduled','awaiting_approval','approved')`)
    .orderBy(sql`scheduled_at is null`, schema.posts.scheduledAt)
    .limit(5)
    .all()
    .map((p) => ({ ...p, overdue: !!p.scheduledAt && p.scheduledAt < nowStamp }));

  return {
    leadsNew,
    leads30,
    leadsB2b30,
    companies,
    individuals,
    contacts,
    projectsActive,
    projectsDone,
    pipelineValue,
    paidValue,
    assets,
    links,
    linkViews30,
    postsAwaiting,
    postsScheduled,
    postsPublished30,
    feedbackOpen,
    tasksOpen,
    stageRows,
    leadStatusRows,
    leadsByDay,
    sourceRows,
    roomRows,
    typeRows,
    recentLeads,
    recentFeedback,
    upcomingPosts,
  };
}
