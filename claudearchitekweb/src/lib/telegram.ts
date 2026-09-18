/**
 * Minimal Telegram Bot API client (no dependency). Used for:
 *  - approval workflow (post preview + inline buttons)
 *  - notifications (new lead, client feedback, daily digest)
 *  - publishing to a Telegram channel
 * When TELEGRAM_BOT_TOKEN is missing every call becomes a logged dry-run.
 *
 * Every outbound request has a timeout, so a slow Telegram can never hang a request handler
 * or the poll loop of the worker. Files are attached as lazy file-backed blobs (no full read into memory).
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";
import { hmac, sha256 } from "./ids";

const API = "https://api.telegram.org";

/**
 * Code that lets the owner bind a chat as the admin chat with `/setadmin <code>`.
 * Derived from APP_SECRET (no new env var) and shown in Admin → Settings → Telegram, so a stranger
 * who finds the bot cannot claim the admin chat and start receiving leads and approval buttons.
 * Lower-case hex, because it is typed on a phone.
 */
export function setAdminCode(): string {
  return sha256(hmac(env.secret, "telegram-setadmin")).slice(0, 10);
}

/** Bot API limits. */
export const CAPTION_MAX = 1024;
export const TEXT_MAX = 4096;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MAX_BYTES = 50 * 1024 * 1024;

const JSON_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 180_000;

export type InlineButton = { text: string; callback_data?: string; url?: string };

export function telegramEnabled() {
  return !!env.telegram.botToken;
}

function isTimeout(e: unknown) {
  const name = (e as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

async function call<T = unknown>(method: string, body?: Record<string, unknown> | FormData): Promise<T> {
  if (!env.telegram.botToken) {
    console.log(`[telegram:dry-run] ${method}`, body instanceof FormData ? "(multipart)" : JSON.stringify(body).slice(0, 300));
    return { ok: true, result: { message_id: 0, dry_run: true } } as unknown as T;
  }
  const url = `${API}/bot${env.telegram.botToken}/${method}`;
  const multipart = body instanceof FormData;
  const timeoutMs = multipart ? UPLOAD_TIMEOUT_MS : JSON_TIMEOUT_MS;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: multipart ? body : JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // Re-thrown with a clean message: the raw network error can carry the request URL, which contains the bot token.
    throw new Error(isTimeout(e) ? `Telegram ${method}: timed out after ${Math.round(timeoutMs / 1000)} s` : `Telegram ${method}: network error`);
  }
  const json = (await res.json().catch(() => null)) as { ok: boolean; description?: string; result?: unknown } | null;
  if (!json) throw new Error(`Telegram ${method}: HTTP ${res.status}`);
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json as T;
}

type SendResult = { ok: boolean; result: { message_id: number; chat?: { id: number } } };

export async function sendMessage(chatId: string, text: string, opts?: { buttons?: InlineButton[][]; parseMode?: "HTML" | "MarkdownV2"; disablePreview?: boolean; forceReply?: boolean }) {
  return call<SendResult>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode,
    disable_web_page_preview: opts?.disablePreview ?? true,
    reply_markup: opts?.forceReply ? { force_reply: true, selective: true } : opts?.buttons ? { inline_keyboard: opts.buttons } : undefined,
  });
}

/**
 * Splits plain text into chunks Telegram accepts (4096 chars), preferring paragraph, then line,
 * then word boundaries. Nothing is dropped except the whitespace at each cut.
 */
export function splitText(text: string, max = TEXT_MAX): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = window.lastIndexOf("\n\n");
    if (cut < max * 0.5) cut = window.lastIndexOf("\n");
    if (cut < max * 0.5) cut = window.lastIndexOf(" ");
    if (cut < max * 0.5) cut = max;
    // Do not cut through a surrogate pair.
    const before = rest.charCodeAt(cut - 1);
    if (cut === max && before >= 0xd800 && before <= 0xdbff) cut -= 1;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/** Sends a long plain text as one or more messages; returns the id of the first one. */
export async function sendLongMessage(chatId: string, text: string): Promise<number> {
  let first = 0;
  for (const chunk of splitText(text)) {
    const r = await sendMessage(chatId, chunk);
    if (!first) first = r.result.message_id;
  }
  return first;
}

/** Captions are never cut silently: the caller decides what to do with a long text. */
function assertCaption(caption: string | undefined, method: string) {
  if (caption && caption.length > CAPTION_MAX) throw new Error(`Telegram ${method}: caption is ${caption.length} characters, the limit is ${CAPTION_MAX}. Send the text as a separate message.`);
}

