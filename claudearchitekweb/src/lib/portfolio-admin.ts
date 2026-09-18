/** Admin queries and mutations for the public portfolio (portfolio_items). */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { parseJson, slugify } from "./utils";
import { newId } from "./ids";
import type { PortfolioItem } from "./db/schema";

export const PORTFOLIO_CATEGORIES = ["kitchen", "wardrobe", "living", "bedroom", "real_estate", "commercial", "other"] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export type I18nText = { hy: string; ru: string; en: string };

export type PortfolioRow = PortfolioItem & { titleObj: I18nText; summaryObj: I18nText; assetIdList: string[]; coverUrl: string; projectTitle: string | null; projectCode: string | null };

function toI18n(v: string | null): I18nText {
  const o = parseJson<Partial<I18nText>>(v, {});
  return { hy: o.hy ?? "", ru: o.ru ?? "", en: o.en ?? "" };
}

export function listPortfolioItems(): PortfolioRow[] {
  const db = getDb();
  const rows = db
    .select({ item: schema.portfolioItems, projectTitle: schema.projects.title, projectCode: schema.projects.code })
    .from(schema.portfolioItems)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.portfolioItems.projectId))
    .orderBy(asc(schema.portfolioItems.sortOrder), desc(schema.portfolioItems.createdAt))
    .all();
  const coverIds = rows.map((r) => r.item.coverAssetId).filter(Boolean) as string[];
  const covers = coverIds.length ? db.select().from(schema.assets).where(inArray(schema.assets.id, coverIds)).all() : [];
  return rows.map((r) => {
    const c = covers.find((a) => a.id === r.item.coverAssetId);
    return { ...r.item, titleObj: toI18n(r.item.title), summaryObj: toI18n(r.item.summary), assetIdList: parseJson<string[]>(r.item.assetIds, []), coverUrl: c ? mediaUrl(c.thumbRelPath || c.relPath, 320) : "", projectTitle: r.projectTitle, projectCode: r.projectCode };
  });
}

export function getPortfolioItem(id: string): PortfolioRow | null {
  return listPortfolioItems().find((i) => i.id === id) ?? null;
}

export type PortfolioInput = {
  slug: string;
  category: string;
  title: I18nText;
  summary: I18nText;
  projectId: string | null;
  coverAssetId: string | null;
  assetIds: string[];
  videoAssetId: string | null;
  liveUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
};

/**
 * Last-resort collision guard for the unique `slug` column. The admin action rejects a slug that is
 * already used and tells the owner, so reaching the "-2" suffix here means the caller did not check
 * (a script, a race) — it keeps the save from failing rather than being the normal path.
 */
function uniqueSlug(base: string, excludeId?: string): string {
  const db = getDb();
  const root = slugify(base) || `item-${Date.now().toString(36)}`;
  let slug = root;
  let i = 2;
  const taken = (s: string) => {
    const row = db.select({ id: schema.portfolioItems.id }).from(schema.portfolioItems).where(eq(schema.portfolioItems.slug, s)).get();
    return !!row && row.id !== excludeId;
  };
  while (taken(slug)) slug = `${root}-${i++}`;
  return slug;
}

/** `projects.is_portfolio` is a cache of "this project has at least one portfolio item". */
function syncProjectFlag(projectId: string | null | undefined) {
  if (!projectId) return;
  const db = getDb();
  const row = db.select({ c: sql<number>`count(*)` }).from(schema.portfolioItems).where(eq(schema.portfolioItems.projectId, projectId)).get();
  db.update(schema.projects).set({ isPortfolio: (row?.c ?? 0) > 0 }).where(eq(schema.projects.id, projectId)).run();
}

/**
 * Every file the admin hand-picked for a portfolio item must be visible on the public site.
 * The public loader (src/lib/public-data.ts) now serves only assets with is_public = 1 while the
 * editor's picker offers every file and admin uploads default to private — without this a chosen
 * render would silently not appear on /portfolio. It only touches files the admin explicitly picked;
 * portfolioDraftFromProject still restricts itself to already-public assets.
 */
function publishChosenAssets(ids: (string | null | undefined)[]) {
  const chosen = [...new Set(ids.filter((x): x is string => !!x))];
  if (!chosen.length) return;
  getDb().update(schema.assets).set({ isPublic: true }).where(inArray(schema.assets.id, chosen)).run();
}

