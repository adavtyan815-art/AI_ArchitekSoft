"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, getSqlite, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES, createShareLink, logActivity, nextProjectCode, shareUrl } from "@/lib/crm";
import { createLiveInstance } from "@/lib/live";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { escapeHtml, sendMessage, telegramEnabled } from "@/lib/telegram";
import { newId, newToken } from "@/lib/ids";
import { nowIso } from "@/lib/utils";
import { fbool, fnumStrict, fopt, fstr, isHttpUrl, issueMessage, withNotice } from "@/lib/form";
import { actionStrings } from "@/lib/admin-log";
import { adminDict, getAdminLocale, labelFor, local } from "@/lib/i18n/admin";

const SEGMENTS = ["b2b", "b2c"] as const;
const STATUSES = ["active", "on_hold", "done", "cancelled"] as const;
const LANGS = ["hy", "ru", "en"] as const;
const ROLES = ["cover", "sketch", "pdf", "ar_glb", "ar_usdz"] as const;
type Role = (typeof ROLES)[number];

/** Notice wording for this action file (the admin dictionary is hy + en). */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        saved: "Նախագիծը պահպանված է։",
        deleted: "Նախագիծը ջնջված է։",
        stageSaved: "Փուլը փոխված է։",
        linksSaved: "Հղումները պահպանված են։",
        roleSaved: "Ֆայլի դերը թարմացվեց։",
        roleMismatch: (role: string) => `Այս ֆայլի տեսակը «${role}» դերին չի համապատասխանում։`,
        liveDry: "Live-ի սերվերը կարգավորված չէ․ սեսիա չի ստեղծվել, և հղումը մնաց անփոփոխ։",
        liveDone: (uuid: string) => `Live 3D սեսիան ստեղծված է (${uuid})։`,
        pageCreated: "Հաճախորդի էջը ստեղծված է։",
        pageUpdated: "Հաճախորդի էջը թարմացվեց։",
        pageDeleted: "Հաճախորդի էջը ջնջվեց։",
        pageRegenerated: "Նոր հղումը պատրաստ է. հինն այլևս չի աշխատում։",
        markedSent: "Նշվեց՝ ուղարկված։",
        tgSent: (chat: string) => `Հղումն ուղարկվեց Telegram-ի չաթ ${chat}։`,
        feedbackSaved: "Արձագանքը թարմացվեց։",
        notFound: "Գրառումը չի գտնվել։",
      },
      en: {
        saved: "Project saved.",
        deleted: "Project deleted.",
        stageSaved: "Stage updated.",
        linksSaved: "Links saved.",
        roleSaved: "File role updated.",
        roleMismatch: (role: string) => `This file type does not fit the “${role}” role.`,
        liveDry: "The Live backend is not configured: no session was created and the link was left unchanged.",
        liveDone: (uuid: string) => `Live 3D session created (${uuid}).`,
        pageCreated: "Client page created.",
        pageUpdated: "Client page updated.",
        pageDeleted: "Client page deleted.",
        pageRegenerated: "New link ready — the old one no longer works.",
        markedSent: "Marked as sent.",
        tgSent: (chat: string) => `Link sent to Telegram chat ${chat}.`,
        feedbackSaved: "Feedback updated.",
        notFound: "Record not found.",
      },
    },
    locale,
  );
  const t = adminDict(locale);
  return { ...words, locale, labels: t.projects, common: t.common };
}

function revalidateProject(id: string) {
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/pages");
  revalidatePath("/admin");
}

/** Every project form lives on a tab of /admin/projects/<id>; the action knows which one, so a notice never moves the admin. */
function tabPath(id: string, tab: "" | "media" | "client" | "deliverables" | "feedback" | "timeline" = ""): string {
  return tab ? `/admin/projects/${id}?tab=${tab}` : `/admin/projects/${id}`;
}

function back(path: string, text: string, tone: "ok" | "error" = "ok"): never {
  redirect(withNotice(path, text, tone));
}

/**
 * Where a share-link action should return to. /admin/pages posts a `returnTo`, because switching a
 * link off from the Client pages list used to throw the admin onto the project page. Only a relative
 * /admin path is honoured, so the field can never become an open redirect.
 */
