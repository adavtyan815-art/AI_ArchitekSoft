/** Read-only queries for the public site (portfolio, featured work). */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { pickLang, type Locale } from "./i18n";
import { cached } from "./cache";
import { parseJson } from "./utils";

export type PortfolioCard = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  cover: string | null;
  images: string[];
  video: string | null;
  liveUrl: string | null;
  featured: boolean;
  /** ISO timestamp of the last known content change (sitemap `lastmod`). */
  updatedAt: string;
};

export function getPortfolio(locale: Locale, opts: { featuredOnly?: boolean; limit?: number } = {}): PortfolioCard[] {
  let items = cached(`portfolio:${locale}`, 60_000, () => loadPortfolio(locale));
  if (opts.featuredOnly) items = items.filter((i) => i.featured);
  if (opts.limit) items = items.slice(0, opts.limit);
  return items;
}

/** Asset ids stored on an item; tolerates a missing or malformed JSON column. */
function assetIdList(raw: string | null): string[] {
  const parsed = parseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

function loadPortfolio(locale: Locale): PortfolioCard[] {
  const db = getDb();
  const items = db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.isPublished, true)).orderBy(asc(schema.portfolioItems.sortOrder), desc(schema.portfolioItems.createdAt)).all();
  const ids = new Set<string>();
  for (const it of items) {
    if (it.coverAssetId) ids.add(it.coverAssetId);
    if (it.videoAssetId) ids.add(it.videoAssetId);
    for (const id of assetIdList(it.assetIds)) ids.add(id);
  }
  // Second line of defence for the public site: only assets explicitly marked public are ever loaded, so an item
  // that was saved with a private file (a client's photo, an unapproved render) cannot show it on /portfolio.
  const assets = ids.size
    ? db
        .select()
        .from(schema.assets)
        .where(and(inArray(schema.assets.id, [...ids]), eq(schema.assets.isPublic, true)))
        .all()
    : [];
  const byId = new Map(assets.map((a) => [a.id, a]));
  return items.map((it) => {
    const imgs = assetIdList(it.assetIds).flatMap((id) => {
      const a = byId.get(id);
      return a && a.mime.startsWith("image/") ? [a] : [];
    });
    const coverAsset = it.coverAssetId ? byId.get(it.coverAssetId) : undefined;
    const cover = coverAsset && coverAsset.mime.startsWith("image/") ? coverAsset : (imgs[0] ?? null);
    const videoAsset = it.videoAssetId ? byId.get(it.videoAssetId) : undefined;
    const video = videoAsset && videoAsset.mime.startsWith("video/") ? videoAsset : null;
    // Newest of: the item row (its `updatedAt` once the table has that column, else `createdAt`) and the files it shows.
    const rowStamp = (it as { updatedAt?: string | null }).updatedAt || it.createdAt;
    const updatedAt = [cover, video, ...imgs].reduce((max, a) => (a && a.createdAt > max ? a.createdAt : max), rowStamp);
    return {
      slug: it.slug,
      category: it.category,
      title: String(pickLang(it.title, locale, it.slug)),
      summary: String(pickLang(it.summary, locale, "")),
      cover: cover ? mediaUrl(cover.relPath) : null,
      images: imgs.map((a) => mediaUrl(a.relPath)),
      video: video ? mediaUrl(video.relPath) : null,
      liveUrl: it.liveUrl,
      featured: it.isFeatured,
      updatedAt,
    };
  });
}

export function getPortfolioItem(locale: Locale, slug: string): PortfolioCard | null {
  return getPortfolio(locale).find((i) => i.slug === slug) ?? null;
}
