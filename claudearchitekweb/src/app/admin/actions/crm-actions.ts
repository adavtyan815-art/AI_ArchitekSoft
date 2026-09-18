"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, getSqlite, schema } from "@/lib/db";
import { COMPANY_TYPES, LEAD_SOURCES, LEAD_STATUSES, convertLead, createLead, logActivity } from "@/lib/crm";
import { deleteAsset } from "@/lib/media";
import { newId } from "@/lib/ids";
import { nowIso, parseJson } from "@/lib/utils";
import { LEAD_ROOMS, LEAD_SERVICES, fnumStrict, fopt, fstr, ftags, isEmail, isPhone, issueMessage, normalizeHttpUrl, withNotice } from "@/lib/form";
import { actionStrings } from "@/lib/admin-log";
import { adminDict, getAdminLocale, labelFor, local } from "@/lib/i18n/admin";

const SEGMENTS = ["b2b", "b2c"] as const;
const LANGS = ["hy", "ru", "en"] as const;
const CHANNELS = ["", "phone", "telegram", "whatsapp", "email"] as const;
const CLIENT_STATUSES = ["lead", "active", "vip", "inactive"] as const;
const COMPANY_STATUSES = ["prospect", "active", "partner", "inactive"] as const;
const ACTIVITY_TYPES = ["note", "call", "meeting", "email", "message", "status", "system"] as const;
const ENTITY_TYPES = ["lead", "client", "company", "project", "post"] as const;

/** Notice wording for this action file (the admin dictionary is hy + en). */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        leadSaved: "Հարցումը պահպանված է։",
        leadDeleted: "Հարցումը ջնջված է։",
        leadDeletedFiles: (n: number) => `Հարցումը ջնջված է՝ ${n} կցված ֆայլի հետ միասին։`,
        statusSaved: "Կարգավիճակը փոխված է։",
        lostSaved: "Հարցումը նշվեց «չստացվեց»։",
        clientSaved: "Հաճախորդը պահպանված է։",
        clientDeleted: "Հաճախորդը ջնջված է։",
        companySaved: "Ընկերությունը պահպանված է։",
        companyDeleted: (n: number) => (n ? `Ընկերությունը ջնջված է։ ${n} կոնտակտ դարձավ անհատ հաճախորդ։` : "Ընկերությունը ջնջված է։"),
        noteAdded: "Գրառումն ավելացվեց։",
        needContact: "Գրիր գոնե մեկ կապ՝ հեռախոս, էլ. փոստ կամ Telegram։",
        notFound: "Գրառումը չի գտնվել։",
        contactLinked: (name: string) => `Կապվեց ընկերությանը՝ ${name}`,
        contactUnlinked: (name: string) => `Անջատվեց ընկերությունից՝ ${name}`,
      },
      en: {
        leadSaved: "Lead saved.",
        leadDeleted: "Lead deleted.",
        leadDeletedFiles: (n: number) => `Lead deleted, together with ${n} uploaded file(s).`,
        statusSaved: "Status updated.",
        lostSaved: "Lead marked as lost.",
        clientSaved: "Client saved.",
        clientDeleted: "Client deleted.",
        companySaved: "Company saved.",
        companyDeleted: (n: number) => (n ? `Company deleted. ${n} contact(s) became individual clients.` : "Company deleted."),
        noteAdded: "Note added.",
        needContact: "Add at least one way to reach them: phone, email or Telegram.",
        notFound: "Record not found.",
        contactLinked: (name: string) => `Linked to company: ${name}`,
        contactUnlinked: (name: string) => `Unlinked from company: ${name}`,
      },
    },
    locale,
  );
  const t = adminDict(locale);
  return { ...words, locale, f: t.crm.form, common: t.common };
}

function revalidateEntity(type: string, id: string) {
  const map: Record<string, string> = { lead: "/admin/leads", client: "/admin/clients", company: "/admin/companies", project: "/admin/projects" };
  const base = map[type];
  if (base) {
    revalidatePath(base);
    revalidatePath(`${base}/${id}`);
  }
  revalidatePath("/admin");
}

function back(path: string, text: string, tone: "ok" | "error" = "ok"): never {
  redirect(withNotice(path, text, tone));
}

