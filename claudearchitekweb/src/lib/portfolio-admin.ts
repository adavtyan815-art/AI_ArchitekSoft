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
    return { ...r.item, titleObj: toI18n(r.item.title), summaryObj: toI18n(r.item.summary), assetIdList: parseJson<string[]>(r.item.assetIds, []), coverUrl: c ? mediaUrl(c.thumbRelPath || c.relPath) : "", projectTitle: r.projectTitle, projectCode: r.projectCode };
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

function uniqueSlug(base: string, excludeId?: string): string {
  const db = getDb();
  let slug = slugify(base) || `item-${Date.now().toString(36)}`;
  let i = 2;
  const taken = (s: string) => {
    const row = db.select({ id: schema.portfolioItems.id }).from(schema.portfolioItems).where(eq(schema.portfolioItems.slug, s)).get();
    return !!row && row.id !== excludeId;
  };
  const root = slug;
  while (taken(slug)) slug = `${root}-${i++}`;
  return slug;
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
    db.update(schema.portfolioItems).set(data).where(eq(schema.portfolioItems.id, id)).run();
    return id;
  }
  const newIdValue = newId("pf");
  const max = db.select({ m: sql<number>`coalesce(max(sort_order),-1)` }).from(schema.portfolioItems).get()?.m ?? -1;
  db.insert(schema.portfolioItems).values({ id: newIdValue, ...data, sortOrder: max + 1 }).run();
  if (input.projectId) db.update(schema.projects).set({ isPortfolio: true }).where(eq(schema.projects.id, input.projectId)).run();
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
  getDb().delete(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).run();
}

const TYPE_TO_CATEGORY: Record<string, PortfolioCategory> = { kitchen: "kitchen", wardrobe: "wardrobe", living: "living", bedroom: "bedroom", bathroom: "other", office: "commercial", apartment: "real_estate", house: "real_estate", commercial: "commercial", other: "other" };

/** Build a portfolio item from a project's public assets (used by "Publish to portfolio" and the form prefill). */
export function portfolioDraftFromProject(projectId: string): PortfolioInput | null {
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) return null;
  const assets = db.select().from(schema.assets).where(and(eq(schema.assets.projectId, projectId), sql`(${schema.assets.mime} like 'image/%' or ${schema.assets.mime} like 'video/%')`)).orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt)).all();
  const images = assets.filter((a) => a.mime.startsWith("image/") && a.kind !== "sketch");
  const preferred = images.filter((a) => a.isPublic);
  const pick = preferred.length ? preferred : images;
  const video = assets.find((a) => a.mime.startsWith("video/"));
  return {
    slug: slugify(project.title),
    category: TYPE_TO_CATEGORY[project.type] ?? "other",
    title: { hy: project.title, ru: project.title, en: project.title },
    summary: { hy: project.description ?? "", ru: project.description ?? "", en: project.description ?? "" },
    projectId,
    coverAssetId: project.coverAssetId ?? pick[0]?.id ?? null,
    assetIds: pick.map((a) => a.id),
    videoAssetId: video?.id ?? null,
    liveUrl: project.liveUrl,
    isPublished: true,
    isFeatured: false,
  };
}
