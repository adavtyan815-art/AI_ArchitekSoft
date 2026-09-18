/**
 * Background worker: scheduler (every 60 s) + Telegram long-polling bot.
 * Runs inside the Next.js process when RUN_WORKER_IN_APP=true (default),
 * or standalone via `npm run worker`.
 *
 * Two rules keep the scheduler honest:
 *  - ticks never overlap: the next one is armed only after the current one has finished, so a slow
 *    upload can never let a second tick publish the same post;
 *  - one broken post never blocks the rest: every send/publish has its own try/catch and a growing
 *    back-off, so a post whose media cannot be sent is not re-uploaded every 60 seconds.
 */
import { and, eq, gte, isNull, like, lt, sql } from "drizzle-orm";
import { getDb, schema } from "../lib/db";
import { getSetting, saveSetting } from "../lib/settings";
import * as tg from "../lib/telegram";
import { duePostsForApproval, duePostsForPublishing, handleTelegramCallback, handleTelegramReply, publishPost, sendForApproval, sweepStalePost } from "../lib/smm";
import { runInbox } from "../lib/inbox";
import { cleanupDerived } from "../lib/social/media-prep";
import { deleteAsset } from "../lib/media";
import { env } from "../lib/env";
import { safeEqual } from "../lib/ids";
import { yerevanDay, yerevanHhmm } from "../lib/tz";
import { nowIso } from "../lib/utils";

declare global {
  var __architek_worker: { started: boolean; stop?: () => void } | undefined;
}

const log = (...a: unknown[]) => console.log("[worker]", ...a);

const TICK_MS = 60_000;
/** After a failure the same post is left alone for 5 min, 10 min, 15 min … up to an hour. */
const BACKOFF_STEP_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 60 * 60_000;
/** Orphaned public uploads and derived images are swept once an hour, not on every tick. */
const CLEANUP_EVERY_MS = 3600_000;
const ORPHAN_UPLOAD_AGE_MS = 24 * 3600_000;

const failures = new Map<string, { at: number; count: number }>();
let lastCleanup = 0;

function inBackoff(postId: string): boolean {
  const f = failures.get(postId);
  if (!f) return false;
  return Date.now() - f.at < Math.min(BACKOFF_STEP_MS * f.count, BACKOFF_MAX_MS);
}

function noteFailure(postId: string, what: string, e: unknown) {
  const f = failures.get(postId);
  const count = (f?.count ?? 0) + 1;
  failures.set(postId, { at: Date.now(), count });
  const wait = Math.round(Math.min(BACKOFF_STEP_MS * count, BACKOFF_MAX_MS) / 60_000);
  console.error(`[worker] ${what} failed for post ${postId} (attempt ${count}, retry in ${wait} min):`, (e as Error).message);
}

/** Runs a step so that its failure can never abort the rest of the tick. */
async function step(what: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(`[worker] ${what} failed:`, (e as Error).message);
  }
}

async function schedulerTick() {
  // The digest goes first: a slow upload further down must never push it past its minute.
  await step("daily digest", maybeDailyDigest);
  await step("stale claim sweep", releaseStaleClaims);
  // Local drop folder. Wrapped in `step`, so an unreadable inbox (permissions, a disconnected
  // network drive) can never stop the scheduling and publishing below.
  await step("inbox scan", scanLocalInbox);

  for (const post of duePostsForApproval()) {
    if (inBackoff(post.id)) continue;
    try {
      log(`sending post ${post.id} for approval`);
      await sendForApproval(post.id);
      failures.delete(post.id);
    } catch (e) {
      noteFailure(post.id, "approval send", e);
    }
  }
  for (const post of duePostsForPublishing()) {
    if (inBackoff(post.id)) continue;
    try {
      log(`publishing approved post ${post.id}`);
      const r = await publishPost(post.id);
      if (r.ok) failures.delete(post.id);
      else noteFailure(post.id, "publish", new Error(r.error));
    } catch (e) {
      noteFailure(post.id, "publish", e);
    }
  }

  if (Date.now() - lastCleanup > CLEANUP_EVERY_MS) {
    lastCleanup = Date.now();
    await step("cleanup", async () => {
      const uploads = cleanupOrphanUploads();
      const derived = cleanupDerived();
      if (uploads || derived) log(`cleanup: ${uploads} orphaned upload(s), ${derived} derived image(s)`);
    });
  }
}

/**
 * Imports whatever the owner finished copying into the inbox folder and suggests each new draft.
 * Ticks never overlap, and every folder is claimed with an atomic rename, so this can also run at
 * the same moment as an "Import now" click in the admin without importing anything twice.
 */
/** When each blocked inbox folder was last complained about, so it is not logged every 60 seconds. */
const blockedInboxLogged = new Map<string, number>();
const BLOCKED_LOG_EVERY_MS = 15 * 60_000;