/**
 * Tasks and activities carry a polymorphic (entityType, entityId) with no foreign key, so deleting the
 * parent row would leave them behind — counted on the dashboard and listed with no label. Always in the
 * same transaction as the delete itself.
 */
function dropTasksAndActivities(entityType: string, entityId: string) {
  const db = getDb();
  db.delete(schema.tasks).where(and(eq(schema.tasks.entityType, entityType), eq(schema.tasks.entityId, entityId))).run();
  db.delete(schema.activities).where(and(eq(schema.activities.entityType, entityType), eq(schema.activities.entityId, entityId))).run();
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
const activitySchema = z.object({ entityType: z.enum(ENTITY_TYPES), entityId: z.string().min(1), type: z.enum(ACTIVITY_TYPES), content: z.string().min(1).max(4000) });
const ENTITY_BASE: Record<string, string> = { lead: "/admin/leads", client: "/admin/clients", company: "/admin/companies", project: "/admin/projects", post: "/admin/smm" };

/** Where the timeline that posted the note lives — on a project it is a tab, not the page root. */
function entityPath(entityType: string, entityId: string): string {
  const base = ENTITY_BASE[entityType];
  if (!base) return "/admin";
  return entityType === "project" ? `${base}/${entityId}?tab=timeline` : `${base}/${entityId}`;
}

export async function addActivityAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const entityType = fstr(formData, "entityType");
  const entityId = fstr(formData, "entityId");
  const target = entityPath(entityType, entityId);
  const parsed = activitySchema.safeParse({ entityType, entityId, type: fstr(formData, "type") || "note", content: fstr(formData, "content") });
  if (!parsed.success) back(target, issueMessage(parsed.error.issues[0], { content: m.common.note, entityId: m.common.name }, m.locale), "error");
  const a = parsed.data;
  logActivity(a.entityType, a.entityId, a.content, a.type, user.id);
  revalidateEntity(a.entityType, a.entityId);
  back(target, m.noteAdded);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
/**
 * The website wizard and this form must offer exactly the same services and rooms, or saving an
 * untouched form would drop what the visitor picked. `extra` keeps a value that is already stored on
 * the lead (an older key, or one added later) acceptable, so a save never nulls it either.
 */
function leadSchema(extra: { service?: string | null; roomType?: string | null } = {}) {
  const services = new Set<string>(["", ...LEAD_SERVICES, ...(extra.service ? [extra.service] : [])]);
  const rooms = new Set<string>(["", ...LEAD_ROOMS, ...(extra.roomType ? [extra.roomType] : [])]);
  return z
    .object({
      segment: z.enum(SEGMENTS),
      name: z.string().min(1).max(120),
      companyName: z.string().max(120).nullable(),
      phone: z
        .string()
        .max(40)
        .nullable()
        .refine((v) => !v || isPhone(v), { message: "phone" }),
      email: z
        .string()
        .max(120)
        .nullable()
        .refine((v) => !v || isEmail(v), { message: "email" }),
      telegram: z.string().max(60).nullable(),
      preferredChannel: z.enum(CHANNELS),
      language: z.enum(LANGS),
      service: z.string().max(40).refine((v) => services.has(v), { message: "invalid" }),
      roomType: z.string().max(40).refine((v) => rooms.has(v), { message: "invalid" }),
      budget: z.string().max(80).nullable(),
      message: z.string().max(4000).nullable(),
      estimatedValue: z.number().min(0).max(1_000_000_000).nullable(),
      currency: z.string().max(6),
      assignedTo: z.string().max(80).nullable(),
    })
    // the same rule the public /api/leads uses: a lead nobody can call back is not a lead
    .refine((v) => !!(v.phone || v.email || v.telegram), { message: "NEED_CONTACT", path: ["phone"] });
}

function readLeadFields(fd: FormData) {
  return {
    segment: fstr(fd, "segment") || "b2c",
    name: fstr(fd, "name", 120),
    companyName: fopt(fd, "companyName", 120),
    phone: fopt(fd, "phone", 40),
    email: fopt(fd, "email", 120),
    telegram: fopt(fd, "telegram", 60),
    preferredChannel: fstr(fd, "preferredChannel"),
    language: fstr(fd, "language") || "hy",
    service: fstr(fd, "service", 40),
    roomType: fstr(fd, "roomType", 40),
    budget: fopt(fd, "budget", 80),
    message: fopt(fd, "message"),
    estimatedValue: fnumStrict(fd, "estimatedValue"),
    currency: fstr(fd, "currency", 6) || "AMD",
    assignedTo: fopt(fd, "assignedTo", 80),
  };
}

function leadLabels(f: Awaited<ReturnType<typeof M>>["f"]) {
  return { name: f.name, phone: f.phone, email: f.email, telegram: f.telegram, companyName: f.companyName, budget: f.budget, estimatedValue: f.estimatedValue, message: f.message, assignedTo: f.assignedTo, service: f.service, roomType: f.room, currency: f.currency };
}

export async function createLeadAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = leadSchema().safeParse(readLeadFields(formData));
  if (!parsed.success) back("/admin/leads/new", issueMessage(parsed.error.issues[0], leadLabels(m.f), m.locale, { NEED_CONTACT: m.needContact }), "error");
  const data = parsed.data;
  const sourceParsed = z.enum(LEAD_SOURCES).safeParse(fstr(formData, "source") || "phone");
  const source = sourceParsed.success ? sourceParsed.data : "phone";
  const lead = createLead({
    segment: data.segment,
    name: data.name,
    companyName: data.companyName ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    telegram: data.telegram ?? undefined,
    preferredChannel: data.preferredChannel || undefined,
    language: data.language,
    service: data.service || undefined,
    roomType: data.roomType || undefined,
    budget: data.budget ?? undefined,
    message: data.message ?? undefined,
    source,
  });
  getDb().update(schema.leads).set({ estimatedValue: data.estimatedValue, currency: data.currency, assignedTo: data.assignedTo }).where(eq(schema.leads.id, lead.id)).run();
  const { L } = await actionStrings();
  logActivity("lead", lead.id, L.addedManually(user.name), "system", user.id);
  revalidatePath("/admin/leads");
  back(`/admin/leads/${lead.id}`, m.leadSaved);
}

