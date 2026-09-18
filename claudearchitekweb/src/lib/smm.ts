/**
 * SMM service: create post packs from projects, schedule, Telegram approval, publish.
 *
 * Lifecycle:  draft → scheduled → sending_approval → awaiting_approval → approved → publishing → published
 *                                        ↘ (edit via Telegram) ↗              ↘ partially_published / failed
 *
 * Two states are transient claims, never a resting place: `sending_approval` and `publishing`.
 * A post enters them with a conditional UPDATE (see `claimPost`), so the 60-second scheduler tick,
 * the Telegram buttons and the admin's own "Publish now" can run at the same time without ever
 * sending an approval twice or publishing a variant twice. If the process dies inside a claim,
 * `sweepStalePost` (called by the worker on start and every tick) releases it again.
 */
import { and, asc, eq, inArray, isNull, lt, lte, notInArray, or, sql } from "drizzle-orm";
import { getDb, getSqlite, schema } from "./db";
import { env } from "./env";
import { aiStatus, generatePostPack, rewriteText, type Platform, type PostGoal } from "./ai";
import { getSetting } from "./settings";
import { absPath, mediaUrl } from "./media";
import { resolveUiLocale, socialMessages, type UiLocale } from "./social/messages";
import * as tg from "./telegram";
import { ADAPTERS, PLATFORM_META, type PublishInput } from "./social";
import { fmtYerevan, nextYerevanSlot } from "./tz";
import { nowIso, parseJson } from "./utils";
import { newId } from "./ids";
import type { Asset, Post, PostVariant } from "./db/schema";

/** Transient claim states. A post in one of these is owned by a running publish / approval send. */
export const BUSY_STATUSES = ["publishing", "sending_approval"];
/** Statuses a publish may start from (the admin UI applies the same list before it calls). */
const PUBLISHABLE_FROM = ["draft", "scheduled", "awaiting_approval", "approved", "failed", "partially_published"];
/** Statuses an approval send may start from. */
const APPROVABLE_FROM = ["draft", "scheduled", "awaiting_approval", "approved", "failed"];
/** A post left inside a claim for longer than this was interrupted by a restart. */
export const STALE_CLAIM_MS = 15 * 60_000;
/** An unanswered "reply with the new text" prompt stops accepting replies after this. */
export const EDIT_THREAD_TTL_MS = 24 * 3600_000;

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

/**
 * Moves a post into `to` only if it is currently in one of `from`, in a single SQL statement.
 * Returns false when another tick, button or browser tab got there first — the caller must then do nothing.
 */
function claimPost(postId: string, from: string[], to: string, extra: Partial<Post> = {}): boolean {
  const res = getDb()
    .update(schema.posts)
    .set({ status: to, updatedAt: nowIso(), ...extra })
    .where(and(eq(schema.posts.id, postId), inArray(schema.posts.status, from)))
    .run();
  return res.changes > 0;
}

function statusOf(postId: string): string | null {
  return getDb().select({ status: schema.posts.status }).from(schema.posts).where(eq(schema.posts.id, postId)).get()?.status ?? null;
}

/** The next slot from Settings → SMM (posting days + posting time, Yerevan), as ISO UTC. Null when not configured. */
export function nextPostingSlot(from: Date = new Date()): string | null {
  const smm = getSetting("smm");
  return nextYerevanSlot(smm.postingDays, smm.postingTime, from);
}