function shareLinkReturn(formData: FormData, projectId: string): string {
  const raw = fstr(formData, "returnTo");
  if (raw && /^\/admin(?:[/?#]|$)/.test(raw) && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return tabPath(projectId, "client");
}

/** Money: never negative, never silently dropped by a typo (fnumStrict turns "1.2.3" into NaN, which zod reports). */
const amount = z.number().min(0).nullable();
/** Room dimensions in metres. */
const measure = z.number().min(0).max(1000).nullable();

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const createSchema = z.object({
  title: z.string().min(1).max(160),
  segment: z.enum(SEGMENTS),
  type: z.enum(PROJECT_TYPES),
  clientId: z.string().max(40).nullable(),
  companyId: z.string().max(40).nullable(),
  description: z.string().max(4000).nullable(),
  quoteAmount: amount,
  currency: z.string().max(6),
});

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const P = m.labels;
  const labels = { title: P.fTitle, quoteAmount: P.fQuote, currency: P.quote, description: P.details };
  const parsed = createSchema.safeParse({
    title: fstr(formData, "title", 160),
    segment: fstr(formData, "segment") || "b2c",
    type: fstr(formData, "type") || "kitchen",
    clientId: fopt(formData, "clientId", 40),
    companyId: fopt(formData, "companyId", 40),
    description: fopt(formData, "description"),
    quoteAmount: fnumStrict(formData, "quoteAmount"),
    currency: fstr(formData, "currency", 6) || "AMD",
  });
  if (!parsed.success) back("/admin/projects/new", issueMessage(parsed.error.issues[0], labels, m.locale), "error");
  const data = parsed.data;
  const db = getDb();
  const id = newId("prj");
  db.insert(schema.projects).values({ id, code: nextProjectCode(), stage: "request", status: "active", ...data }).run();
  const { L } = await actionStrings();
  logActivity("project", id, L.projectCreatedBy(user.name), "system", user.id);
  if (data.clientId) logActivity("client", data.clientId, L.projectCreated(data.title), "system", user.id);
  if (data.companyId) logActivity("company", data.companyId, L.projectCreated(data.title), "system", user.id);
  revalidateProject(id);
  back(tabPath(id), m.saved);
}

const updateSchema = z.object({
  title: z.string().min(1).max(160),
  segment: z.enum(SEGMENTS),
  type: z.enum(PROJECT_TYPES),
  status: z.enum(STATUSES),
  clientId: z.string().max(40).nullable(),
  companyId: z.string().max(40).nullable(),
  description: z.string().max(4000).nullable(),
  materials: z.string().max(2000).nullable(),
  quoteAmount: amount,
  depositAmount: amount,
  paidAmount: amount,
  currency: z.string().max(6),
  deadline: z.string().max(40).nullable(),
  isPortfolio: z.boolean(),
  roomWidth: measure,
  roomDepth: measure,
  roomHeight: measure,
  roomNotes: z.string().max(500).nullable(),
});

export async function updateProjectAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const { t, L } = await actionStrings();
  const m = await M();
  const P = m.labels;
  const before = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!before) back("/admin/projects", L.projectNotFound, "error");
  const labels = {
    title: P.fTitle,
    quoteAmount: P.fQuote,
    depositAmount: P.fDeposit,
    paidAmount: P.fPaid,
    deadline: P.fDeadline,
    materials: P.fMaterials,
    description: P.details,
    roomWidth: P.fRoomWidth,
    roomDepth: P.fRoomDepth,
    roomHeight: P.fRoomHeight,
    roomNotes: P.fRoomNotes,
  };
  const parsed = updateSchema.safeParse({
    title: fstr(formData, "title", 160),
    segment: fstr(formData, "segment") || before.segment,
    type: fstr(formData, "type") || before.type,
    status: fstr(formData, "status") || before.status,
    clientId: fopt(formData, "clientId", 40),
    companyId: fopt(formData, "companyId", 40),
    description: fopt(formData, "description"),
    materials: fopt(formData, "materials", 2000),
    quoteAmount: fnumStrict(formData, "quoteAmount"),
    depositAmount: fnumStrict(formData, "depositAmount"),
    paidAmount: fnumStrict(formData, "paidAmount"),
    currency: fstr(formData, "currency", 6) || "AMD",
    deadline: fopt(formData, "deadline", 40),
    isPortfolio: fbool(formData, "isPortfolio"),
    roomWidth: fnumStrict(formData, "roomWidth"),
    roomDepth: fnumStrict(formData, "roomDepth"),
    roomHeight: fnumStrict(formData, "roomHeight"),
    roomNotes: fopt(formData, "roomNotes", 500),
  });
  if (!parsed.success) back(tabPath(id), issueMessage(parsed.error.issues[0], labels, m.locale), "error");
  const { roomWidth, roomDepth, roomHeight, roomNotes, ...data } = parsed.data;
  const room = { width: roomWidth, depth: roomDepth, height: roomHeight, notes: roomNotes };
  const hasRoom = room.width !== null || room.depth !== null || room.height !== null || !!room.notes;
  db.update(schema.projects)
    .set({ ...data, room: hasRoom ? JSON.stringify(room) : null, updatedAt: nowIso() })
    .where(eq(schema.projects.id, id))
    .run();
  if (before.status !== data.status) logActivity("project", id, L.statusChange(labelFor(t, "projectStatus", before.status), labelFor(t, "projectStatus", data.status)), "status", user.id);
  if (before.quoteAmount !== data.quoteAmount) logActivity("project", id, L.quoteSet(`${data.quoteAmount ?? "—"} ${data.currency}`), "system", user.id);
  if (before.paidAmount !== data.paidAmount) logActivity("project", id, L.paidSet(`${data.paidAmount ?? "—"} ${data.currency}`), "system", user.id);
  revalidateProject(id);
  back(tabPath(id), m.saved);
}