export function savePortfolioItem(input: PortfolioInput, id?: string): string {
  const db = getDb();
  const slug = uniqueSlug(input.slug || input.title.en || input.title.hy || "item", id);
  const data = {
    slug,
    category: input.category,
    title: JSON.stringify(input.title),
    summary: JSON.stringify(input.summary),
    projectId: input.projectId,
    coverAssetId: input.coverAssetId,
    assetIds: JSON.stringify(input.assetIds),
    videoAssetId: input.videoAssetId,
    liveUrl: input.liveUrl,
    isPublished: input.isPublished,
    isFeatured: input.isFeatured,
  };
  if (id) {
    const before = db.select({ projectId: schema.portfolioItems.projectId }).from(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).get();
    db.update(schema.portfolioItems).set(data).where(eq(schema.portfolioItems.id, id)).run();
    if (before?.projectId !== input.projectId) syncProjectFlag(before?.projectId);
    syncProjectFlag(input.projectId);
    publishChosenAssets([input.coverAssetId, input.videoAssetId, ...input.assetIds]);
    return id;
  }
  const newIdValue = newId("pf");
  const max = db.select({ m: sql<number>`coalesce(max(sort_order),-1)` }).from(schema.portfolioItems).get()?.m ?? -1;
  db.insert(schema.portfolioItems).values({ id: newIdValue, ...data, sortOrder: max + 1 }).run();
  syncProjectFlag(input.projectId);
  publishChosenAssets([input.coverAssetId, input.videoAssetId, ...input.assetIds]);
  return newIdValue;
}

export function togglePortfolio(id: string, field: "isPublished" | "isFeatured") {
  const db = getDb();
  const row = db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).get();
  if (!row) return;
  db.update(schema.portfolioItems).set({ [field]: !row[field] }).where(eq(schema.portfolioItems.id, id)).run();
}

export function movePortfolio(id: string, dir: "up" | "down") {
  const db = getDb();
  const all = db.select().from(schema.portfolioItems).orderBy(asc(schema.portfolioItems.sortOrder), desc(schema.portfolioItems.createdAt)).all();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= all.length) return;
  const reordered = [...all];
  [reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]];
  reordered.forEach((it, i) => db.update(schema.portfolioItems).set({ sortOrder: i }).where(eq(schema.portfolioItems.id, it.id)).run());
}

export function deletePortfolioItem(id: string) {
  const db = getDb();
  const row = db.select({ projectId: schema.portfolioItems.projectId }).from(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).get();
  db.delete(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).run();
  // the project is only "in the portfolio" while an item of it exists
  syncProjectFlag(row?.projectId);
}

const TYPE_TO_CATEGORY: Record<string, PortfolioCategory> = { kitchen: "kitchen", wardrobe: "wardrobe", living: "living", bedroom: "bedroom", bathroom: "other", office: "commercial", apartment: "real_estate", house: "real_estate", commercial: "commercial", other: "other" };

/** Files that are never public work, whatever the flag says: the client's own photos, working sketches, social posters. */
const PRIVATE_KINDS = new Set(["sketch", "client_upload", "poster"]);

/** The limits the save schema enforces; the draft is trimmed to them so a prefilled form can always be saved. */
const MAX_TITLE = 200;
const MAX_GALLERY = 40;

/**
 * Build a portfolio item from a project's **public** assets, for "Publish a project…" and the form prefill.
 *
 * The draft is deliberately conservative: it is a starting point the owner reviews, not a page that
 * goes live by itself. Only files explicitly marked public are offered (client photos, sketches and
 * social posters never are), nothing is published until the owner ticks "Published", and the summary
 * starts empty because `project.description` holds the client's own message from the lead.
 */
export function portfolioDraftFromProject(projectId: string): PortfolioInput | null {
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) return null;
  const assets = db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.projectId, projectId), eq(schema.assets.isPublic, true), sql`(${schema.assets.mime} like 'image/%' or ${schema.assets.mime} like 'video/%')`))
    .orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt))
    .all();
  const publicAssets = assets.filter((a) => !PRIVATE_KINDS.has(a.kind));
  const pick = publicAssets.filter((a) => a.mime.startsWith("image/")).slice(0, MAX_GALLERY);
  const video = publicAssets.find((a) => a.mime.startsWith("video/"));
  const cover = pick.find((a) => a.id === project.coverAssetId)?.id ?? pick[0]?.id ?? null;
  const title = project.title.slice(0, MAX_TITLE);
  return {
    slug: slugify(project.title),
    category: TYPE_TO_CATEGORY[project.type] ?? "other",
    title: { hy: title, ru: title, en: title },
    // never project.description: it is the lead's private message to the studio
    summary: { hy: "", ru: "", en: "" },
    projectId,
    coverAssetId: cover,
    assetIds: pick.map((a) => a.id),
    videoAssetId: video?.id ?? null,
    liveUrl: project.liveUrl,
    isPublished: false,
    isFeatured: false,
  };
}
