"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { deleteAsset } from "@/lib/media";
import { logActivity } from "@/lib/crm";
import { nowIso } from "@/lib/utils";
import { fall, fbool, fopt, fstr, ftags, issueMessage, withNotice } from "@/lib/form";
import { actionStrings } from "@/lib/admin-log";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

/** Notice wording for this action file (the admin dictionary is hy + en). */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        saved: "Ֆայլը պահպանված է։",
        deleted: "Ֆայլը ջնջված է։",
        assigned: (n: number) => `${n} ֆայլ կապվեց նախագծին։`,
        unassigned: (n: number) => `${n} ֆայլ հանվեց նախագծից։`,
        bulkDeleted: (n: number) => `${n} ֆայլ ջնջվեց։`,
        nothingSelected: "Ոչ մի ֆայլ ընտրված չէ։",
        notFound: "Ֆայլը չի գտնվել։",
      },
      en: {
        saved: "File saved.",
        deleted: "File deleted.",
        assigned: (n: number) => `${n} file(s) assigned to the project.`,
        unassigned: (n: number) => `${n} file(s) removed from their project.`,
        bulkDeleted: (n: number) => `${n} file(s) deleted.`,
        nothingSelected: "No files selected.",
        notFound: "File not found.",
      },
    },
    locale,
  );
  return { ...words, locale, labels: adminDict(locale).media };
}

function revalidateMedia(projectId?: string | null, assetId?: string | null) {
  revalidatePath("/admin/media");
  if (assetId) revalidatePath(`/admin/media/${assetId}`);
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

function back(path: string, text: string, tone: "ok" | "error" = "ok"): never {
  redirect(withNotice(path, text, tone));
}

/**
 * Drop every project reference to an asset, on every project — not only the one the asset belongs to now.
 * A moved asset that is still a project's cover would otherwise keep showing on that project's client page
 * and portfolio entry, and its role could no longer be cleared from the UI.
 */
function clearAssetRefsEverywhere(assetId: string) {
  const db = getDb();
  const P = schema.projects;
  const now = nowIso();
  db.update(P).set({ coverAssetId: null, updatedAt: now }).where(eq(P.coverAssetId, assetId)).run();
  db.update(P).set({ sketchAssetId: null, updatedAt: now }).where(eq(P.sketchAssetId, assetId)).run();
  db.update(P).set({ pdfAssetId: null, updatedAt: now }).where(eq(P.pdfAssetId, assetId)).run();
  db.update(P).set({ arGlbAssetId: null, updatedAt: now }).where(eq(P.arGlbAssetId, assetId)).run();
  db.update(P).set({ arUsdzAssetId: null, updatedAt: now }).where(eq(P.arUsdzAssetId, assetId)).run();
}

export async function updateAssetAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const m = await M();
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) back("/admin/media", m.notFound, "error");
  const parsed = z
    .object({ caption: z.string().max(500).nullable(), tags: z.string().nullable(), projectId: z.string().max(40).nullable(), isPublic: z.boolean(), kind: z.enum(KINDS) })
    .safeParse({ caption: fopt(formData, "caption", 500), tags: ftags(formData, "tags"), projectId: fopt(formData, "projectId", 40), isPublic: fbool(formData, "isPublic"), kind: fstr(formData, "kind") || asset.kind });
  if (!parsed.success) back(`/admin/media/${id}`, issueMessage(parsed.error.issues[0], { caption: m.labels.caption, kind: m.labels.kind, projectId: m.labels.project, tags: m.labels.captionShort }, m.locale), "error");
  const data = parsed.data;
  const moved = data.projectId !== asset.projectId;
  db.update(schema.assets).set(data).where(eq(schema.assets.id, id)).run();
  if (moved) clearAssetRefsEverywhere(id);
  revalidateMedia(asset.projectId, id);
  if (data.projectId && moved) revalidatePath(`/admin/projects/${data.projectId}`);
  // Redirecting also re-renders the form from the saved row: without it React 19 keeps the hydrated
  // defaults in the Kind and Project selects, and the next save silently writes the old values back.
  back(`/admin/media/${id}`, m.saved);
}

