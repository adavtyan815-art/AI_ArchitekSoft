/**
 * SMM service: create post packs from projects, schedule, Telegram approval, publish.
 *
 * Lifecycle:  draft → scheduled → awaiting_approval → approved → publishing → published
 *                                        ↘ (edit via Telegram) ↗           ↘ partially_published / failed
 */
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { generatePostPack, rewriteText, type Platform, type PostGoal } from "./ai";
import { getSetting } from "./settings";
import { absPath, mediaUrl } from "./media";
import * as tg from "./telegram";
import { ADAPTERS, PLATFORM_META, type PublishInput } from "./social";
import { nowIso, parseJson } from "./utils";
import { newId } from "./ids";
import type { Asset, Post, PostVariant } from "./db/schema";

export function getPostFull(postId: string) {
  const db = getDb();
  const post = db.select().from(schema.posts).where(eq(schema.posts.id, postId)).get();
  if (!post) return null;
  const variants = db.select().from(schema.postVariants).where(eq(schema.postVariants.postId, postId)).all();
  const links = db.select().from(schema.postAssets).where(eq(schema.postAssets.postId, postId)).orderBy(asc(schema.postAssets.sortOrder)).all();
  const assetIds = links.map((l) => l.assetId);
  const assetRows = assetIds.length ? db.select().from(schema.assets).where(inArray(schema.assets.id, assetIds)).all() : [];
  const assets = links.map((l) => ({ ...assetRows.find((a) => a.id === l.assetId)!, role: l.role })).filter((a) => a.id);
  const project = post.projectId ? db.select().from(schema.projects).where(eq(schema.projects.id, post.projectId)).get() : null;
  return { post, variants, assets, project };
}

export type CreatePostInput = {
  projectId?: string | null;
  assetIds: string[];
  platforms: Platform[];
  language: "hy" | "ru" | "en";
  goal: PostGoal;
  scheduledAt?: string | null;
  extraInstructions?: string;
  createdBy?: string;
};

export async function createPostPack(input: CreatePostInput) {
  const db = getDb();
  const project = input.projectId ? db.select().from(schema.projects).where(eq(schema.projects.id, input.projectId)).get() : null;
  const assets = input.assetIds.length ? db.select().from(schema.assets).where(inArray(schema.assets.id, input.assetIds)).all() : [];
  const ordered = input.assetIds.map((id) => assets.find((a) => a.id === id)).filter(Boolean) as Asset[];
  const images = ordered.filter((a) => a.mime.startsWith("image/")).length;
  const videos = ordered.filter((a) => a.mime.startsWith("video/"));
  const client = project?.clientId ? db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() : null;

  const pack = await generatePostPack({
    language: input.language,
    goal: input.goal,
    projectTitle: project?.title,
    projectType: project?.type,
    clientKind: project?.segment as "b2b" | "b2c" | undefined,
    materials: project?.materials ?? undefined,
    description: project?.description ?? undefined,
    city: client?.city ?? undefined,
    assetSummary: `${images} image(s)${videos.length ? `, ${videos.length} video(s)` : ""}`,
    hasVideo: videos.length > 0,
    extraInstructions: input.extraInstructions,
    platforms: input.platforms,
  });

  const postId = newId("post");
  db.insert(schema.posts)
    .values({
      id: postId,
      projectId: input.projectId ?? null,
      title: pack.title,
      goal: input.goal,
      language: input.language,
      coreText: pack.coreText,
      status: input.scheduledAt ? "scheduled" : "draft",
      scheduledAt: input.scheduledAt ?? null,
      createdBy: input.createdBy ?? null,
      notes: pack.warning ?? null,
    })
    .run();
  for (const v of pack.variants) {
    db.insert(schema.postVariants)
      .values({ id: newId("var"), postId, platform: v.platform, enabled: true, title: v.title ?? null, text: v.text, hashtags: JSON.stringify(v.hashtags), cta: v.cta ?? null, format: v.format })
      .run();
  }
  ordered.forEach((a, i) => db.insert(schema.postAssets).values({ postId, assetId: a.id, role: a.kind === "poster" ? "poster" : "media", sortOrder: i }).run());
  return { postId, provider: pack.provider, warning: pack.warning };
}

export function schedulePost(postId: string, scheduledAt: string | null) {
  getDb()
    .update(schema.posts)
    .set({ scheduledAt, status: scheduledAt ? "scheduled" : "draft", updatedAt: nowIso() })
    .where(eq(schema.posts.id, postId))
    .run();
}

