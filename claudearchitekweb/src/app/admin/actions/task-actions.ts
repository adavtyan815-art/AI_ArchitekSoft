"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";
import { fopt, freturn, fstr, issueMessage, withNotice, yerevanEndOfDayIso } from "@/lib/form";

const ENTITY_TYPES = ["lead", "client", "company", "project"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  // a calendar day; stored as the last second of that day in Yerevan, so a task is overdue only after its due day ends
  dueAt: z.string().max(40).nullable(),
  priority: z.enum(["low", "normal", "high"]),
  entityType: z.enum(ENTITY_TYPES).nullable(),
  entityId: z.string().max(40).nullable(),
});

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: { added: "Առաջադրանքն ավելացվեց։", deleted: "Առաջադրանքը ջնջվեց։", linkGone: "Կապվող գրառումը չի գտնվել. առաջադրանքը չի ավելացվել։" },
      en: { added: "Task added.", deleted: "Task deleted.", linkGone: "The linked record was not found, so the task was not added." },
    },
    locale,
  );
  return { ...words, locale, labels: adminDict(locale).tasks };
}

const ENTITY_BASE: Record<EntityType, string> = { lead: "/admin/leads", client: "/admin/clients", company: "/admin/companies", project: "/admin/projects" };

function revalidate(entityType?: string | null, entityId?: string | null) {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  if (entityType && entityId && entityType in ENTITY_BASE) revalidatePath(`${ENTITY_BASE[entityType as EntityType]}/${entityId}`);
}

function entityExists(type: EntityType, id: string): boolean {
  const db = getDb();
  if (type === "lead") return !!db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (type === "client") return !!db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (type === "company") return !!db.select({ id: schema.companies.id }).from(schema.companies).where(eq(schema.companies.id, id)).get();
  return !!db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, id)).get();
}

/**
 * The tasks page is the default place to land. A task form that lives on a lead / client / company / project page
 * sends `returnTo` (an /admin path) and comes back to that page instead.
 */
export async function createTaskAction(formData: FormData) {
  await requireUser();
  const target = freturn(formData) ?? "/admin/tasks";
  const m = await M();
  const fail: (text: string) => never = (text) => redirect(withNotice(target, text, "error"));

  // "entity" may arrive as "project:id" from a combined select, or as separate fields
  let entityType = fopt(formData, "entityType", 20);
  let entityId = fopt(formData, "entityId", 40);
  const combined = fstr(formData, "entity", 80);
  if (combined.includes(":")) {
    const at = combined.indexOf(":");
    entityType = combined.slice(0, at) || null;
    entityId = combined.slice(at + 1) || null;
  }
  if (!entityType || !entityId) entityType = entityId = null; // half a link is no link

  const dueRaw = fopt(formData, "dueAt", 40);
  const dueAt = dueRaw ? yerevanEndOfDayIso(dueRaw) : null;
  const labels = { title: m.labels.titleLabel, dueAt: m.labels.due, priority: m.labels.priority, entityType: m.labels.linkedTo, entityId: m.labels.linkedTo };
  if (dueRaw && !dueAt) fail(issueMessage({ code: "custom", message: "date", path: ["dueAt"] }, labels, m.locale));

  const parsed = taskSchema.safeParse({ title: fstr(formData, "title", 4000), dueAt, priority: fstr(formData, "priority") || "normal", entityType, entityId });
  if (!parsed.success) fail(issueMessage(parsed.error.issues[0], labels, m.locale));
  const data = parsed.data;
  if (data.entityType && data.entityId && !entityExists(data.entityType, data.entityId)) fail(m.linkGone);

  getDb().insert(schema.tasks).values({ id: newId("tsk"), ...data }).run();
  revalidate(data.entityType, data.entityId);
  redirect(withNotice(target, m.added));
}

export async function toggleTaskAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!t) return;
  db.update(schema.tasks).set({ done: !t.done }).where(eq(schema.tasks.id, id)).run();
  revalidate(t.entityType, t.entityId);
  const target = freturn(formData);
  if (target) redirect(target);
}

export async function deleteTaskAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const target = freturn(formData) ?? "/admin/tasks";
  const db = getDb();
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!t) redirect(target);
  db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  revalidate(t.entityType, t.entityId);
  redirect(withNotice(target, (await M()).deleted));
}
