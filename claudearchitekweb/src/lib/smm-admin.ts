/**
 * Admin-side SMM queries and mutations (lists, stats, variant/asset editing, duplicate, delete).
 * Publishing / approval logic lives in ./smm.ts.
 */
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { mediaUrl } from "./media";
import { nowIso, parseJson } from "./utils";
import { newId } from "./ids";
import type { Asset, Post, PostVariant } from "./db/schema";

export type AssetLite = {
  id: string;
  kind: string;
  mime: string;
  projectId: string | null;
  name: string;
  caption: string | null;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  isPublic: boolean;
  createdAt: string;
};

export function toAssetLite(a: Asset): AssetLite {
  return {
    id: a.id,
    kind: a.kind,
    mime: a.mime,
    projectId: a.projectId,
    name: a.originalName,
    caption: a.caption,
    url: mediaUrl(a.relPath),
    thumbUrl: mediaUrl(a.thumbRelPath || (a.mime.startsWith("image/") ? a.relPath : null), 320),
    width: a.width,
    height: a.height,
    durationSec: a.durationSec,
    isPublic: a.isPublic,
    createdAt: a.createdAt,
  };
}

export type ProjectLite = { id: string; code: string; title: string; type: string; segment: string; stage: string; status: string; coverUrl: string; coverAssetId: string | null; liveUrl: string | null; description: string | null };

export function listProjectsLite(): ProjectLite[] {
  const db = getDb();
  const rows = db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt)).all();
  const coverIds = rows.map((r) => r.coverAssetId).filter(Boolean) as string[];
  const covers = coverIds.length ? db.select().from(schema.assets).where(inArray(schema.assets.id, coverIds)).all() : [];
  return rows.map((p) => {
    const c = covers.find((a) => a.id === p.coverAssetId);
    return { id: p.id, code: p.code, title: p.title, type: p.type, segment: p.segment, stage: p.stage, status: p.status, coverUrl: c ? mediaUrl(c.thumbRelPath || c.relPath, 320) : "", coverAssetId: p.coverAssetId, liveUrl: p.liveUrl, description: p.description };
  });
}

export type MediaListOptions = {
  /**
   * Only media of this project plus unassigned library media (filtered in SQL, before the limit).
   * Leave undefined when the project can still change on the client (composer, portfolio form).
   */
  projectId?: string | null;
  /** Asset ids that must be offered even when they are older than the limit (a post's or item's current selection). */
  includeIds?: (string | null | undefined)[];
  /**
   * Without a project filter: also return the newest N media of every project, so an older project's
   * media can still be picked after the library has grown past `limit`.
   */
  perProject?: number;
};

const MEDIA_MIME = sql`(${schema.assets.mime} like 'image/%' or ${schema.assets.mime} like 'video/%')`;

/**
 * Images, videos and posters (the media that can go into a post or the portfolio), newest first.
 * The limit is applied after the project filter, and the ids in `includeIds` are always merged in, so
 * an existing selection never drops out of the picker.
 */
export function listMediaAssetsLite(limit = 500, opts: MediaListOptions = {}): AssetLite[] {
  const db = getDb();
  const where = opts.projectId ? and(MEDIA_MIME, or(eq(schema.assets.projectId, opts.projectId), isNull(schema.assets.projectId))) : MEDIA_MIME;
  const rows: Asset[] = db.select().from(schema.assets).where(where).orderBy(desc(schema.assets.createdAt)).limit(limit).all();
  const seen = new Set(rows.map((a) => a.id));
  const merge = (extra: Asset[]) => {
    for (const a of extra) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      rows.push(a);
    }
  };

  if (!opts.projectId && opts.perProject && rows.length >= limit) {
    // The library is larger than the limit: top up with the newest media of each project.
    const ids = db
      .all<{ id: string }>(
        sql`select id from (select id, row_number() over (partition by project_id order by created_at desc) as rn from assets where project_id is not null and (mime like 'image/%' or mime like 'video/%')) where rn <= ${opts.perProject}`
      )
      .map((r) => r.id)
      .filter((id) => !seen.has(id));
    for (let i = 0; i < ids.length; i += 400) merge(db.select().from(schema.assets).where(inArray(schema.assets.id, ids.slice(i, i + 400))).all());
  }

  const wanted = [...new Set((opts.includeIds ?? []).filter((id): id is string => !!id && !seen.has(id)))];
  if (wanted.length) merge(db.select().from(schema.assets).where(and(MEDIA_MIME, inArray(schema.assets.id, wanted))).all());

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toAssetLite);
}

export type PostRow = Post & { projectTitle: string | null; projectCode: string | null; variants: { platform: string; enabled: boolean; status: string }[] };