export function setPostStatus(postId: string, status: string, extra: Partial<Post> = {}) {
  getDb().update(schema.posts).set({ status, updatedAt: nowIso(), ...extra }).where(eq(schema.posts.id, postId)).run();
}

// ---------------------------------------------------------------------------
// Telegram approval
// ---------------------------------------------------------------------------
function previewText(post: Post, variants: PostVariant[], header: string) {
  const enabled = variants.filter((v) => v.enabled);
  const lines: string[] = [header, ""];
  lines.push(`<b>${tg.escapeHtml(post.title)}</b>`);
  if (post.scheduledAt) lines.push(`🗓 ${new Date(post.scheduledAt).toLocaleString("en-GB", { timeZone: "Asia/Yerevan" })} (Yerevan)`);
  lines.push(`Platforms: ${enabled.map((v) => PLATFORM_META[v.platform]?.label ?? v.platform).join(", ")}`);
  lines.push("");
  const primary = enabled.find((v) => v.platform === "facebook") ?? enabled[0];
  if (primary) {
    lines.push(`<i>${PLATFORM_META[primary.platform]?.label ?? primary.platform} text:</i>`);
    lines.push(tg.escapeHtml(primary.text.slice(0, 700)));
    const tags = parseJson<string[]>(primary.hashtags, []);
    if (tags.length) lines.push(tg.escapeHtml(tags.join(" ")));
  }
  lines.push("", `Review all variants: ${env.appUrl}/admin/smm/${post.id}`);
  return lines.join("\n");
}

function approvalButtons(postId: string): tg.InlineButton[][] {
  return [
    [{ text: "✅ Approve & publish", callback_data: `ap:${postId}` }],
    [
      { text: "✏️ Edit text", callback_data: `ed:${postId}` },
      { text: "🕐 Tomorrow", callback_data: `pp:${postId}` },
    ],
    [
      { text: "⏭ Skip", callback_data: `sk:${postId}` },
      { text: "🔗 Open", url: `${env.appUrl}/admin/smm/${postId}` },
    ],
  ];
}

