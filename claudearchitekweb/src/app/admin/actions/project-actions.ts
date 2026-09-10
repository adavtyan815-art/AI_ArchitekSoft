"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES, createShareLink, logActivity, nextProjectCode, shareUrl } from "@/lib/crm";
import { createLiveInstance } from "@/lib/live";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { escapeHtml, sendMessage, telegramEnabled } from "@/lib/telegram";
import { newId, newToken } from "@/lib/ids";
import { nowIso } from "@/lib/utils";
import { fbool, fnum, fopt, fstr } from "@/lib/form";
import { actionStrings } from "@/lib/admin-log";
import { labelFor } from "@/lib/i18n/admin";

const SEGMENTS = ["b2b", "b2c"] as const;
const STATUSES = ["active", "on_hold", "done", "cancelled"] as const;
const LANGS = ["hy", "ru", "en"] as const;

function revalidateProject(id: string) {
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/pages");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const data = z
    .object({ title: z.string().min(1).max(160), segment: z.enum(SEGMENTS), type: z.enum(PROJECT_TYPES), clientId: z.string().nullable(), companyId: z.string().nullable(), description: z.string().max(4000).nullable(), quoteAmount: z.number().nullable(), currency: z.string().max(6) })
    .parse({
      title: fstr(formData, "title", 160),
      segment: fstr(formData, "segment") || "b2c",
      type: fstr(formData, "type") || "kitchen",
      clientId: fopt(formData, "clientId", 40),
      companyId: fopt(formData, "companyId", 40),
      description: fopt(formData, "description"),
      quoteAmount: fnum(formData, "quoteAmount"),
      currency: fstr(formData, "currency", 6) || "AMD",
    });
  const db = getDb();
  const id = newId("prj");
  db.insert(schema.projects).values({ id, code: nextProjectCode(), stage: "request", status: "active", ...data }).run();
  const { L } = await actionStrings();
  logActivity("project", id, L.projectCreatedBy(user.name), "system", user.id);
  if (data.clientId) logActivity("client", data.clientId, L.projectCreated(data.title), "system", user.id);
  if (data.companyId) logActivity("company", data.companyId, L.projectCreated(data.title), "system", user.id);
  revalidateProject(id);
  redirect(`/admin/projects/${id}`);
}

export async function updateProjectAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const { t, L } = await actionStrings();
  const before = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!before) throw new Error(L.projectNotFound);
  const room = { width: fnum(formData, "roomWidth"), depth: fnum(formData, "roomDepth"), height: fnum(formData, "roomHeight"), notes: fopt(formData, "roomNotes", 500) };
  const hasRoom = room.width || room.depth || room.height || room.notes;
  const data = z
    .object({
      title: z.string().min(1).max(160),
      segment: z.enum(SEGMENTS),
      type: z.enum(PROJECT_TYPES),
      status: z.enum(STATUSES),
      clientId: z.string().nullable(),
      companyId: z.string().nullable(),
      description: z.string().max(4000).nullable(),
      materials: z.string().max(2000).nullable(),
      quoteAmount: z.number().nullable(),
      depositAmount: z.number().nullable(),
      paidAmount: z.number().nullable(),
      currency: z.string().max(6),
      deadline: z.string().max(40).nullable(),
      isPortfolio: z.boolean(),
    })
    .parse({
      title: fstr(formData, "title", 160),
      segment: fstr(formData, "segment") || before.segment,
      type: fstr(formData, "type") || before.type,
      status: fstr(formData, "status") || before.status,
      clientId: fopt(formData, "clientId", 40),
      companyId: fopt(formData, "companyId", 40),
      description: fopt(formData, "description"),
      materials: fopt(formData, "materials", 2000),
      quoteAmount: fnum(formData, "quoteAmount"),
      depositAmount: fnum(formData, "depositAmount"),
      paidAmount: fnum(formData, "paidAmount"),
      currency: fstr(formData, "currency", 6) || "AMD",
      deadline: fopt(formData, "deadline", 40),
      isPortfolio: fbool(formData, "isPortfolio"),
    });
  db.update(schema.projects)
    .set({ ...data, room: hasRoom ? JSON.stringify(room) : null, updatedAt: nowIso() })
    .where(eq(schema.projects.id, id))
    .run();
  if (before.status !== data.status) logActivity("project", id, L.statusChange(labelFor(t, "projectStatus", before.status), labelFor(t, "projectStatus", data.status)), "status", user.id);
  if (before.quoteAmount !== data.quoteAmount) logActivity("project", id, L.quoteSet(`${data.quoteAmount ?? "—"} ${data.currency}`), "system", user.id);
  if (before.paidAmount !== data.paidAmount) logActivity("project", id, L.paidSet(`${data.paidAmount ?? "—"} ${data.currency}`), "system", user.id);
  revalidateProject(id);
}