export async function updateLeadAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const { L } = await actionStrings();
  const before = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!before) back("/admin/leads", L.leadNotFound, "error");
  const parsed = leadSchema(before).safeParse(readLeadFields(formData));
  if (!parsed.success) back(`/admin/leads/${id}`, issueMessage(parsed.error.issues[0], leadLabels(m.f), m.locale, { NEED_CONTACT: m.needContact }), "error");
  const data = parsed.data;
  db.update(schema.leads)
    .set({ ...data, preferredChannel: data.preferredChannel || null, service: data.service || null, roomType: data.roomType || null, updatedAt: nowIso() })
    .where(eq(schema.leads.id, id))
    .run();
  if (before.estimatedValue !== data.estimatedValue) logActivity("lead", id, L.estimatedValue(`${data.estimatedValue ?? "—"} ${data.currency}`), "system", user.id);
  if (before.assignedTo !== data.assignedTo) logActivity("lead", id, `${m.f.assignedTo}: ${data.assignedTo || m.common.none}`, "system", user.id);
  revalidateEntity("lead", id);
  back(`/admin/leads/${id}`, m.leadSaved);
}

export async function updateLeadStatusAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string().min(1), status: z.enum(LEAD_STATUSES) }).safeParse({ id: fstr(formData, "id"), status: fstr(formData, "status") });
  if (!parsed.success) back("/admin/leads", m.notFound, "error");
  const { id, status } = parsed.data;
  const db = getDb();
  const { t, L } = await actionStrings();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) back("/admin/leads", L.leadNotFound, "error");
  if (lead.status !== status) {
    // Reopening a lost lead must drop the reason, or the detail page keeps showing "chose a competitor" on a live lead.
    db.update(schema.leads)
      .set({ status, lostReason: status === "lost" ? lead.lostReason : null, updatedAt: nowIso() })
      .where(eq(schema.leads.id, id))
      .run();
    logActivity("lead", id, L.statusChange(labelFor(t, "leadStatus", lead.status), labelFor(t, "leadStatus", status)), "status", user.id);
  }
  revalidateEntity("lead", id);
  back(`/admin/leads/${id}`, m.statusSaved);
}