async function scanLocalInbox() {
  const { imported, blocked } = await runInbox();
  for (const r of imported) {
    if (r.ok) {
      const partial = r.unreadable ? `, ${r.unreadable} file(s) unreadable → _failed/` : "";
      log(`inbox: imported "${r.name}" → post ${r.postId} (${r.assets} file(s))${r.warnings.length ? `, ${r.warnings.length} warning(s)` : ""}${partial}`);
    } else log(`inbox: "${r.name}" failed — ${r.error}`);
  }
  // A folder nothing can move (open in Explorer, in an editor, being scanned by antivirus) retries
  // on every tick. It has to be said, and it must not be said sixty times an hour.
  for (const r of blocked) {
    const last = blockedInboxLogged.get(r.name) ?? 0;
    if (Date.now() - last < BLOCKED_LOG_EVERY_MS) continue;
    blockedInboxLogged.set(r.name, Date.now());
    log(`inbox: "${r.name}" could not be imported — a file in it is open in another program (${r.error})`);
  }
  const names = new Set(blocked.map((r) => r.name));
  for (const name of [...blockedInboxLogged.keys()]) if (!names.has(name)) blockedInboxLogged.delete(name);
}

/** A post left in `publishing` / `sending_approval` by a restart is released and the owner is told. */
async function releaseStaleClaims() {
  const swept = await sweepStalePost();
  if (!swept.length) return;
  for (const p of swept) log(`released stale post ${p.id} (${p.from} → ${p.to})`);
  const chat = getSetting("telegram").adminChatId;
  if (!chat || !tg.telegramEnabled()) return;
  const lines = ["⚠️ <b>Interrupted while publishing</b>", ...swept.map((p) => `• ${tg.escapeHtml(p.title)} — now ${p.to.replace(/_/g, " ")}`), `${env.appUrl}/admin/smm`];
  await tg.sendMessage(chat, lines.join("\n"), { parseMode: "HTML" });
}

/** Deletes public uploads that never became a lead attachment (abandoned /start wizards). */
function cleanupOrphanUploads(): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - ORPHAN_UPLOAD_AGE_MS).toISOString();
  const rows = db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(and(eq(schema.assets.kind, "client_upload"), isNull(schema.assets.projectId), isNull(schema.assets.leadId), lt(schema.assets.createdAt, cutoff)))
    .all();
  let removed = 0;
  for (const row of rows) {
    // leads.files is a JSON id list, so a LIKE on the id is enough to tell "attached" from "orphan".
    const used = db.select({ id: schema.leads.id }).from(schema.leads).where(like(schema.leads.files, `%${row.id}%`)).get();
    if (used) continue;
    try {
      if (deleteAsset(row.id)) removed++;
    } catch (e) {
      console.error("[worker] could not delete orphaned upload", row.id, (e as Error).message);
    }
  }
  return removed;
}

/** "H:M" → "HH:MM" so the comparison with the current Yerevan time is a plain string compare. */
function normalizeHhmm(value: string): string | null {
  const m = /^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/.exec(value ?? "");
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/**
 * Sends the daily brief once per Yerevan day, at or after the configured time — a tick that lands on
 * 09:01 (slow previous tick, restart, drift) still sends it. The "already sent" marker is written only
 * after Telegram accepted the message, so a failure does not silently cost the owner that day's digest.
 */
async function maybeDailyDigest() {
  const t = getSetting("telegram");
  const at = normalizeHhmm(t.dailyDigestTime);
  if (!t.adminChatId || !at || !tg.telegramEnabled()) return;
  const now = new Date();
  if (yerevanHhmm(now) < at) return;
  const today = yerevanDay(now.toISOString());
  const db = getDb();
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, "digest_last")).get();
  if (row && JSON.parse(row.value) === today) return;

  const since = new Date(Date.now() - 86400_000).toISOString();
  const newLeads = db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(gte(schema.leads.createdAt, since)).get()?.c ?? 0;
  const openLeads = db.select({ c: sql<number>`count(*)` }).from(schema.leads).where(sql`status in ('new','contacted')`).get()?.c ?? 0;
  const dayEnd = new Date(Date.now() + 86400_000).toISOString();
  const postsToday = db.select().from(schema.posts).where(and(sql`status in ('scheduled','awaiting_approval','approved')`, sql`scheduled_at <= ${dayEnd}`)).all();
  const feedback = db.select({ c: sql<number>`count(*)` }).from(schema.clientFeedback).where(and(gte(schema.clientFeedback.createdAt, since), eq(schema.clientFeedback.resolved, false))).get()?.c ?? 0;
  const lines = [
    `☀️ <b>Daily brief — ${today}</b>`,
    `🆕 New requests (24h): ${newLeads}   •   Open leads: ${openLeads}`,
    `💬 Unresolved client feedback: ${feedback}`,
    // Titles are user input: "<" in a title would otherwise break the HTML message and lose the digest.
    postsToday.length ? `📣 Posts today: ${postsToday.map((p) => `${tg.escapeHtml(p.title)} (${p.status})`).join("; ")}` : "📣 No posts scheduled for today",
    `${env.appUrl}/admin`,
  ];
  await tg.sendMessage(t.adminChatId, lines.join("\n"), { parseMode: "HTML" });
  db.insert(schema.settings)
    .values({ key: "digest_last", value: JSON.stringify(today), updatedAt: nowIso() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(today), updatedAt: nowIso() } })
    .run();
}

