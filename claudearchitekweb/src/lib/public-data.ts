/** Read-only queries for the public site (portfolio, featured work). */
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { pickLang, type Locale } from "./i18n";
import { cached } from "./cache";

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
};

export function getPortfolio(locale: Locale, opts: { featuredOnly?: boolean; limit?: number } = {}): PortfolioCard[] {
  let items = cached(`portfolio:${locale}`, 60_000, () => loadPortfolio(locale));
  if (opts.featuredOnly) items = items.filter((i) => i.featured);
  if (opts.limit) items = items.slice(0, opts.limit);
  return items;
}

function loadPortfolio(locale: Locale): PortfolioCard[] {
  const db = getDb();
  const items = db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.isPublished, true)).orderBy(asc(schema.portfolioItems.sortOrder), desc(schema.portfolioItems.createdAt)).all();
  const ids = new Set<string>();
  for (const it of items) {
    if (it.coverAssetId) ids.add(it.coverAssetId);
    if (it.videoAssetId) ids.add(it.videoAssetId);
    for (const id of JSON.parse(it.assetIds || "[]") as string[]) ids.add(id);
  }
  const assets = ids.size ? db.select().from(schema.assets).where(inArray(schema.assets.id, [...ids])).all() : [];
  const byId = new Map(assets.map((a) => [a.id, a]));
  return items.map((it) => {
    const cover = it.coverAssetId ? byId.get(it.coverAssetId) : null;
    const imgs = (JSON.parse(it.assetIds || "[]") as string[]).map((id) => byId.get(id)).filter((a) => a && a.mime.startsWith("image/"));
    const video = it.videoAssetId ? byId.get(it.videoAssetId) : null;
    return {
      slug: it.slug,
      category: it.category,
      title: String(pickLang(it.title, locale, it.slug)),
      summary: String(pickLang(it.summary, locale, "")),
      cover: cover ? mediaUrl(cover.relPath) : null,
      images: imgs.map((a) => mediaUrl(a!.relPath)),
      video: video ? mediaUrl(video.relPath) : null,
      liveUrl: it.liveUrl,
      featured: it.isFeatured,
    };
  });
}

export function getPortfolioItem(locale: Locale, slug: string): PortfolioCard | null {
  return getPortfolio(locale).find((i) => i.slug === slug) ?? null;
}