export async function setProjectStageAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string().min(1), stage: z.enum(PROJECT_STAGES) }).safeParse({ id: fstr(formData, "id"), stage: fstr(formData, "stage") });
  if (!parsed.success) back("/admin/projects", m.notFound, "error");
  const { id, stage } = parsed.data;
  const db = getDb();
  const { t, L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!p) back("/admin/projects", L.projectNotFound, "error");
  if (p.stage !== stage) {
    db.update(schema.projects).set({ stage, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
    logActivity("project", id, L.stageChange(labelFor(t, "projectStage", p.stage), labelFor(t, "projectStage", stage)), "status", user.id);
  }
  revalidateProject(id);
  back(tabPath(id), m.stageSaved);
}

export async function deleteProjectAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const project = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!project) back("/admin/projects", m.notFound, "error");
  // One transaction: the project's own rows go together, so nothing is left counted on the dashboard or listed
  // under a deleted parent. Files stay in the library (the confirm text says so) but stop being publishable.
  getSqlite().transaction(() => {
    db.update(schema.assets).set({ projectId: null, isPublic: false }).where(eq(schema.assets.projectId, id)).run();
    db.delete(schema.tasks).where(and(eq(schema.tasks.entityType, "project"), eq(schema.tasks.entityId, id))).run();
    db.delete(schema.activities).where(and(eq(schema.activities.entityType, "project"), eq(schema.activities.entityId, id))).run();
    db.delete(schema.projects).where(eq(schema.projects.id, id)).run();
  })();
  revalidatePath("/admin/projects");
  revalidatePath("/admin/media");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  back("/admin/projects", m.deleted);
}

/** Roles only accept a file the client page can actually use: an image for cover/sketch, a PDF, a .glb, a .usdz. */
function roleAccepts(role: Role, asset: { mime: string; originalName: string; kind: string }): boolean {
  const ext = asset.originalName.slice(asset.originalName.lastIndexOf(".")).toLowerCase();
  if (role === "cover" || role === "sketch") return asset.mime.startsWith("image/");
  if (role === "pdf") return asset.mime === "application/pdf" || ext === ".pdf";
  if (role === "ar_glb") return asset.kind === "model_glb" || ext === ".glb" || ext === ".gltf";
  return asset.kind === "model_usdz" || ext === ".usdz";
}

/** Assign an asset to a project role (cover / sketch / pdf / ar_glb / ar_usdz). Re-assigning the same asset clears it. */
export async function setProjectAssetRoleAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = z
    .object({ projectId: z.string().min(1), assetId: z.string().min(1), role: z.enum(ROLES) })
    .safeParse({ projectId: fstr(formData, "projectId"), assetId: fstr(formData, "assetId"), role: fstr(formData, "role") });
  if (!parsed.success) back("/admin/projects", m.notFound, "error");
  const { projectId, assetId, role } = parsed.data;
  const db = getDb();
  const { t, L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!p) back("/admin/projects", L.projectNotFound, "error");
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).get();
  if (!asset) back(tabPath(projectId, "media"), L.assetNotFound, "error");
  const col = { cover: "coverAssetId", sketch: "sketchAssetId", pdf: "pdfAssetId", ar_glb: "arGlbAssetId", ar_usdz: "arUsdzAssetId" } as const;
  const key = col[role];
  const clearing = p[key] === assetId;
  const roleLabel = t.media.roleLabels[role];
  if (!clearing && !roleAccepts(role, asset)) back(tabPath(projectId, "media"), m.roleMismatch(roleLabel), "error");

  const next = clearing ? null : assetId;
  db.update(schema.projects).set({ [key]: next, updatedAt: nowIso() }).where(eq(schema.projects.id, projectId)).run();
  // "Sketch" is also a file kind. Mark it when the role is set and put it back when the role is cleared,
  // so an image does not stay filed as a sketch for ever.
  if (role === "sketch") {
    if (next && asset.kind !== "sketch") db.update(schema.assets).set({ kind: "sketch" }).where(eq(schema.assets.id, assetId)).run();
    if (!next && asset.kind === "sketch") db.update(schema.assets).set({ kind: asset.mime.startsWith("image/") ? "render" : "other" }).where(eq(schema.assets.id, assetId)).run();
  }
  logActivity("project", projectId, next ? L.roleSet(roleLabel) : L.roleCleared(roleLabel), "system", user.id);
  revalidateProject(projectId);
  revalidatePath("/admin/media");
  back(tabPath(projectId, "media"), m.roleSaved);
}