async function attach(form: FormData, field: string, filePath: string) {
  // File-backed blob: the bytes are streamed from disk when the request is sent.
  form.append(field, await fs.openAsBlob(filePath), path.basename(filePath));
}

async function fileForm(fields: Record<string, string | undefined>, fileField: string, filePath: string): Promise<FormData> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
  await attach(form, fileField, filePath);
  return form;
}

export async function sendPhoto(chatId: string, filePath: string, caption?: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  assertCaption(caption, "sendPhoto");
  const form = await fileForm({ chat_id: chatId, caption: caption || undefined, parse_mode: caption ? parseMode : undefined, reply_markup: buttons ? JSON.stringify({ inline_keyboard: buttons }) : undefined }, "photo", filePath);
  return call<SendResult>("sendPhoto", form);
}

export async function sendVideo(chatId: string, filePath: string, caption?: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  assertCaption(caption, "sendVideo");
  const form = await fileForm({ chat_id: chatId, caption: caption || undefined, parse_mode: caption ? parseMode : undefined, supports_streaming: "true", reply_markup: buttons ? JSON.stringify({ inline_keyboard: buttons }) : undefined }, "video", filePath);
  return call<SendResult>("sendVideo", form);
}

export async function sendDocument(chatId: string, filePath: string, caption?: string) {
  assertCaption(caption, "sendDocument");
  const form = await fileForm({ chat_id: chatId, caption: caption || undefined }, "document", filePath);
  return call<SendResult>("sendDocument", form);
}

/** Up to 10 photos/videos as one album. */
export async function sendMediaGroup(chatId: string, files: { path: string; type: "photo" | "video" }[], caption?: string) {
  assertCaption(caption, "sendMediaGroup");
  const form = new FormData();
  form.append("chat_id", chatId);
  const batch = files.slice(0, 10);
  const media = batch.map((f, i) => ({ type: f.type, media: `attach://file${i}`, caption: i === 0 ? caption || undefined : undefined }));
  form.append("media", JSON.stringify(media));
  for (let i = 0; i < batch.length; i++) await attach(form, `file${i}`, batch[i].path);
  return call<{ ok: boolean; result: { message_id: number }[] }>("sendMediaGroup", form);
}

export async function editMessageText(chatId: string, messageId: number, text: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  return call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: parseMode, disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined });
}

export async function editMessageCaption(chatId: string, messageId: number, caption: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  assertCaption(caption, "editMessageCaption");
  return call("editMessageCaption", { chat_id: chatId, message_id: messageId, caption, parse_mode: parseMode, reply_markup: buttons ? { inline_keyboard: buttons } : undefined });
}

export async function editReplyMarkup(chatId: string, messageId: number, buttons?: InlineButton[][]) {
  return call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: buttons ? { inline_keyboard: buttons } : { inline_keyboard: [] } });
}

export async function answerCallback(callbackQueryId: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export type TelegramUpdate = {
  update_id: number;
  message?: { message_id: number; chat: { id: number; type: string; title?: string; username?: string; first_name?: string }; text?: string; from?: { id: number; first_name?: string; username?: string }; reply_to_message?: { message_id: number } };
  callback_query?: { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
};

export async function getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
  if (!env.telegram.botToken) return [];
  const url = `${API}/bot${env.telegram.botToken}/getUpdates?offset=${offset}&timeout=${timeoutSec}&allowed_updates=${encodeURIComponent(JSON.stringify(["message", "callback_query"]))}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout((timeoutSec + 10) * 1000) });
  } catch (e) {
    throw new Error(isTimeout(e) ? "Telegram getUpdates: timeout" : "Telegram getUpdates: network error");
  }
  const json = (await res.json()) as { ok: boolean; result?: TelegramUpdate[]; description?: string };
  if (!json.ok) throw new Error(`Telegram getUpdates: ${json.description}`);
  return json.result ?? [];
}

/** Bot identity for the Settings page. Never throws: a slow or unreachable Telegram gives null. */
export async function getMe(): Promise<{ id: number; username: string; first_name: string } | null> {
  if (!env.telegram.botToken) return null;
  try {
    const res = await fetch(`${API}/bot${env.telegram.botToken}/getMe`, { signal: AbortSignal.timeout(JSON_TIMEOUT_MS) });
    const json = (await res.json()) as { ok: boolean; result?: { id: number; username: string; first_name: string } };
    return json.ok ? json.result ?? null : null;
  } catch (e) {
    console.warn("[telegram] getMe failed:", isTimeout(e) ? "timed out" : "network error");
    return null;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