async function handleUpdate(u: tg.TelegramUpdate) {
  const adminChat = getSetting("telegram").adminChatId;
  if (u.callback_query) {
    const cq = u.callback_query;
    const chatId = String(cq.message?.chat.id ?? "");
    // While no admin chat is bound, nobody may press the buttons — they publish to real accounts.
    if (!adminChat || chatId !== adminChat) {
      await tg.answerCallback(cq.id, "Not authorised");
      return;
    }
    if (!cq.data || cq.data === "noop") return void (await tg.answerCallback(cq.id));
    try {
      const msg = await handleTelegramCallback(cq.data, chatId, cq.message?.message_id);
      await tg.answerCallback(cq.id, msg.slice(0, 180));
    } catch (e) {
      await tg.answerCallback(cq.id, `Error: ${(e as Error).message}`.slice(0, 180));
    }
    return;
  }
  if (u.message?.text) {
    const chatId = String(u.message.chat.id);
    const text = u.message.text.trim();
    if (text === "/start" || text === "/chatid" || text === "/id") {
      // first_name is user input and the message is HTML: "Ann <3" must not swallow the reply.
      const name = tg.escapeHtml(u.message.from?.first_name ?? "");
      await tg.sendMessage(
        chatId,
        `Hello ${name}! This chat id is <code>${chatId}</code>.\n${adminChat === chatId ? "✅ This chat is the admin chat." : "Paste it in Admin → Settings → Telegram, or send /setadmin followed by the code shown there."}`,
        { parseMode: "HTML" }
      );
      return;
    }
    if (text === "/setadmin" || text.startsWith("/setadmin ")) {
      if (adminChat) {
        await tg.sendMessage(chatId, "An admin chat is already set. Change it in Admin → Settings → Telegram.");
        return;
      }
      const given = text.slice("/setadmin".length).trim().toLowerCase();
      if (!safeEqual(given, tg.setAdminCode())) {
        await tg.sendMessage(chatId, "Send <code>/setadmin &lt;code&gt;</code> — the code is in Admin → Settings → Telegram.", { parseMode: "HTML" });
        return;
      }
      saveSetting("telegram", { adminChatId: chatId });
      await tg.sendMessage(chatId, "✅ This chat is now the admin chat. You will receive approvals and notifications here.");
      return;
    }
    // Everything below is owner-only and does nothing until an admin chat is bound.
    if (!adminChat || chatId !== adminChat) return;
    if (text === "/status") {
      const db = getDb();
      const pending = db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "awaiting_approval")).get()?.c ?? 0;
      const scheduled = db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "scheduled")).get()?.c ?? 0;
      await tg.sendMessage(chatId, `📊 Awaiting approval: ${pending}\n🗓 Scheduled: ${scheduled}\n${env.appUrl}/admin/smm`);
      return;
    }
    // Only a reply to the bot's own "send me the new text" prompt edits a post.
    const handled = await handleTelegramReply(chatId, text, u.message.reply_to_message?.message_id);
    if (!handled && text.startsWith("/")) await tg.sendMessage(chatId, "Commands: /status, /chatid");
  }
}

async function pollLoop(state: { running: boolean }) {
  let offset = 0;
  let backoff = 2000;
  while (state.running) {
    if (!tg.telegramEnabled()) {
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }
    try {
      const updates = await tg.getUpdates(offset, 25);
      backoff = 2000;
      for (const u of updates) {
        offset = u.update_id + 1;
        await handleUpdate(u).catch((e) => console.error("[worker] update failed", (e as Error).message));
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (!/aborted|timeout/i.test(msg)) console.error("[worker] poll error", msg);
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}

export function startWorker() {
  if (globalThis.__architek_worker?.started) return;
  const state = { running: true };
  let timer: ReturnType<typeof setTimeout> | null = null;
  globalThis.__architek_worker = { started: true, stop: () => (state.running = false) };
  log(`started (telegram: ${tg.telegramEnabled() ? "on" : "dry-run"})`);

  // The next tick is armed only when the current one has finished, so two ticks can never overlap.
  const loop = async () => {
    await schedulerTick().catch((e) => console.error("[worker] tick failed", (e as Error).message));
    if (state.running) timer = setTimeout(loop, TICK_MS);
  };
  void loop();
  void pollLoop(state);
  return () => {
    state.running = false;
    if (timer) clearTimeout(timer);
    globalThis.__architek_worker = { started: false };
  };
}