export async function setProjectStageAction(formData: FormData) {
  const user = await requireUser();
  const { id, stage } = z.object({ id: z.string().min(1), stage: z.enum(PROJECT_STAGES) }).parse({ id: fstr(formData, "id"), stage: fstr(formData, "stage") });
  const db = getDb();
  const { t, L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!p) throw new Error(L.projectNotFound);
  if (p.stage !== stage) {
    db.update(schema.projects).set({ stage, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
    logActivity("project", id, L.stageChange(labelFor(t, "projectStage", p.stage), labelFor(t, "projectStage", stage)), "status", user.id);
  }
  revalidateProject(id);
}

export async function deleteProjectAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  db.update(schema.assets).set({ projectId: null }).where(eq(schema.assets.projectId, id)).run();
  db.delete(schema.projects).where(eq(schema.projects.id, id)).run();
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

/** Assign an asset to a project role (cover / sketch / pdf / ar_glb / ar_usdz). Re-assigning the same asset clears it. */
export async function setProjectAssetRoleAction(formData: FormData) {
  const user = await requireUser();
  const { projectId, assetId, role } = z
    .object({ projectId: z.string().min(1), assetId: z.string().min(1), role: z.enum(["cover", "sketch", "pdf", "ar_glb", "ar_usdz"]) })
    .parse({ projectId: fstr(formData, "projectId"), assetId: fstr(formData, "assetId"), role: fstr(formData, "role") });
  const db = getDb();
  const { t, L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!p) throw new Error(L.projectNotFound);
  const col = { cover: "coverAssetId", sketch: "sketchAssetId", pdf: "pdfAssetId", ar_glb: "arGlbAssetId", ar_usdz: "arUsdzAssetId" } as const;
  const key = col[role];
  const next = p[key] === assetId ? null : assetId;
  db.update(schema.projects).set({ [key]: next, updatedAt: nowIso() }).where(eq(schema.projects.id, projectId)).run();
  if (role === "sketch" && next) db.update(schema.assets).set({ kind: "sketch" }).where(eq(schema.assets.id, assetId)).run();
  const roleLabel = t.media.roleLabels[role];
  logActivity("project", projectId, next ? L.roleSet(roleLabel) : L.roleCleared(roleLabel), "system", user.id);
  revalidateProject(projectId);
  revalidatePath("/admin/media");
}

// ---------------------------------------------------------------------------
// Deliverables (Live 3D / viewer)
// ---------------------------------------------------------------------------
export async function updateDeliverablesAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const data = z.object({ liveUrl: z.string().max(500).nullable(), liveInstanceUuid: z.string().max(120).nullable(), viewerUrl: z.string().max(500).nullable() }).parse({ liveUrl: fopt(formData, "liveUrl", 500), liveInstanceUuid: fopt(formData, "liveInstanceUuid", 120), viewerUrl: fopt(formData, "viewerUrl", 500) });
  getDb().update(schema.projects).set({ ...data, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", id, L.deliverablesUpdated, "system", user.id);
  revalidateProject(id);
}

export async function createLiveLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const { L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!p) throw new Error(L.projectNotFound);
  const r = await createLiveInstance({ assignedTo: `${p.code} ${p.title}`.slice(0, 120) });
  db.update(schema.projects).set({ liveUrl: r.url, liveInstanceUuid: r.uuid, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
  logActivity("project", id, r.dryRun ? L.liveCreatedDry(r.url) : L.liveCreated(r.uuid, r.expiresAt.slice(0, 10)), "system", user.id);
  revalidateProject(id);
}

// ---------------------------------------------------------------------------
// Client pages (share links)
// ---------------------------------------------------------------------------
export async function createShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const projectId = fstr(formData, "projectId");
  const data = z
    .object({ title: z.string().max(160).nullable(), message: z.string().max(2000).nullable(), language: z.enum(LANGS), expiresDays: z.number().nullable(), passcode: z.string().max(12).nullable(), showLive: z.boolean(), showViewer: z.boolean(), showPdf: z.boolean(), allowDownload: z.boolean(), allowFeedback: z.boolean() })
    .parse({
      title: fopt(formData, "title", 160),
      message: fopt(formData, "message", 2000),
      language: fstr(formData, "language") || "hy",
      expiresDays: fnum(formData, "expiresDays"),
      passcode: fopt(formData, "passcode", 12),
      showLive: fbool(formData, "showLive"),
      showViewer: fbool(formData, "showViewer"),
      showPdf: fbool(formData, "showPdf"),
      allowDownload: fbool(formData, "allowDownload"),
      allowFeedback: fbool(formData, "allowFeedback"),
    });
  const link = createShareLink(projectId, { ...data, title: data.title ?? undefined, message: data.message ?? undefined });
  const { L } = await actionStrings();
  logActivity("project", projectId, L.pageCreated(user.name, link.language), "system", user.id);
  revalidateProject(projectId);
}

export async function toggleShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) return;
  db.update(schema.shareLinks).set({ isActive: !link.isActive }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageToggled(link.isActive, link.slug), "system", user.id);
  revalidateProject(link.projectId);
}

export async function regenerateShareTokenAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) return;
  db.update(schema.shareLinks).set({ token: newToken(12), sentAt: null, sentVia: null }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageRegenerated(link.slug), "system", user.id);
  revalidateProject(link.projectId);
}