export async function markLeadLostAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string().min(1), reason: z.string().max(500) }).safeParse({ id: fstr(formData, "id"), reason: fstr(formData, "reason", 500) });
  if (!parsed.success) back("/admin/leads", m.notFound, "error");
  const { id, reason } = parsed.data;
  const db = getDb();
  const { L } = await actionStrings();
  const lead = db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) back("/admin/leads", L.leadNotFound, "error");
  db.update(schema.leads).set({ status: "lost", lostReason: reason || null, updatedAt: nowIso() }).where(eq(schema.leads.id, id)).run();
  logActivity("lead", id, L.markedLost(reason), "status", user.id);
  revalidateEntity("lead", id);
  back(`/admin/leads/${id}`, m.lostSaved);
}

export async function convertLeadAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const projectType = fopt(formData, "projectType", 40) ?? undefined;
  const { t, locale, L } = await actionStrings();
  const lead = getDb().select({ name: schema.leads.name, companyName: schema.leads.companyName, roomType: schema.leads.roomType }).from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) back("/admin/leads", L.leadNotFound, "error");
  const roomLabel = labelFor(t, "rooms", projectType || lead.roomType || "kitchen");
  const title = fopt(formData, "title", 160) ?? `${lead.companyName || lead.name} — ${roomLabel}`;
  const messages = local(
    {
      hy: {
        companyFromLead: (n: string) => `Ստեղծվեց «${n}» հարցումից`,
        clientFromLead: "Ստեղծվեց հարցումից",
        converted: (ttl: string) => `Դարձավ նախագիծ՝ ${ttl}`,
        projectFromLead: "Նախագիծը ստեղծվեց հարցումից",
      },
      en: {
        companyFromLead: (n: string) => `Created from lead ${n}`,
        clientFromLead: "Created from lead",
        converted: (ttl: string) => `Converted to project ${ttl}`,
        projectFromLead: "Project created from lead",
      },
    },
    locale,
  );

  // Only the conversion sits inside try/catch: back() redirects by throwing, which must never be caught here.
  let result: ReturnType<typeof convertLead> | null = null;
  let failure = "";
  try {
    result = convertLead(id, { userId: user.id, projectType, title, messages });
  } catch (e) {
    failure = (e as Error).message || m.notFound;
  }
  if (!result) back(`/admin/leads/${id}`, failure, "error");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/companies");
  redirect(`/admin/projects/${result.project.id}`);
}

export async function deleteLeadAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) back("/admin/leads", m.notFound, "error");

  // Files the visitor uploaded on /start belong to this lead only while it is not converted: once the row
  // goes, nothing points at them any more, so they are removed with it (rows, files on disk and derivatives).
  const fileIds = parseJson<string[]>(lead.files, []).filter((v) => typeof v === "string");
  const orphans = fileIds.length
    ? db
        .select({ id: schema.assets.id })
        .from(schema.assets)
        .where(and(inArray(schema.assets.id, fileIds), isNull(schema.assets.projectId)))
        .all()
        .map((a) => a.id)
    : [];
  getSqlite().transaction(() => {
    dropTasksAndActivities("lead", id);
    db.delete(schema.leads).where(eq(schema.leads.id, id)).run();
  })();
  for (const assetId of orphans) deleteAsset(assetId);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/media");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  back("/admin/leads", orphans.length ? m.leadDeletedFiles(orphans.length) : m.leadDeleted);
}

// ---------------------------------------------------------------------------
// Clients (individuals + company contacts)
// ---------------------------------------------------------------------------
const clientSchema = z.object({
  kind: z.enum(["individual", "contact"]),
  companyId: z.string().max(40).nullable(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).nullable(),
  position: z.string().max(80).nullable(),
  phone: z
    .string()
    .max(40)
    .nullable()
    .refine((v) => !v || isPhone(v), { message: "phone" }),
  email: z
    .string()
    .max(120)
    .nullable()
    .refine((v) => !v || isEmail(v), { message: "email" }),
  telegram: z.string().max(60).nullable(),
  whatsapp: z
    .string()
    .max(40)
    .nullable()
    .refine((v) => !v || isPhone(v), { message: "phone" }),
  language: z.enum(LANGS),
  city: z.string().max(80).nullable(),
  address: z.string().max(200).nullable(),
  source: z.string().max(40).nullable(),
  tags: z.string().nullable(),
  notes: z.string().max(4000).nullable(),
  status: z.enum(CLIENT_STATUSES),
});