export function listPosts(): PostRow[] {
  const db = getDb();
  const rows = db
    .select({ post: schema.posts, projectTitle: schema.projects.title, projectCode: schema.projects.code })
    .from(schema.posts)
    .leftJoin(schema.projects, eq(schema.projects.id, schema.posts.projectId))
    .orderBy(desc(schema.posts.createdAt))
    .all();
  const ids = rows.map((r) => r.post.id);
  const variants = ids.length
    ? db.select({ postId: schema.postVariants.postId, platform: schema.postVariants.platform, enabled: schema.postVariants.enabled, status: schema.postVariants.status }).from(schema.postVariants).where(inArray(schema.postVariants.postId, ids)).all()
    : [];
  return rows.map((r) => ({ ...r.post, projectTitle: r.projectTitle, projectCode: r.projectCode, variants: variants.filter((v) => v.postId === r.post.id) }));
}

export function smmStats() {
  const db = getDb();
  const count = (where: ReturnType<typeof sql>) => db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(where).get()?.c ?? 0;
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  return {
    awaiting: count(sql`status = 'awaiting_approval'`),
    scheduled: count(sql`status in ('scheduled','approved')`),
    published30: count(sql`status in ('published','partially_published') and published_at >= ${since30}`),
    // A partially published post has failed variants too: it needs the same attention as a fully failed one.
    failed: count(sql`status = 'failed' or (status = 'partially_published' and exists (select 1 from post_variants v where v.post_id = ${schema.posts.id} and v.enabled = 1 and v.status = 'failed'))`),
  };
}

export function updatePost(id: string, data: Partial<Pick<Post, "title" | "notes" | "coreText" | "goal" | "language">>) {
  getDb().update(schema.posts).set({ ...data, updatedAt: nowIso() }).where(eq(schema.posts.id, id)).run();
}

export type VariantPatch = Partial<Pick<PostVariant, "enabled" | "title" | "text" | "cta" | "format">> & { hashtags?: string[] };

export function updateVariant(postId: string, variantId: string, patch: VariantPatch) {
  const { hashtags, ...rest } = patch;
  getDb()
    .update(schema.postVariants)
    .set({ ...rest, ...(hashtags ? { hashtags: JSON.stringify(hashtags) } : {}) })
    .where(and(eq(schema.postVariants.id, variantId), eq(schema.postVariants.postId, postId)))
    .run();
}

/** Replace the ordered media list of a post (keeps the poster role for poster assets). */
export function setPostAssets(postId: string, assetIds: string[]) {
  const db = getDb();
  const existing = assetIds.length ? db.select({ id: schema.assets.id, kind: schema.assets.kind }).from(schema.assets).where(inArray(schema.assets.id, assetIds)).all() : [];
  db.delete(schema.postAssets).where(eq(schema.postAssets.postId, postId)).run();
  assetIds.forEach((assetId, i) => {
    const a = existing.find((x) => x.id === assetId);
    if (!a) return;
    db.insert(schema.postAssets).values({ postId, assetId, role: a.kind === "poster" ? "poster" : "media", sortOrder: i }).run();
  });
  db.update(schema.posts).set({ updatedAt: nowIso() }).where(eq(schema.posts.id, postId)).run();
}

export function duplicatePost(id: string, userId?: string): string | null {
  const db = getDb();
  const post = db.select().from(schema.posts).where(eq(schema.posts.id, id)).get();
  if (!post) return null;
  const newPostId = newId("post");
  db.insert(schema.posts)
    .values({ id: newPostId, projectId: post.projectId, title: `${post.title} (copy)`, goal: post.goal, language: post.language, coreText: post.coreText, status: "draft", createdBy: userId ?? post.createdBy, notes: post.notes })
    .run();
  for (const v of db.select().from(schema.postVariants).where(eq(schema.postVariants.postId, id)).all()) {
    db.insert(schema.postVariants).values({ id: newId("var"), postId: newPostId, platform: v.platform, enabled: v.enabled, title: v.title, text: v.text, hashtags: v.hashtags, cta: v.cta, format: v.format }).run();
  }
  for (const a of db.select().from(schema.postAssets).where(eq(schema.postAssets.postId, id)).orderBy(asc(schema.postAssets.sortOrder)).all()) {
    db.insert(schema.postAssets).values({ postId: newPostId, assetId: a.assetId, role: a.role, sortOrder: a.sortOrder }).run();
  }
  return newPostId;
}

export function deletePost(id: string) {
  getDb().delete(schema.posts).where(eq(schema.posts.id, id)).run();
}

export function telegramThreadsFor(postId: string) {
  return getDb().select().from(schema.telegramThreads).where(eq(schema.telegramThreads.postId, postId)).orderBy(desc(schema.telegramThreads.createdAt)).all();
}

export function hashtagsOf(v: { hashtags: string | null }): string[] {
  return parseJson<string[]>(v.hashtags, []);
}