export async function deleteShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) return;
  db.delete(schema.shareLinks).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageDeleted(link.slug), "system", user.id);
  revalidateProject(link.projectId);
}

/** Records how the link was handed to the client (copy / whatsapp / email). */
export async function markShareSentAction(formData: FormData) {
  const user = await requireUser();
  const { id, via } = z.object({ id: z.string().min(1), via: z.enum(["copy", "whatsapp", "email", "telegram"]) }).parse({ id: fstr(formData, "id"), via: fstr(formData, "via") });
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) return;
  db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: via }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageSent(via), "message", user.id);
  revalidateProject(link.projectId);
}

/** Sends the client-page link to the owner's Telegram chat (so it can be forwarded to the client). Dry-run without a bot token. */
export async function sendShareLinkTelegramAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) return;
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, link.projectId)).get();
  if (!project) return;
  const { L } = await actionStrings();
  const chat = getSetting("telegram").adminChatId;
  if (telegramEnabled() && !chat) throw new Error(L.telegramNotConfigured);
  const url = shareUrl(link, env.appUrl);
  const text = [
    `🔗 <b>${escapeHtml(L.telegramCardTitle)}</b> — ${escapeHtml(project.code)} ${escapeHtml(project.title)}`,
    link.title ? escapeHtml(link.title) : "",
    url,
    link.passcode ? `${escapeHtml(L.telegramPasscode)}: <code>${escapeHtml(link.passcode)}</code>` : "",
    link.expiresAt ? `${escapeHtml(L.telegramExpires)}: ${link.expiresAt.slice(0, 10)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await sendMessage(chat || "admin", text, { parseMode: "HTML", buttons: [[{ text: L.telegramOpen, url }]] });
  db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: "telegram" }).where(eq(schema.shareLinks.id, id)).run();
  logActivity("project", link.projectId, telegramEnabled() ? L.pageSentTelegram : L.pageSentTelegramDry, "message", user.id);
  revalidateProject(link.projectId);
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
export async function toggleFeedbackResolvedAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const fb = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.id, id)).get();
  if (!fb) return;
  db.update(schema.clientFeedback).set({ resolved: !fb.resolved }).where(eq(schema.clientFeedback.id, id)).run();
  const { t, L } = await actionStrings();
  logActivity("project", fb.projectId, L.feedbackToggled(fb.resolved, labelFor(t, "feedbackType", fb.type)), "system", user.id);
  revalidateProject(fb.projectId);
}