function readClient(fd: FormData) {
  const companyId = fopt(fd, "companyId", 40);
  return clientSchema.safeParse({
    kind: companyId ? fstr(fd, "kind") || "contact" : "individual",
    companyId,
    firstName: fstr(fd, "firstName", 80),
    lastName: fopt(fd, "lastName", 80),
    position: fopt(fd, "position", 80),
    phone: fopt(fd, "phone", 40),
    email: fopt(fd, "email", 120),
    telegram: fopt(fd, "telegram", 60),
    whatsapp: fopt(fd, "whatsapp", 40),
    language: fstr(fd, "language") || "hy",
    city: fopt(fd, "city", 80),
    address: fopt(fd, "address", 200),
    source: fopt(fd, "source", 40),
    tags: ftags(fd, "tags"),
    notes: fopt(fd, "notes"),
    status: fstr(fd, "status") || "active",
  });
}

function clientLabels(f: Awaited<ReturnType<typeof M>>["f"]) {
  return { firstName: f.firstName, lastName: f.lastName, position: f.position, phone: f.phone, email: f.email, telegram: f.telegram, whatsapp: f.whatsapp, city: f.city, address: f.address, notes: f.notes, tags: f.tags };
}

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const returnTo = fstr(formData, "returnTo", 200);
  const onError = returnTo.startsWith("/admin") ? returnTo : "/admin/clients/new";
  const parsed = readClient(formData);
  if (!parsed.success) back(onError, issueMessage(parsed.error.issues[0], clientLabels(m.f), m.locale), "error");
  const data = parsed.data;
  const id = newId("cl");
  getDb().insert(schema.clients).values({ id, ...data }).run();
  const { L } = await actionStrings();
  logActivity("client", id, L.createdBy(user.name), "system", user.id);
  if (data.companyId) logActivity("company", data.companyId, L.contactAdded(`${data.firstName} ${data.lastName ?? ""}`.trim()), "system", user.id);
  revalidatePath("/admin/clients");
  if (data.companyId) revalidatePath(`/admin/companies/${data.companyId}`);
  back(returnTo.startsWith("/admin") ? returnTo : `/admin/clients/${id}`, m.clientSaved);
}

export async function updateClientAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const { t, L } = await actionStrings();
  const before = db.select().from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (!before) back("/admin/clients", L.clientNotFound, "error");
  const parsed = readClient(formData);
  if (!parsed.success) back(`/admin/clients/${id}`, issueMessage(parsed.error.issues[0], clientLabels(m.f), m.locale), "error");
  const data = parsed.data;
  db.update(schema.clients).set({ ...data, updatedAt: nowIso() }).where(eq(schema.clients.id, id)).run();
  if (before.status !== data.status) logActivity("client", id, L.statusChange(labelFor(t, "clientStatus", before.status), labelFor(t, "clientStatus", data.status)), "status", user.id);
  // Moving a client in or out of a company is a change on the company too — create logs it, so an edit must as well.
  if (before.companyId !== data.companyId) {
    const who = `${data.firstName} ${data.lastName ?? ""}`.trim();
    if (before.companyId) {
      logActivity("company", before.companyId, m.contactUnlinked(who), "system", user.id);
      revalidatePath(`/admin/companies/${before.companyId}`);
    }
    if (data.companyId) {
      logActivity("company", data.companyId, L.contactAdded(who), "system", user.id);
      revalidatePath(`/admin/companies/${data.companyId}`);
    }
    revalidatePath("/admin/companies");
  }
  revalidateEntity("client", id);
  back(`/admin/clients/${id}`, m.clientSaved);
}

