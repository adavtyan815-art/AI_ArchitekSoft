"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { deleteAsset } from "@/lib/media";
import { logActivity } from "@/lib/crm";
import { fall, fbool, fopt, fstr, ftags } from "@/lib/form";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

function revalidateMedia(projectId?: string | null, assetId?: string | null) {
  revalidatePath("/admin/media");
  if (assetId) revalidatePath(`/admin/media/${assetId}`);
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

export async function updateAssetAction(formData: FormData) {
  await requireUser();
  const id = fstr(formData, "id");
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) throw new Error("Asset not found");
  const data = z
    .object({ caption: z.string().max(500).nullable(), tags: z.string().nullable(), projectId: z.string().nullable(), isPublic: z.boolean(), kind: z.enum(KINDS) })
    .parse({ caption: fopt(formData, "caption", 500), tags: ftags(formData, "tags"), projectId: fopt(formData, "projectId", 40), isPublic: fbool(formData, "isPublic"), kind: fstr(formData, "kind") || asset.kind });
  db.update(schema.assets).set(data).where(eq(schema.assets.id, id)).run();
  revalidateMedia(asset.projectId, id);
  if (data.projectId && data.projectId !== asset.projectId) revalidatePath(`/admin/projects/${data.projectId}`);
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
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) return;
  clearProjectRefs(asset.id, asset.projectId);
  deleteAsset(id);
  if (asset.projectId) logActivity("project", asset.projectId, `Deleted file ${asset.originalName}`, "system", user.id);
  revalidateMedia(asset.projectId, id);
  if (returnTo.startsWith("/admin")) redirect(returnTo);
}

function clearProjectRefs(assetId: string, projectId: string | null) {
  if (!projectId) return;
  const db = getDb();
  const p = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!p) return;
  const patch: Partial<typeof p> = {};
  if (p.coverAssetId === assetId) patch.coverAssetId = null;
  if (p.sketchAssetId === assetId) patch.sketchAssetId = null;
  if (p.pdfAssetId === assetId) patch.pdfAssetId = null;
  if (p.arGlbAssetId === assetId) patch.arGlbAssetId = null;
  if (p.arUsdzAssetId === assetId) patch.arUsdzAssetId = null;
  if (Object.keys(patch).length) db.update(schema.projects).set(patch).where(eq(schema.projects.id, projectId)).run();
}

export async function bulkAssignAssetsAction(formData: FormData) {
  const user = await requireUser();
  const ids = fall(formData, "ids").slice(0, 500);
  const projectId = fopt(formData, "projectId", 40);
  if (!ids.length) return;
  const db = getDb();
  if (projectId) {
    const p = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    if (!p) throw new Error("Project not found");
  }
  const prev = db.select({ projectId: schema.assets.projectId }).from(schema.assets).where(inArray(schema.assets.id, ids)).all();
  db.update(schema.assets).set({ projectId }).where(inArray(schema.assets.id, ids)).run();
  if (projectId) logActivity("project", projectId, `${ids.length} file(s) assigned from media library`, "system", user.id);
  revalidateMedia(projectId);
  for (const r of prev) if (r.projectId) revalidatePath(`/admin/projects/${r.projectId}`);
}

export async function bulkDeleteAssetsAction(formData: FormData) {
  await requireUser();
  const ids = fall(formData, "ids").slice(0, 500);
  if (!ids.length) return;
  const db = getDb();
  const rows = db.select().from(schema.assets).where(inArray(schema.assets.id, ids)).all();
  for (const a of rows) {
    clearProjectRefs(a.id, a.projectId);
    deleteAsset(a.id);
    if (a.projectId) revalidatePath(`/admin/projects/${a.projectId}`);
  }
  revalidateMedia();
}