// ---------------------------------------------------------------------------
// Deliverables (Live 3D / viewer)
// ---------------------------------------------------------------------------
/** A link the client page will render: http(s) only, so "not a url at all" or javascript: never reaches a visitor. */
const optionalLink = z
  .string()
  .max(500)
  .nullable()
  .refine((v) => !v || isHttpUrl(v), { message: "url" });

export async function updateDeliverablesAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const P = m.labels;
  const parsed = z
    .object({ liveUrl: optionalLink, liveInstanceUuid: z.string().max(120).nullable(), viewerUrl: optionalLink })
    .safeParse({ liveUrl: fopt(formData, "liveUrl", 500), liveInstanceUuid: fopt(formData, "liveInstanceUuid", 120), viewerUrl: fopt(formData, "viewerUrl", 500) });
  if (!parsed.success) back(tabPath(id, "deliverables"), issueMessage(parsed.error.issues[0], { liveUrl: P.liveUrl, viewerUrl: P.viewerUrl, liveInstanceUuid: P.liveUuid }, m.locale), "error");
  getDb().update(schema.projects).set({ ...parsed.data, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", id, L.deliverablesUpdated, "system", user.id);
  revalidateProject(id);
  back(tabPath(id, "deliverables"), m.linksSaved);
}

export async function createLiveLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const { L } = await actionStrings();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!p) back("/admin/projects", L.projectNotFound, "error");

  let r: Awaited<ReturnType<typeof createLiveInstance>> | null = null;
  let failure = "";
  try {
    r = await createLiveInstance({ assignedTo: `${p.code} ${p.title}`.slice(0, 120) });
  } catch (e) {
    failure = (e as Error).message || "unknown";
  }
  if (!r) back(tabPath(id, "deliverables"), failure, "error");
  // A dry run has no session behind it: writing its placeholder would put a dead "Live 3D" button on the client page.
  if (r.dryRun) {
    logActivity("project", id, L.liveCreatedDry(r.url), "system", user.id);
    back(tabPath(id, "deliverables"), m.liveDry, "error");
  }
  db.update(schema.projects).set({ liveUrl: r.url, liveInstanceUuid: r.uuid, updatedAt: nowIso() }).where(eq(schema.projects.id, id)).run();
  logActivity("project", id, L.liveCreated(r.uuid, r.expiresAt.slice(0, 10)), "system", user.id);
  revalidateProject(id);
  back(tabPath(id, "deliverables"), m.liveDone(r.uuid));
}

// ---------------------------------------------------------------------------
// Client pages (share links)
// ---------------------------------------------------------------------------
const shareSchema = z.object({
  title: z.string().max(160).nullable(),
  message: z.string().max(2000).nullable(),
  language: z.enum(LANGS),
  // empty = never expires; otherwise whole days into the future, capped at 10 years
  expiresDays: z.number().int().min(1).max(3650).nullable(),
  // long enough that a forwarded link cannot be opened by trying every code
  passcode: z.string().min(6).max(24).nullable(),
  showLive: z.boolean(),
  showViewer: z.boolean(),
  showPdf: z.boolean(),
  allowDownload: z.boolean(),
  allowFeedback: z.boolean(),
});