export async function sendForApproval(postId: string, header = "📣 <b>Post ready for approval</b>") {
  const full = getPostFull(postId);
  if (!full) throw new Error("Post not found");
  const chat = getSetting("telegram").adminChatId;
  const db = getDb();
  if (!chat || !tg.telegramEnabled()) {
    setPostStatus(postId, "awaiting_approval", { approvalSentAt: nowIso() });
    console.log(`[smm] approval (dry-run, no Telegram): post ${postId} awaiting approval in the admin UI`);
    return { ok: false, dryRun: true };
  }
  const text = previewText(full.post, full.variants, header);
  const video = full.assets.find((a) => a.mime.startsWith("video/"));
  const images = full.assets.filter((a) => a.mime.startsWith("image/"));
  let messageId = 0;
  try {
    if (video) {
      const r = await tg.sendVideo(chat, absPath(video.relPath), text.slice(0, 1000), approvalButtons(postId), "HTML");
      messageId = r.result.message_id;
      if (images.length) await tg.sendMediaGroup(chat, images.slice(0, 9).map((a) => ({ path: absPath(a.thumbRelPath || a.relPath), type: "photo" as const })));
    } else if (images.length > 1) {
      await tg.sendMediaGroup(chat, images.slice(0, 10).map((a) => ({ path: absPath(a.thumbRelPath || a.relPath), type: "photo" as const })));
      const r = await tg.sendMessage(chat, text, { buttons: approvalButtons(postId), parseMode: "HTML" });
      messageId = r.result.message_id;
    } else if (images.length === 1) {
      const r = await tg.sendPhoto(chat, absPath(images[0].relPath), text.slice(0, 1000), approvalButtons(postId), "HTML");
      messageId = r.result.message_id;
    } else {
      const r = await tg.sendMessage(chat, text, { buttons: approvalButtons(postId), parseMode: "HTML" });
      messageId = r.result.message_id;
    }
  } catch (e) {
    // Fallback: plain text without media so approval is still possible.
    const r = await tg.sendMessage(chat, `${text}\n\n⚠️ Media preview failed: ${tg.escapeHtml((e as Error).message)}`, { buttons: approvalButtons(postId), parseMode: "HTML" });
    messageId = r.result.message_id;
  }
  db.insert(schema.telegramThreads).values({ id: newId("tgt"), postId, chatId: chat, messageId, state: "sent" }).run();
  setPostStatus(postId, "awaiting_approval", { approvalSentAt: nowIso() });
  return { ok: true, messageId };
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------
export async function publishPost(postId: string, opts: { onlyPlatforms?: string[]; notify?: boolean } = {}) {
  const full = getPostFull(postId);
  if (!full) throw new Error("Post not found");
  const db = getDb();
  setPostStatus(postId, "publishing");
  const poster = full.assets.find((a) => a.role === "poster") ?? null;
  const media = full.assets.filter((a) => a.role !== "poster");
  const results: { platform: string; status: string; url?: string; error?: string; note?: string }[] = [];
  for (const v of full.variants) {
    if (!v.enabled) continue;
    if (opts.onlyPlatforms && !opts.onlyPlatforms.includes(v.platform)) continue;
    if (v.status === "published") continue;
    const adapter = ADAPTERS[v.platform];
    if (!adapter) continue;
    const input: PublishInput = { post: full.post, variant: v, assets: media, posterAsset: poster, publicBaseUrl: env.appUrl };
    const r = await adapter(input);
    db.update(schema.postVariants)
      .set({ status: r.status === "published" ? "published" : r.status === "simulated" ? "simulated" : "failed", externalId: r.externalId ?? null, externalUrl: r.externalUrl ?? null, error: r.error ?? r.note ?? null, publishedAt: r.status !== "failed" ? nowIso() : null })
      .where(eq(schema.postVariants.id, v.id))
      .run();
    results.push({ platform: v.platform, status: r.status, url: r.externalUrl, error: r.error, note: r.note });
  }
  const statuses = db.select({ status: schema.postVariants.status, enabled: schema.postVariants.enabled }).from(schema.postVariants).where(eq(schema.postVariants.postId, postId)).all().filter((s) => s.enabled);
  const okCount = statuses.filter((s) => s.status === "published" || s.status === "simulated").length;
  const failCount = statuses.filter((s) => s.status === "failed").length;
  const finalStatus = failCount === 0 ? "published" : okCount > 0 ? "partially_published" : "failed";
  setPostStatus(postId, finalStatus, { publishedAt: nowIso() });

  if (opts.notify !== false) {
    const chat = getSetting("telegram").adminChatId;
    if (chat && tg.telegramEnabled()) {
      const lines = [`${finalStatus === "published" ? "✅" : finalStatus === "failed" ? "❌" : "⚠️"} <b>${tg.escapeHtml(full.post.title)}</b> — ${finalStatus.replace("_", " ")}`];
      for (const r of results) {
        const icon = r.status === "published" ? "✅" : r.status === "simulated" ? "🧪" : "❌";
        lines.push(`${icon} ${PLATFORM_META[r.platform]?.label ?? r.platform}${r.url ? ` — ${r.url}` : ""}${r.error ? ` — ${tg.escapeHtml(r.error)}` : ""}${r.note && r.status === "simulated" ? ` — ${tg.escapeHtml(r.note.slice(0, 160))}` : ""}`);
      }
      try {
        await tg.sendMessage(chat, lines.join("\n"), { parseMode: "HTML" });
      } catch {
        /* ignore */
      }
    }
  }
  return { status: finalStatus, results };
}

// ---------------------------------------------------------------------------
// Telegram callbacks (approve / edit / skip / postpone) and edit replies
// ---------------------------------------------------------------------------
export async function handleTelegramCallback(data: string, chatId: string, messageId?: number): Promise<string> {
  const [action, postId, arg] = data.split(":");
  const full = getPostFull(postId);
  if (!full) return "Post not found";
  const db = getDb();
  const thread = db.select().from(schema.telegramThreads).where(eq(schema.telegramThreads.postId, postId)).orderBy(sql`created_at desc`).get();

  if (action === "ap") {
    setPostStatus(postId, "approved", { approvedAt: nowIso() });
    if (thread) db.update(schema.telegramThreads).set({ state: "approved", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "✅ Approved — publishing…", callback_data: "noop" }]]).catch(() => {});
    const r = await publishPost(postId);
    return r.status === "published" ? "Published" : r.status === "partially_published" ? "Partially published" : "Publishing failed";
  }
  if (action === "sk") {
    setPostStatus(postId, "cancelled");
    if (thread) db.update(schema.telegramThreads).set({ state: "rejected", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "⏭ Skipped", callback_data: "noop" }]]).catch(() => {});
    return "Skipped";
  }
  if (action === "pp") {
    const base = full.post.scheduledAt ? new Date(full.post.scheduledAt) : new Date();
    const next = new Date(base.getTime() + 86400_000).toISOString();
    schedulePost(postId, next);
    if (thread) db.update(schema.telegramThreads).set({ state: "rescheduled", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "🕐 Moved to tomorrow", callback_data: "noop" }]]).catch(() => {});
    return "Rescheduled to tomorrow";
  }
  if (action === "ed") {
    // Ask which platform to edit (or all)
    const enabled = full.variants.filter((v) => v.enabled);
    const rows: tg.InlineButton[][] = [[{ text: "All platforms", callback_data: `ep:${postId}:all` }]];
    for (const v of enabled) rows.push([{ text: PLATFORM_META[v.platform]?.label ?? v.platform, callback_data: `ep:${postId}:${v.platform}` }]);
    rows.push([{ text: "✨ Improve with AI instruction", callback_data: `ai:${postId}:all` }]);
    await tg.sendMessage(chatId, "Which text do you want to edit? Reply to my next message with the new text.", { buttons: rows });
    return "Choose platform";
  }
  if (action === "ep" || action === "ai") {
    const platform = arg || "all";
    if (thread) db.update(schema.telegramThreads).set({ state: "awaiting_edit", editingPlatform: `${action === "ai" ? "ai:" : ""}${platform}`, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    else db.insert(schema.telegramThreads).values({ id: newId("tgt"), postId, chatId, messageId: messageId ?? null, state: "awaiting_edit", editingPlatform: `${action === "ai" ? "ai:" : ""}${platform}` }).run();
    const current = platform === "all" ? full.variants.find((v) => v.enabled)?.text : full.variants.find((v) => v.platform === platform)?.text;
    const prompt = action === "ai" ? `✨ Reply to this message with an instruction (e.g. "shorter", "more formal", "mention the pilot offer").` : `✏️ Reply to this message with the new text for <b>${platform}</b>.\n\nCurrent:\n${tg.escapeHtml((current ?? "").slice(0, 900))}`;
    await tg.sendMessage(chatId, prompt, { parseMode: "HTML", forceReply: true });
    return "Waiting for your reply";
  }
  return "OK";
}

/** A plain message from the admin chat: if a thread awaits an edit, apply it. */
export async function handleTelegramReply(chatId: string, text: string): Promise<string | null> {
  const db = getDb();
  const thread = db.select().from(schema.telegramThreads).where(and(eq(schema.telegramThreads.chatId, chatId), eq(schema.telegramThreads.state, "awaiting_edit"))).orderBy(sql`updated_at desc`).get();
  if (!thread) return null;
  const full = getPostFull(thread.postId);
  if (!full) return null;
  const spec = thread.editingPlatform || "all";
  const useAi = spec.startsWith("ai:");
  const platform = spec.replace(/^ai:/, "");
  const targets = full.variants.filter((v) => v.enabled && (platform === "all" || v.platform === platform));
  for (const v of targets) {
    const newText = useAi ? await rewriteText(text, v.text, full.post.language as "hy" | "ru" | "en") : text;
    db.update(schema.postVariants).set({ text: newText }).where(eq(schema.postVariants.id, v.id)).run();
  }
  db.update(schema.telegramThreads).set({ state: "sent", editingPlatform: null, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
  setPostStatus(thread.postId, "awaiting_approval");
  await sendForApproval(thread.postId, `✏️ <b>Updated (${targets.length} variant${targets.length === 1 ? "" : "s"})</b> — approve?`);
  return "Updated";
}

// ---------------------------------------------------------------------------
// Scheduler helpers (called by the worker)
// ---------------------------------------------------------------------------
export function duePostsForApproval(): Post[] {
  const lead = getSetting("smm").approvalLeadMinutes;
  const threshold = new Date(Date.now() + lead * 60_000).toISOString();
  return getDb().select().from(schema.posts).where(and(eq(schema.posts.status, "scheduled"), lte(schema.posts.scheduledAt, threshold))).all();
}

export function duePostsForPublishing(): Post[] {
  if (!getSetting("smm").autoPublishAfterApproval) return [];
  return getDb().select().from(schema.posts).where(and(eq(schema.posts.status, "approved"), lte(schema.posts.scheduledAt, nowIso()))).all();
}

export function assetPreviewUrl(a: Asset) {
  return mediaUrl(a.thumbRelPath || a.relPath);
}
