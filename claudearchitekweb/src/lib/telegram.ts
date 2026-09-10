/**
 * Minimal Telegram Bot API client (no dependency). Used for:
 *  - approval workflow (post preview + inline buttons)
 *  - notifications (new lead, client feedback, daily digest)
 *  - publishing to a Telegram channel
 * When TELEGRAM_BOT_TOKEN is missing every call becomes a logged dry-run.
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data?: string; url?: string };

export function telegramEnabled() {
  return !!env.telegram.botToken;
}

async function call<T = unknown>(method: string, body?: Record<string, unknown> | FormData): Promise<T> {
  if (!env.telegram.botToken) {
    console.log(`[telegram:dry-run] ${method}`, body instanceof FormData ? "(multipart)" : JSON.stringify(body).slice(0, 300));
    return { ok: true, result: { message_id: 0, dry_run: true } } as unknown as T;
  }
  const url = `${API}/bot${env.telegram.botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
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

function fileForm(fields: Record<string, string | undefined>, fileField: string, filePath: string): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
  const buf = fs.readFileSync(filePath);
  form.append(fileField, new Blob([buf]), path.basename(filePath));
  return form;
}

export async function sendPhoto(chatId: string, filePath: string, caption?: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  const form = fileForm({ chat_id: chatId, caption: caption?.slice(0, 1024), parse_mode: parseMode, reply_markup: buttons ? JSON.stringify({ inline_keyboard: buttons }) : undefined }, "photo", filePath);
  return call<SendResult>("sendPhoto", form);
}

export async function sendVideo(chatId: string, filePath: string, caption?: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  const form = fileForm({ chat_id: chatId, caption: caption?.slice(0, 1024), parse_mode: parseMode, supports_streaming: "true", reply_markup: buttons ? JSON.stringify({ inline_keyboard: buttons }) : undefined }, "video", filePath);
  return call<SendResult>("sendVideo", form);
}

export async function sendDocument(chatId: string, filePath: string, caption?: string) {
  const form = fileForm({ chat_id: chatId, caption: caption?.slice(0, 1024) }, "document", filePath);
  return call<SendResult>("sendDocument", form);
}

/** Up to 10 photos/videos as one album. */
export async function sendMediaGroup(chatId: string, files: { path: string; type: "photo" | "video" }[], caption?: string) {
  const form = new FormData();
  form.append("chat_id", chatId);
  const media = files.slice(0, 10).map((f, i) => ({ type: f.type, media: `attach://file${i}`, caption: i === 0 ? caption?.slice(0, 1024) : undefined }));
  form.append("media", JSON.stringify(media));
  files.slice(0, 10).forEach((f, i) => form.append(`file${i}`, new Blob([fs.readFileSync(f.path)]), path.basename(f.path)));
  return call<{ ok: boolean; result: { message_id: number }[] }>("sendMediaGroup", form);
}

export async function editMessageText(chatId: string, messageId: number, text: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  return call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: parseMode, disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined });
}

export async function editMessageCaption(chatId: string, messageId: number, caption: string, buttons?: InlineButton[][], parseMode?: "HTML") {
  return call("editMessageCaption", { chat_id: chatId, message_id: messageId, caption: caption.slice(0, 1024), parse_mode: parseMode, reply_markup: buttons ? { inline_keyboard: buttons } : undefined });
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
  const res = await fetch(url, { signal: AbortSignal.timeout((timeoutSec + 10) * 1000) });
  const json = (await res.json()) as { ok: boolean; result?: TelegramUpdate[]; description?: string };
  if (!json.ok) throw new Error(`Telegram getUpdates: ${json.description}`);
  return json.result ?? [];
}

export async function getMe(): Promise<{ id: number; username: string; first_name: string } | null> {
  if (!env.telegram.botToken) return null;
  const res = await fetch(`${API}/bot${env.telegram.botToken}/getMe`);
  const json = (await res.json()) as { ok: boolean; result?: { id: number; username: string; first_name: string } };
  return json.ok ? json.result ?? null : null;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