export async function createShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const projectId = fstr(formData, "projectId");
  const m = await M();
  const P = m.labels;
  const parsed = shareSchema.safeParse({
    title: fopt(formData, "title", 160),
    message: fopt(formData, "message", 2000),
    language: fstr(formData, "language") || "hy",
    expiresDays: fnumStrict(formData, "expiresDays"),
    passcode: fopt(formData, "passcode", 24),
    showLive: fbool(formData, "showLive"),
    showViewer: fbool(formData, "showViewer"),
    showPdf: fbool(formData, "showPdf"),
    allowDownload: fbool(formData, "allowDownload"),
    allowFeedback: fbool(formData, "allowFeedback"),
  });
  if (!parsed.success) back(tabPath(projectId, "client"), issueMessage(parsed.error.issues[0], { expiresDays: P.expiresDays, passcode: P.passcode, title: m.common.title, message: P.greeting }, m.locale), "error");
  const data = parsed.data;
  const link = createShareLink(projectId, { ...data, title: data.title ?? undefined, message: data.message ?? undefined });
  const { L } = await actionStrings();
  logActivity("project", projectId, L.pageCreated(user.name, link.language), "system", user.id);
  revalidateProject(projectId);
  back(tabPath(projectId, "client"), m.pageCreated);
}

export async function toggleShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) back("/admin/projects", m.notFound, "error");
  db.update(schema.shareLinks).set({ isActive: !link.isActive }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageToggled(link.isActive, link.slug), "system", user.id);
  revalidateProject(link.projectId);
  back(shareLinkReturn(formData, link.projectId), m.pageUpdated);
}

export async function regenerateShareTokenAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) back("/admin/projects", m.notFound, "error");
  db.update(schema.shareLinks).set({ token: newToken(12), sentAt: null, sentVia: null }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageRegenerated(link.slug), "system", user.id);
  revalidateProject(link.projectId);
  back(shareLinkReturn(formData, link.projectId), m.pageRegenerated);
}

export async function deleteShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) back("/admin/projects", m.notFound, "error");
  db.delete(schema.shareLinks).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageDeleted(link.slug), "system", user.id);
  revalidateProject(link.projectId);
  back(shareLinkReturn(formData, link.projectId), m.pageDeleted);
}

/** Records how the link was handed to the client (copy / whatsapp / email). */
export async function markShareSentAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string().min(1), via: z.enum(["copy", "whatsapp", "email", "telegram"]) }).safeParse({ id: fstr(formData, "id"), via: fstr(formData, "via") });
  if (!parsed.success) back("/admin/projects", m.notFound, "error");
  const { id, via } = parsed.data;
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) back("/admin/projects", m.notFound, "error");
  db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: via }).where(eq(schema.shareLinks.id, id)).run();
  const { L } = await actionStrings();
  logActivity("project", link.projectId, L.pageSent(via), "message", user.id);
  revalidateProject(link.projectId);
  back(tabPath(link.projectId, "client"), m.markedSent);
}

/** Sends the client-page link to the owner's Telegram chat (so it can be forwarded to the client). */
export async function sendShareLinkTelegramAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).get();
  if (!link) back("/admin/projects", m.notFound, "error");
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, link.projectId)).get();
  if (!project) back("/admin/projects", m.notFound, "error");
  const { L } = await actionStrings();
  const target = tabPath(link.projectId, "client");
  const chat = getSetting("telegram").adminChatId;
  // Without a bot token (or without an admin chat) nothing leaves the server, so the link must not be recorded as delivered.
  if (!telegramEnabled() || !chat) {
    logActivity("project", link.projectId, L.pageSentTelegramDry, "message", user.id);
    revalidateProject(link.projectId);
    back(target, L.telegramNotConfigured, "error");
  }
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

  // Only the Telegram call sits inside try/catch: back() redirects by throwing, which must never be caught here.
  let failure: string | null = null;
  try {
    await sendMessage(chat, text, { parseMode: "HTML", buttons: [[{ text: L.telegramOpen, url }]] });
  } catch (e) {
    failure = (e as Error).message || "unknown";
  }
  if (failure !== null) back(target, `${L.telegramCardTitle}: ${failure}`, "error");
  db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: "telegram" }).where(eq(schema.shareLinks.id, id)).run();
  logActivity("project", link.projectId, L.pageSentTelegram, "message", user.id);
  revalidateProject(link.projectId);
  back(target, m.tgSent(chat));
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
export async function toggleFeedbackResolvedAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const fb = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.id, id)).get();
  if (!fb) back("/admin/projects", m.notFound, "error");
  db.update(schema.clientFeedback).set({ resolved: !fb.resolved }).where(eq(schema.clientFeedback.id, id)).run();
  const { t, L } = await actionStrings();
  logActivity("project", fb.projectId, L.feedbackToggled(fb.resolved, labelFor(t, "feedbackType", fb.type)), "system", user.id);
  revalidateProject(fb.projectId);
  back(tabPath(fb.projectId, "feedback"), m.feedbackSaved);
}
