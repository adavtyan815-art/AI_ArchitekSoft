"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { COMPANY_TYPES, LEAD_SOURCES, LEAD_STATUSES, convertLead, createLead, logActivity } from "@/lib/crm";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/utils";
import { fnum, fopt, fstr, ftags } from "@/lib/form";
import { actionStrings } from "@/lib/admin-log";
import { labelFor, local } from "@/lib/i18n/admin";

const SEGMENTS = ["b2b", "b2c"] as const;
const LANGS = ["hy", "ru", "en"] as const;
const CHANNELS = ["", "phone", "telegram", "whatsapp", "email"] as const;
const SERVICES = ["", "kitchenpro", "showroom", "ar", "cnc", "real_estate", "custom", "other"] as const;
const ROOMS = ["", "kitchen", "wardrobe", "living", "bathroom", "office", "apartment", "other"] as const;
const CLIENT_STATUSES = ["lead", "active", "vip", "inactive"] as const;
const COMPANY_STATUSES = ["prospect", "active", "partner", "inactive"] as const;
const ACTIVITY_TYPES = ["note", "call", "meeting", "email", "message", "status", "system"] as const;

function revalidateEntity(type: string, id: string) {
  const map: Record<string, string> = { lead: "/admin/leads", client: "/admin/clients", company: "/admin/companies", project: "/admin/projects" };
  const base = map[type];
  if (base) {
    revalidatePath(base);
    revalidatePath(`${base}/${id}`);
  }
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
const activitySchema = z.object({ entityType: z.enum(["lead", "client", "company", "project", "post"]), entityId: z.string().min(1), type: z.enum(ACTIVITY_TYPES), content: z.string().min(1).max(4000) });

export async function addActivityAction(formData: FormData) {
  const user = await requireUser();
  const a = activitySchema.parse({ entityType: fstr(formData, "entityType"), entityId: fstr(formData, "entityId"), type: fstr(formData, "type") || "note", content: fstr(formData, "content") });
  logActivity(a.entityType, a.entityId, a.content, a.type, user.id);
  revalidateEntity(a.entityType, a.entityId);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
const leadFields = {
  segment: z.enum(SEGMENTS),
  name: z.string().min(1).max(120),
  companyName: z.string().max(120).nullable(),
  phone: z.string().max(40).nullable(),
  email: z.string().max(120).nullable(),
  telegram: z.string().max(60).nullable(),
  preferredChannel: z.enum(CHANNELS),
  language: z.enum(LANGS),
  service: z.enum(SERVICES),
  roomType: z.enum(ROOMS),
  budget: z.string().max(80).nullable(),
  message: z.string().max(4000).nullable(),
  estimatedValue: z.number().nullable(),
  currency: z.string().max(6),
  assignedTo: z.string().max(80).nullable(),
};

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
    service: fstr(fd, "service"),
    roomType: fstr(fd, "roomType"),
    budget: fopt(fd, "budget", 80),
    message: fopt(fd, "message"),
    estimatedValue: fnum(fd, "estimatedValue"),
    currency: fstr(fd, "currency", 6) || "AMD",
    assignedTo: fopt(fd, "assignedTo", 80),
  };
}