// ---------------------------------------------------------------------------
// Telegram approval
// ---------------------------------------------------------------------------
function previewText(post: Post, variants: PostVariant[], header: string) {
  const enabled = variants.filter((v) => v.enabled);
  const lines: string[] = [header, ""];
  lines.push(`<b>${tg.escapeHtml(post.title)}</b>`);
  if (post.scheduledAt) lines.push(`🗓 ${fmtYerevan(post.scheduledAt)} (Yerevan)`);
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
    // "Approve", not "Approve & publish": the schedule and the auto-publish setting still decide when it goes out.
    [{ text: "✅ Approve", callback_data: `ap:${postId}` }],
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

/** Caption that still fits under a photo/video together with the HTML markup. */
const APPROVAL_CAPTION_MAX = 1000;

export async function sendForApproval(postId: string, header = "📣 <b>Post ready for approval</b>") {
  const full = getPostFull(postId);
  if (!full) throw new Error("Post not found");
  const m = socialMessages(await resolveUiLocale());
  const previous = full.post.status;
  const chat = getSetting("telegram").adminChatId;
  const db = getDb();
  // Claim first: a slow media upload must not let the next scheduler tick send the same approval again.
  if (!claimPost(postId, APPROVABLE_FROM, "sending_approval")) throw new Error(statusOf(postId) === "sending_approval" ? m.busy : m.notPublishable);
  if (!chat || !tg.telegramEnabled()) {
    setPostStatus(postId, "awaiting_approval", { approvalSentAt: nowIso() });
    console.log(`[smm] approval (dry-run, no Telegram): post ${postId} awaiting approval in the admin UI`);
    return { ok: false as const, dryRun: true as const };
  }
  const text = previewText(full.post, full.variants, header);
  const video = full.assets.find((a) => a.mime.startsWith("video/"));
  const images = full.assets.filter((a) => a.mime.startsWith("image/"));
  let messageId = 0;
  try {
    try {
      if (video) {
        const r = await tg.sendVideo(chat, absPath(video.relPath), text.slice(0, APPROVAL_CAPTION_MAX), approvalButtons(postId), "HTML");
        messageId = r.result.message_id;
        if (images.length) await tg.sendMediaGroup(chat, images.slice(0, 9).map((a) => ({ path: absPath(a.thumbRelPath || a.relPath), type: "photo" as const })));
      } else if (images.length > 1) {
        await tg.sendMediaGroup(chat, images.slice(0, 10).map((a) => ({ path: absPath(a.thumbRelPath || a.relPath), type: "photo" as const })));
        const r = await tg.sendMessage(chat, text, { buttons: approvalButtons(postId), parseMode: "HTML" });
        messageId = r.result.message_id;
      } else if (images.length === 1) {
        const r = await tg.sendPhoto(chat, absPath(images[0].relPath), text.slice(0, APPROVAL_CAPTION_MAX), approvalButtons(postId), "HTML");
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
  } catch (e) {
    // Nothing reached Telegram: release the claim so the post keeps its place in the queue.
    setPostStatus(postId, previous);
    throw e;
  }
  // The buttons of the previous round must not stay tappable next to the new message.
  const previousThread = db.select().from(schema.telegramThreads).where(eq(schema.telegramThreads.postId, postId)).orderBy(sql`created_at desc`).get();
  if (previousThread) {
    if (previousThread.messageId && previousThread.messageId !== messageId) await tg.editReplyMarkup(chat, previousThread.messageId, []).catch(() => {});
    if (previousThread.state === "awaiting_edit") db.update(schema.telegramThreads).set({ state: "sent", editingPlatform: null, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, previousThread.id)).run();
  }
  db.insert(schema.telegramThreads).values({ id: newId("tgt"), postId, chatId: chat, messageId, state: "sent" }).run();
  setPostStatus(postId, "awaiting_approval", { approvalSentAt: nowIso() });
  return { ok: true as const, messageId };
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------
export type PublishOutcome = { platform: string; status: string; url?: string; error?: string; note?: string };
export type PublishPostResult =
  | { ok: true; status: string; results: PublishOutcome[] }
  | { ok: false; error: string; status: string; results: PublishOutcome[] };

/**
 * Publishes every enabled variant once. The post is claimed atomically, so a second call
 * (next scheduler tick, a Telegram tap, a second browser tab) returns without touching any platform.
 */
export async function publishPost(postId: string, opts: { onlyPlatforms?: string[]; notify?: boolean; locale?: UiLocale | null } = {}): Promise<PublishPostResult> {
  const locale = await resolveUiLocale(opts.locale);
  const m = socialMessages(locale);
  const existing = getPostFull(postId);
  if (!existing) throw new Error("Post not found");
  const publishedAtBefore = existing.post.publishedAt;

  if (!claimPost(postId, PUBLISHABLE_FROM, "publishing")) {
    const current = statusOf(postId) ?? existing.post.status;
    return { ok: false, error: BUSY_STATUSES.includes(current) ? m.busy : m.notPublishable, status: current, results: [] };
  }

  const db = getDb();
  const full = getPostFull(postId)!;
  const poster = full.assets.find((a) => a.role === "poster") ?? null;
  // Only the poster used as the branded first image is removed; further posters publish as ordinary images.
  const media = full.assets.filter((a) => a !== poster);
  const enabled = full.variants.filter((v) => v.enabled && (!opts.onlyPlatforms || opts.onlyPlatforms.includes(v.platform)));

  if (enabled.length === 0) {
    // Nothing is enabled: this is a configuration mistake, never a successful publish.
    setPostStatus(postId, "failed", { publishedAt: publishedAtBefore });
    return { ok: false, error: m.noPlatform, status: "failed", results: [] };
  }

  const results: PublishOutcome[] = [];
  for (const v of enabled) {
    const adapter = ADAPTERS[v.platform];
    if (!adapter) continue;
    // Variant-level claim: an interrupted run leaves it visible as "publishing" and the sweep repairs it,
    // and a variant that already went out is never sent twice.
    const claimed = db
      .update(schema.postVariants)
      .set({ status: "publishing" })
      .where(and(eq(schema.postVariants.id, v.id), notInArray(schema.postVariants.status, ["published", "publishing"])))
      .run().changes > 0;
    if (!claimed) continue;
    const input: PublishInput = { post: full.post, variant: v, assets: media, posterAsset: poster, publicBaseUrl: env.appUrl, locale };
    let r: Awaited<ReturnType<typeof adapter>>;
    try {
      r = await adapter(input);
    } catch (e) {
      r = { status: "failed", error: (e as Error).message };
    }
    db.update(schema.postVariants)
      .set({
        status: r.status === "published" ? "published" : r.status === "simulated" ? "simulated" : "failed",
        externalId: r.externalId ?? null,
        externalUrl: r.externalUrl ?? null,
        // The only per-variant text column: a real failure or, for a dry run, the simulation note.
        error: r.error ?? r.note ?? null,
        publishedAt: r.status !== "failed" ? nowIso() : null,
      })
      .where(eq(schema.postVariants.id, v.id))
      .run();
    results.push({ platform: v.platform, status: r.status, url: r.externalUrl, error: r.error, note: r.note });
  }

  const statuses = db.select({ status: schema.postVariants.status, enabled: schema.postVariants.enabled }).from(schema.postVariants).where(eq(schema.postVariants.postId, postId)).all().filter((s) => s.enabled);
  const okCount = statuses.filter((s) => s.status === "published" || s.status === "simulated").length;
  const finalStatus = okCount === statuses.length ? "published" : okCount > 0 ? "partially_published" : "failed";
  // published_at records when something actually went out; a failed run must not stamp one.
  setPostStatus(postId, finalStatus, { publishedAt: okCount > 0 ? publishedAtBefore ?? nowIso() : publishedAtBefore });

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
      } catch (e) {
        console.warn("[smm] publish notification failed:", (e as Error).message);
      }
    }
  }
  return { ok: true, status: finalStatus, results };
}

// ---------------------------------------------------------------------------
// Recovery: release claims left behind by a restart
// ---------------------------------------------------------------------------
export type SweptPost = { id: string; title: string; from: string; to: string };

/**
 * Releases posts stuck in a transient claim and expires forgotten "reply with the new text" threads.
 * Safe to call on every tick: it only touches rows whose updatedAt is older than the cut-off.
 */
export async function sweepStalePost(maxAgeMs = STALE_CLAIM_MS): Promise<SweptPost[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const swept: SweptPost[] = [];
  const stuck = db.select().from(schema.posts).where(and(inArray(schema.posts.status, BUSY_STATUSES), lt(schema.posts.updatedAt, cutoff))).all();
  if (stuck.length) {
    const m = socialMessages(await resolveUiLocale());
    for (const p of stuck) {
      // An interrupted publish is a failure the owner must look at; an interrupted send goes back in the queue.
      const to = p.status === "publishing" ? "failed" : p.scheduledAt ? "scheduled" : "draft";
      db.update(schema.postVariants).set({ status: "failed", error: m.interrupted }).where(and(eq(schema.postVariants.postId, p.id), eq(schema.postVariants.status, "publishing"))).run();
      setPostStatus(p.id, to);
      swept.push({ id: p.id, title: p.title, from: p.status, to });
    }
  }
  // A force-reply prompt nobody answered must stop swallowing later messages.
  const editCutoff = new Date(Date.now() - EDIT_THREAD_TTL_MS).toISOString();
  db.update(schema.telegramThreads)
    .set({ state: "sent", editingPlatform: null, updatedAt: nowIso() })
    .where(and(eq(schema.telegramThreads.state, "awaiting_edit"), lt(schema.telegramThreads.updatedAt, editCutoff)))
    .run();
  return swept;
}

// ---------------------------------------------------------------------------
// Telegram callbacks (approve / edit / skip / postpone) and edit replies
// ---------------------------------------------------------------------------
const STATUS_WORDS: Record<string, string> = {
  draft: "a draft",
  scheduled: "scheduled",
  sending_approval: "being sent for approval",
  awaiting_approval: "awaiting approval",
  approved: "approved",
  publishing: "publishing right now",
  published: "published",
  partially_published: "partially published",
  failed: "failed",
  cancelled: "cancelled",
};
const statusWord = (s: string) => STATUS_WORDS[s] ?? s.replace(/_/g, " ");

/** Which post statuses each button is still valid for. A button from an old thread must never act. */
const CALLBACK_ALLOWED: Record<string, string[]> = {
  // "Send for approval" on an inbox suggestion: only while the draft is still waiting to be sent.
  sa: ["draft", "scheduled"],
  ap: ["awaiting_approval"],
  sk: ["awaiting_approval"],
  pp: ["awaiting_approval", "scheduled"],
  ed: ["awaiting_approval"],
  ep: ["awaiting_approval"],
  ai: ["awaiting_approval"],
};

export async function handleTelegramCallback(data: string, chatId: string, messageId?: number): Promise<string> {
  const [action, postId, arg] = data.split(":");
  const full = getPostFull(postId);
  if (!full) return "Post not found";
  const db = getDb();
  const thread = db.select().from(schema.telegramThreads).where(eq(schema.telegramThreads.postId, postId)).orderBy(sql`created_at desc`).get();

  const allowed = CALLBACK_ALLOWED[action];
  if (allowed && !allowed.includes(full.post.status)) {
    // Stale button (the post moved on in the admin, or the message is days old): strip it and say why.
    if (messageId) await tg.editReplyMarkup(chatId, messageId, []).catch(() => {});
    return `Too late — this post is ${statusWord(full.post.status)}.`;
  }

  if (action === "sa") {
    // From the inbox suggestion message. sendForApproval claims the post itself, so a double tap
    // cannot send two approval rounds; its own message says why when the claim fails.
    const r = await sendForApproval(postId);
    const dry = "dryRun" in r && r.dryRun;
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: dry ? "📣 Awaiting approval" : "📣 Sent for approval", callback_data: "noop" }]]).catch(() => {});
    return dry ? "Marked awaiting approval (no Telegram channel configured)" : "Sent for approval";
  }
  if (action === "ap") {
    const smm = getSetting("smm");
    const due = !full.post.scheduledAt || new Date(full.post.scheduledAt).getTime() <= Date.now();
    if (thread) db.update(schema.telegramThreads).set({ state: "approved", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (smm.autoPublishAfterApproval && due) {
      // Straight from awaiting_approval into the publish claim: no "approved" window the scheduler could also pick up.
      setPostStatus(postId, "awaiting_approval", { approvedAt: nowIso() });
      if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "✅ Approved — publishing…", callback_data: "noop" }]]).catch(() => {});
      const r = await publishPost(postId);
      if (!r.ok) {
        if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "❌ Could not publish", callback_data: "noop" }]]).catch(() => {});
        return r.error;
      }
      return r.status === "published" ? "Published" : r.status === "partially_published" ? "Partially published" : "Publishing failed";
    }
    // Approve only: the schedule the owner set, and the auto-publish setting, still decide when it goes out.
    setPostStatus(postId, "approved", { approvedAt: nowIso() });
    const waiting = !smm.autoPublishAfterApproval ? "waits for manual Publish" : `publishes at ${fmtYerevan(full.post.scheduledAt)} (Yerevan)`;
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: `✅ Approved — ${waiting}`, callback_data: "noop" }]]).catch(() => {});
    return `Approved — ${waiting}`;
  }
  if (action === "sk") {
    setPostStatus(postId, "cancelled");
    if (thread) db.update(schema.telegramThreads).set({ state: "rejected", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: "⏭ Skipped", callback_data: "noop" }]]).catch(() => {});
    return "Skipped";
  }
  if (action === "pp") {
    // From now, never from an overdue schedule: +24 h on a date three days old is still in the past.
    const base = Math.max(full.post.scheduledAt ? new Date(full.post.scheduledAt).getTime() : 0, Date.now());
    const next = new Date(base + 86400_000).toISOString();
    schedulePost(postId, next);
    if (thread) db.update(schema.telegramThreads).set({ state: "rescheduled", updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    if (messageId) await tg.editReplyMarkup(chatId, messageId, [[{ text: `🕐 Moved to ${fmtYerevan(next)}`, callback_data: "noop" }]]).catch(() => {});
    return `Rescheduled to ${fmtYerevan(next)} (Yerevan)`;
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
    if (action === "ai" && aiStatus().provider === "template") {
      await tg.sendMessage(chatId, "No AI key is configured, so I cannot rewrite the text. Add ANTHROPIC_API_KEY in .env, or use ✏️ Edit text and send the new text yourself.");
      return "No AI key configured";
    }
    const current = platform === "all" ? full.variants.find((v) => v.enabled)?.text : full.variants.find((v) => v.platform === platform)?.text;
    const prompt =
      action === "ai"
        ? `✨ Reply to this message with an instruction (e.g. "shorter", "more formal", "mention the pilot offer").`
        : `✏️ Reply to this message with the new text for <b>${tg.escapeHtml(platform)}</b>.\n\nCurrent:\n${tg.escapeHtml((current ?? "").slice(0, 900))}`;
    const sent = await tg.sendMessage(chatId, prompt, { parseMode: "HTML", forceReply: true });
    // The thread now waits for a reply to THIS prompt: its id is what handleTelegramReply matches against.
    const promptId = sent.result.message_id;
    const editingPlatform = `${action === "ai" ? "ai:" : ""}${platform}`;
    if (thread) db.update(schema.telegramThreads).set({ state: "awaiting_edit", editingPlatform, messageId: promptId, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
    else db.insert(schema.telegramThreads).values({ id: newId("tgt"), postId, chatId, messageId: promptId, state: "awaiting_edit", editingPlatform }).run();
    return "Waiting for your reply";
  }
  return "OK";
}

/** Statuses whose text must not be rewritten from a chat message any more. */
const UNEDITABLE = ["published", "partially_published", "publishing", "sending_approval", "cancelled"];

/**
 * A plain message from the admin chat. It is applied ONLY when it is a reply to the prompt that opened
 * the edit (`replyToMessageId`), so a forgotten thread can never swallow an unrelated message days later.
 */
export async function handleTelegramReply(chatId: string, text: string, replyToMessageId?: number): Promise<string | null> {
  const db = getDb();
  // A command is never post text.
  if (text.startsWith("/")) return null;
  const thread = db
    .select()
    .from(schema.telegramThreads)
    .where(and(eq(schema.telegramThreads.chatId, chatId), eq(schema.telegramThreads.state, "awaiting_edit")))
    .orderBy(sql`updated_at desc`)
    .get();
  if (!thread) return null;
  const closeThread = (state: string) => db.update(schema.telegramThreads).set({ state, editingPlatform: null, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
  if (Date.now() - new Date(thread.updatedAt).getTime() > EDIT_THREAD_TTL_MS) {
    closeThread("sent");
    return null;
  }
  // Only the reply to the prompt counts. A message typed without replying is left for the other handlers.
  if (!thread.messageId || replyToMessageId !== thread.messageId) return null;

  const full = getPostFull(thread.postId);
  if (!full) {
    closeThread("sent");
    return null;
  }
  if (UNEDITABLE.includes(full.post.status)) {
    closeThread("sent");
    await tg.sendMessage(chatId, `This post is ${statusWord(full.post.status)} — its text is not edited any more.`).catch(() => {});
    return "Not editable";
  }

  const spec = thread.editingPlatform || "all";
  const useAi = spec.startsWith("ai:");
  const platform = spec.replace(/^ai:/, "");
  const targets = full.variants.filter((v) => v.enabled && (platform === "all" || v.platform === platform));
  if (!targets.length) {
    closeThread("sent");
    await tg.sendMessage(chatId, "No enabled platform to edit.").catch(() => {});
    return "Nothing to edit";
  }

  // Every rewrite is computed first: a failure halfway must not leave some variants rewritten and others not.
  const edits: { id: string; text: string }[] = [];
  if (useAi) {
    if (aiStatus().provider === "template") {
      await tg.sendMessage(chatId, "No AI key is configured, so nothing was changed. Add ANTHROPIC_API_KEY in .env, or use ✏️ Edit text and send the new text yourself.").catch(() => {});
      return "No AI key configured";
    }
    try {
      for (const v of targets) edits.push({ id: v.id, text: await rewriteText(text, v.text, full.post.language as "hy" | "ru" | "en") });
    } catch (e) {
      // The thread stays open, so a retry starts from the unchanged text.
      await tg.sendMessage(chatId, `⚠️ The rewrite failed: ${tg.escapeHtml((e as Error).message)}\n\nReply again to try once more.`, { parseMode: "HTML" }).catch(() => {});
      return "Rewrite failed";
    }
  } else {
    for (const v of targets) edits.push({ id: v.id, text });
  }

  getSqlite().transaction(() => {
    for (const e of edits) db.update(schema.postVariants).set({ text: e.text }).where(eq(schema.postVariants.id, e.id)).run();
    db.update(schema.telegramThreads).set({ state: "sent", editingPlatform: null, updatedAt: nowIso() }).where(eq(schema.telegramThreads.id, thread.id)).run();
  })();

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

/** Approved posts that are due. A post approved without a schedule is due immediately, not never. */
export function duePostsForPublishing(): Post[] {
  if (!getSetting("smm").autoPublishAfterApproval) return [];
  return getDb()
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.status, "approved"), or(isNull(schema.posts.scheduledAt), lte(schema.posts.scheduledAt, nowIso()))))
    .all();
}

export function assetPreviewUrl(a: Asset) {
  return mediaUrl(a.thumbRelPath || a.relPath);
}