/** Caption-only update used inline in the project media grid. */
export async function updateAssetCaptionAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const caption = fopt(formData, "caption", 500);
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) return;
  db.update(schema.assets).set({ caption }).where(eq(schema.assets.id, id)).run();
  revalidateMedia(asset.projectId, id);
}

export async function toggleAssetPublicAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) return;
  db.update(schema.assets).set({ isPublic: !asset.isPublic }).where(eq(schema.assets.id, id)).run();
  revalidateMedia(asset.projectId, id);
}

/** Move an asset up/down inside its project's ordering. Normalises sort_order to 0..n-1 first. */
export async function moveAssetAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const dir = fstr(formData, "dir") === "up" ? -1 : 1;
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset || !asset.projectId) return;
  const list = db.select({ id: schema.assets.id }).from(schema.assets).where(eq(schema.assets.projectId, asset.projectId)).orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt)).all();
  const idx = list.findIndex((a) => a.id === id);
  const swap = idx + dir;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  const ids = list.map((a) => a.id);
  [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
  ids.forEach((aid, i) => db.update(schema.assets).set({ sortOrder: i }).where(eq(schema.assets.id, aid)).run());
  revalidateMedia(asset.projectId, id);
}

export async function deleteAssetAction(formData: FormData) {
  const user = await requireUser();
  const id = fstr(formData, "id");
  const returnTo = fstr(formData, "returnTo", 200);
  const m = await M();
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) back(returnTo.startsWith("/admin") ? returnTo : "/admin/media", m.notFound, "error");
  // The project media grid deletes without a returnTo: stay on that project instead of jumping to the library.
  const target = returnTo.startsWith("/admin") ? returnTo : asset.projectId ? `/admin/projects/${asset.projectId}?tab=media` : "/admin/media";
  clearAssetRefsEverywhere(id);
  deleteAsset(id);
  if (asset.projectId) logActivity("project", asset.projectId, (await actionStrings()).L.fileDeleted(asset.originalName), "system", user.id);
  revalidateMedia(asset.projectId, id);
  back(target, m.deleted);
}

export async function bulkAssignAssetsAction(formData: FormData) {
  const user = await requireUser();
  const ids = fall(formData, "ids").slice(0, 500);
  const projectId = fopt(formData, "projectId", 40);
  const m = await M();
  if (!ids.length) back("/admin/media", m.nothingSelected, "error");
  const db = getDb();
  if (projectId) {
    const p = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    if (!p) back("/admin/media", (await actionStrings()).L.projectNotFound, "error");
  }
  const prev = db.select({ id: schema.assets.id, projectId: schema.assets.projectId }).from(schema.assets).where(inArray(schema.assets.id, ids)).all();
  db.update(schema.assets).set({ projectId }).where(inArray(schema.assets.id, ids)).run();
  for (const r of prev) {
    if (r.projectId === projectId) continue;
    clearAssetRefsEverywhere(r.id);
    if (r.projectId) revalidatePath(`/admin/projects/${r.projectId}`);
  }
  if (projectId) logActivity("project", projectId, (await actionStrings()).L.filesAssigned(ids.length), "system", user.id);
  revalidateMedia(projectId);
  back("/admin/media", projectId ? m.assigned(ids.length) : m.unassigned(ids.length));
}

export async function bulkDeleteAssetsAction(formData: FormData) {
  await requireUser();
  const ids = fall(formData, "ids").slice(0, 500);
  const m = await M();
  if (!ids.length) back("/admin/media", m.nothingSelected, "error");
  const db = getDb();
  const rows = db.select().from(schema.assets).where(inArray(schema.assets.id, ids)).all();
  for (const a of rows) {
    clearAssetRefsEverywhere(a.id);
    deleteAsset(a.id);
    if (a.projectId) revalidatePath(`/admin/projects/${a.projectId}`);
  }
  revalidateMedia();
  back("/admin/media", m.bulkDeleted(rows.length));
}