export async function createLeadAction(formData: FormData) {
  const user = await requireUser();
  const data = z.object({ ...leadFields, source: z.enum(LEAD_SOURCES) }).parse({ ...readLeadFields(formData), source: fstr(formData, "source") || "phone" });
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
    source: data.source,
  });
  getDb().update(schema.leads).set({ estimatedValue: data.estimatedValue, currency: data.currency, assignedTo: data.assignedTo }).where(eq(schema.leads.id, lead.id)).run();
  const { L } = await actionStrings();
  logActivity("lead", lead.id, L.addedManually(user.name), "system", user.id);
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${lead.id}`);
}

export async function updateLeadAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const data = z.object(leadFields).parse(readLeadFields(formData));
  const db = getDb();
  const { L } = await actionStrings();
  const before = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!before) throw new Error(L.leadNotFound);
  db.update(schema.leads)
    .set({ ...data, preferredChannel: data.preferredChannel || null, service: data.service || null, roomType: data.roomType || null, updatedAt: nowIso() })
    .where(eq(schema.leads.id, id))
    .run();
  if (before.estimatedValue !== data.estimatedValue) logActivity("lead", id, L.estimatedValue(`${data.estimatedValue ?? "—"} ${data.currency}`), "system", user.id);
  revalidateEntity("lead", id);
}

export async function updateLeadStatusAction(formData: FormData) {
  const user = await requireUser();
  const { id, status } = z.object({ id: z.string().min(1), status: z.enum(LEAD_STATUSES) }).parse({ id: fstr(formData, "id"), status: fstr(formData, "status") });
  const db = getDb();
  const { t, L } = await actionStrings();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) throw new Error(L.leadNotFound);
  if (lead.status !== status) {
    db.update(schema.leads).set({ status, updatedAt: nowIso() }).where(eq(schema.leads.id, id)).run();
    logActivity("lead", id, L.statusChange(labelFor(t, "leadStatus", lead.status), labelFor(t, "leadStatus", status)), "status", user.id);
  }
  revalidateEntity("lead", id);
}

export async function markLeadLostAction(formData: FormData) {
  const user = await requireUser();
  const { id, reason } = z.object({ id: z.string().min(1), reason: z.string().max(500) }).parse({ id: fstr(formData, "id"), reason: fstr(formData, "reason", 500) });
  const db = getDb();
  const { L } = await actionStrings();
  db.update(schema.leads).set({ status: "lost", lostReason: reason || null, updatedAt: nowIso() }).where(eq(schema.leads.id, id)).run();
  logActivity("lead", id, L.markedLost(reason), "status", user.id);
  revalidateEntity("lead", id);
}

export async function convertLeadAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const projectType = fopt(formData, "projectType", 40) ?? undefined;
  const { t, locale } = await actionStrings();
  const lead = getDb().select({ name: schema.leads.name, companyName: schema.leads.companyName, roomType: schema.leads.roomType }).from(schema.leads).where(eq(schema.leads.id, id)).get();
  const roomLabel = labelFor(t, "rooms", projectType || lead?.roomType || "kitchen");
  const title = fopt(formData, "title", 160) ?? (lead ? `${lead.companyName || lead.name} — ${roomLabel}` : undefined);
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
    locale
  );
  const r = convertLead(id, { userId: user.id, projectType, title, messages });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/companies");
  redirect(`/admin/projects/${r.project.id}`);
}

export async function deleteLeadAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  getDb().delete(schema.leads).where(eq(schema.leads.id, id)).run();
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

// ---------------------------------------------------------------------------
// Clients (individuals + company contacts)
// ---------------------------------------------------------------------------
const clientSchema = z.object({
  kind: z.enum(["individual", "contact"]),
  companyId: z.string().nullable(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).nullable(),
  position: z.string().max(80).nullable(),
  phone: z.string().max(40).nullable(),
  email: z.string().max(120).nullable(),
  telegram: z.string().max(60).nullable(),
  whatsapp: z.string().max(40).nullable(),
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
  return clientSchema.parse({
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

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const data = readClient(formData);
  const id = newId("cl");
  getDb().insert(schema.clients).values({ id, ...data }).run();
  const { L } = await actionStrings();
  logActivity("client", id, L.createdBy(user.name), "system", user.id);
  if (data.companyId) logActivity("company", data.companyId, L.contactAdded(`${data.firstName} ${data.lastName ?? ""}`.trim()), "system", user.id);
  revalidatePath("/admin/clients");
  if (data.companyId) revalidatePath(`/admin/companies/${data.companyId}`);
  const returnTo = fstr(formData, "returnTo", 200);
  redirect(returnTo.startsWith("/admin") ? returnTo : `/admin/clients/${id}`);
}

export async function updateClientAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const data = readClient(formData);
  const db = getDb();
  const { t, L } = await actionStrings();
  const before = db.select().from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (!before) throw new Error(L.clientNotFound);
  db.update(schema.clients).set({ ...data, updatedAt: nowIso() }).where(eq(schema.clients.id, id)).run();
  if (before.status !== data.status) logActivity("client", id, L.statusChange(labelFor(t, "clientStatus", before.status), labelFor(t, "clientStatus", data.status)), "status", user.id);
  revalidateEntity("client", id);
}

export async function deleteClientAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  getDb().delete(schema.clients).where(eq(schema.clients.id, id)).run();
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------
const companySchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(COMPANY_TYPES),
  website: z.string().max(200).nullable(),
  phone: z.string().max(40).nullable(),
  email: z.string().max(120).nullable(),
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
  return companySchema.parse({
    name: fstr(fd, "name", 120),
    type: fstr(fd, "type") || "manufacturer",
    website: fopt(fd, "website", 200),
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

export async function createCompanyAction(formData: FormData) {
  const user = await requireUser();
  const data = readCompany(formData);
  const id = newId("co");
  getDb().insert(schema.companies).values({ id, ...data }).run();
  const { L } = await actionStrings();
  logActivity("company", id, L.createdBy(user.name), "system", user.id);
  revalidatePath("/admin/companies");
  redirect(`/admin/companies/${id}`);
}

export async function updateCompanyAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const data = readCompany(formData);
  const db = getDb();
  const { t, L } = await actionStrings();
  const before = db.select().from(schema.companies).where(eq(schema.companies.id, id)).get();
  if (!before) throw new Error(L.companyNotFound);
  db.update(schema.companies).set({ ...data, updatedAt: nowIso() }).where(eq(schema.companies.id, id)).run();
  if (before.status !== data.status) logActivity("company", id, L.statusChange(labelFor(t, "companyStatus", before.status), labelFor(t, "companyStatus", data.status)), "status", user.id);
  revalidateEntity("company", id);
}

export async function deleteCompanyAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  getDb().delete(schema.companies).where(eq(schema.companies.id, id)).run();
  revalidatePath("/admin/companies");
  redirect("/admin/companies");
}
