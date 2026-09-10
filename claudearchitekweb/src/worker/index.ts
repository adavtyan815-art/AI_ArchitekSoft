/**
 * Background worker: scheduler (every 60 s) + Telegram long-polling bot.
 * Runs inside the Next.js process when RUN_WORKER_IN_APP=true (default),
 * or standalone via `npm run worker`.
 */
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "../lib/db";
import { getSetting, saveSetting } from "../lib/settings";
import * as tg from "../lib/telegram";
import { duePostsForApproval, duePostsForPublishing, handleTelegramCallback, handleTelegramReply, publishPost, sendForApproval } from "../lib/smm";
import { env } from "../lib/env";
import { nowIso } from "../lib/utils";

declare global {
  // eslint-disable-next-line no-var
  var __architek_worker: { started: boolean; stop?: () => void } | undefined;
}

const log = (...a: unknown[]) => console.log("[worker]", ...a);

async function schedulerTick() {
  try {
    for (const post of duePostsForApproval()) {
      log(`sending post ${post.id} for approval`);
      await sendForApproval(post.id);
    }
    for (const post of duePostsForPublishing()) {
      log(`publishing approved post ${post.id}`);
      await publishPost(post.id);
    }
    await maybeDailyDigest();
  } catch (e) {
    console.error("[worker] tick failed", (e as Error).message);
  }
}

async function maybeDailyDigest() {
  const t = getSetting("telegram");
  if (!t.adminChatId || !t.dailyDigestTime || !tg.telegramEnabled()) return;
  const now = new Date();
  const yerevan = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Yerevan" }));
  const hhmm = `${String(yerevan.getHours()).padStart(2, "0")}:${String(yerevan.getMinutes()).padStart(2, "0")}`;
  if (hhmm !== t.dailyDigestTime) return;
  const today = yerevan.toISOString().slice(0, 10);
  const db = getDb();
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, "digest_last")).get();
  if (row && JSON.parse(row.value) === today) return;
  db.insert(schema.settings).values({ key: "digest_last", value: JSON.stringify(today), updatedAt: nowIso() }).onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(today), updatedAt: nowIso() } }).run();

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
    postsToday.length ? `📣 Posts today: ${postsToday.map((p) => `${p.title} (${p.status})`).join("; ")}` : "📣 No posts scheduled for today",
    `${env.appUrl}/admin`,
  ];
  await tg.sendMessage(t.adminChatId, lines.join("\n"), { parseMode: "HTML" }).catch(() => {});
}

async function handleUpdate(u: tg.TelegramUpdate) {
  const adminChat = getSetting("telegram").adminChatId;
  if (u.callback_query) {
    const cq = u.callback_query;
    const chatId = String(cq.message?.chat.id ?? "");
    if (adminChat && chatId !== adminChat) {
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
      await tg.sendMessage(chatId, `Hello ${u.message.from?.first_name ?? ""}! This chat id is <code>${chatId}</code>.\n${adminChat === chatId ? "✅ This chat is the admin chat." : "Paste it in Admin → Settings → Telegram, or press /setadmin if nobody is set yet."}`, { parseMode: "HTML" });
      return;
    }
    if (text === "/setadmin" && !adminChat) {
      saveSetting("telegram", { adminChatId: chatId });
      await tg.sendMessage(chatId, "✅ This chat is now the admin chat. You will receive approvals and notifications here.");
      return;
    }
    if (adminChat && chatId !== adminChat) return;
    if (text === "/status") {
      const db = getDb();
      const pending = db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "awaiting_approval")).get()?.c ?? 0;
      const scheduled = db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, "scheduled")).get()?.c ?? 0;
      await tg.sendMessage(chatId, `📊 Awaiting approval: ${pending}\n🗓 Scheduled: ${scheduled}\n${env.appUrl}/admin/smm`);
      return;
    }
    const handled = await handleTelegramReply(chatId, text);
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
  globalThis.__architek_worker = { started: true, stop: () => (state.running = false) };
  log(`started (telegram: ${tg.telegramEnabled() ? "on" : "dry-run"})`);
  void schedulerTick();
  const interval = setInterval(schedulerTick, 60_000);
  void pollLoop(state);
  return () => {
    state.running = false;
    clearInterval(interval);
    globalThis.__architek_worker = { started: false };
  };
}