export async function deleteClientAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const client = db.select({ id: schema.clients.id, companyId: schema.clients.companyId }).from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (!client) back("/admin/clients", m.notFound, "error");
  getSqlite().transaction(() => {
    dropTasksAndActivities("client", id);
    db.delete(schema.clients).where(eq(schema.clients.id, id)).run();
  })();
  revalidatePath("/admin/clients");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  if (client.companyId) revalidatePath(`/admin/companies/${client.companyId}`);
  back("/admin/clients", m.clientDeleted);
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------
const companySchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(COMPANY_TYPES),
  website: z
    .string()
    .max(200)
    .nullable()
    .refine((v) => v === null || normalizeHttpUrl(v) !== null, { message: "url" }),
  phone: z
    .string()
    .max(40)
    .nullable()
    .refine((v) => !v || isPhone(v), { message: "phone" }),
  email: z
    .string()
    .max(120)
    .nullable()
    .refine((v) => !v || isEmail(v), { message: "email" }),
  city: z.string().max(80).nullable(),
  country: z.string().max(4).nullable(),
  address: z.string().max(200).nullable(),
  taxId: z.string().max(40).nullable(),
  source: z.string().max(40).nullable(),
  tags: z.string().nullable(),
  notes: z.string().max(4000).nullable(),
  status: z.enum(COMPANY_STATUSES),
});

function readCompany(fd: FormData) {
  // "kahuyq.am" is what people paste; stored without a scheme it becomes a relative link inside the admin.
  const websiteRaw = fopt(fd, "website", 200);
  const website = websiteRaw ? (normalizeHttpUrl(websiteRaw) ?? websiteRaw) : null;
  return companySchema.safeParse({
    name: fstr(fd, "name", 120),
    type: fstr(fd, "type") || "manufacturer",
    website,
    phone: fopt(fd, "phone", 40),
    email: fopt(fd, "email", 120),
    city: fopt(fd, "city", 80),
    country: fopt(fd, "country", 4) ?? "AM",
    address: fopt(fd, "address", 200),
    taxId: fopt(fd, "taxId", 40),
    source: fopt(fd, "source", 40),
    tags: ftags(fd, "tags"),
    notes: fopt(fd, "notes"),
    status: fstr(fd, "status") || "active",
  });
}

function companyLabels(f: Awaited<ReturnType<typeof M>>["f"]) {
  return { name: f.companyTitle, website: f.website, phone: f.phone, email: f.email, city: f.city, address: f.address, taxId: f.taxId, notes: f.notes, tags: f.tags, country: f.country };
}

export async function createCompanyAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = readCompany(formData);
  if (!parsed.success) back("/admin/companies/new", issueMessage(parsed.error.issues[0], companyLabels(m.f), m.locale), "error");
  const data = parsed.data;
  const id = newId("co");
  getDb().insert(schema.companies).values({ id, ...data }).run();
  const { L } = await actionStrings();
  logActivity("company", id, L.createdBy(user.name), "system", user.id);
  revalidatePath("/admin/companies");
  back(`/admin/companies/${id}`, m.companySaved);
}

export async function updateCompanyAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const { t, L } = await actionStrings();
  const before = db.select().from(schema.companies).where(eq(schema.companies.id, id)).get();
  if (!before) back("/admin/companies", L.companyNotFound, "error");
  const parsed = readCompany(formData);
  if (!parsed.success) back(`/admin/companies/${id}`, issueMessage(parsed.error.issues[0], companyLabels(m.f), m.locale), "error");
  const data = parsed.data;
  db.update(schema.companies).set({ ...data, updatedAt: nowIso() }).where(eq(schema.companies.id, id)).run();
  if (before.status !== data.status) logActivity("company", id, L.statusChange(labelFor(t, "companyStatus", before.status), labelFor(t, "companyStatus", data.status)), "status", user.id);
  revalidateEntity("company", id);
  back(`/admin/companies/${id}`, m.companySaved);
}

export async function deleteCompanyAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const company = db.select({ id: schema.companies.id }).from(schema.companies).where(eq(schema.companies.id, id)).get();
  if (!company) back("/admin/companies", m.notFound, "error");
  // The contacts stay (the confirm text says so) but they are nobody's contact any more: without this they
  // sit in the Contacts tab with an empty company and vanish from Individuals.
  const contacts = db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.companyId, id)).all();
  getSqlite().transaction(() => {
    if (contacts.length) {
      db.update(schema.clients)
        .set({ kind: "individual", companyId: null, updatedAt: nowIso() })
        .where(eq(schema.clients.companyId, id))
        .run();
    }
    dropTasksAndActivities("company", id);
    db.delete(schema.companies).where(eq(schema.companies.id, id)).run();
  })();
  revalidatePath("/admin/companies");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  back("/admin/companies", m.companyDeleted(contacts.length));
}
