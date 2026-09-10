"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { fopt, fstr } from "@/lib/form";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  dueAt: z.string().max(40).nullable(),
  priority: z.enum(["low", "normal", "high"]),
  entityType: z.enum(["lead", "client", "company", "project"]).nullable(),
  entityId: z.string().max(40).nullable(),
});

function revalidate(entityType?: string | null, entityId?: string | null) {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  if (entityType && entityId) {
    const map: Record<string, string> = { lead: "/admin/leads", client: "/admin/clients", company: "/admin/companies", project: "/admin/projects" };
    if (map[entityType]) revalidatePath(`${map[entityType]}/${entityId}`);
  }
}

export async function createTaskAction(formData: FormData) {
  await requireUser();
  // "entity" may arrive as "project:id" from a combined select, or as separate fields
  let entityType = fopt(formData, "entityType", 20);
  let entityId = fopt(formData, "entityId", 40);
  const combined = fstr(formData, "entity", 80);
  if (combined.includes(":")) {
    const [t, i] = combined.split(":");
    entityType = t;
    entityId = i;
  }
  const dueRaw = fopt(formData, "dueAt", 40);
  const data = taskSchema.parse({ title: fstr(formData, "title", 200), dueAt: dueRaw ? new Date(dueRaw).toISOString() : null, priority: fstr(formData, "priority") || "normal", entityType, entityId });
  getDb().insert(schema.tasks).values({ id: newId("tsk"), ...data }).run();
  revalidate(data.entityType, data.entityId);
}

export async function toggleTaskAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!t) return;
  db.update(schema.tasks).set({ done: !t.done }).where(eq(schema.tasks.id, id)).run();
  revalidate(t.entityType, t.entityId);
}

export async function deleteTaskAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!t) return;
  db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  revalidate(t.entityType, t.entityId);
}
