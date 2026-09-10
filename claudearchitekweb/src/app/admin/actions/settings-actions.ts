"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changePassword, requireUser } from "@/lib/auth";
import { saveSetting } from "@/lib/settings";
import { getMe, sendMessage, telegramEnabled } from "@/lib/telegram";
import { listLiveInstances } from "@/lib/live";
import { PLATFORMS } from "@/lib/ai";
import { env } from "@/lib/env";

function back(tab: string, text: string, tone: "ok" | "error" = "ok"): never {
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?tab=${tab}&notice=${encodeURIComponent(text)}&tone=${tone}`);
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (v: string) => v.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);

const BrandSchema = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(160),
  phone: z.string().max(40),
  phone2: z.string().max(40),
  email: z.string().max(120),
  telegram: z.string().max(60),
  whatsapp: z.string().max(40),
  address: z.string().max(200),
  website: z.string().max(200),
  instagram: z.string().max(200),
  facebook: z.string().max(200),
  linkedin: z.string().max(200),
  youtube: z.string().max(200),
  tiktok: z.string().max(200),
  defaultLanguage: z.enum(["hy", "ru", "en"]),
  workingHours: z.string().max(120),
});

export async function saveBrandAction(formData: FormData) {
  await requireUser();
  const keys = Object.keys(BrandSchema.shape) as (keyof z.infer<typeof BrandSchema>)[];
  const raw = Object.fromEntries(keys.map((k) => [k, s(formData, k)]));
  const parsed = BrandSchema.safeParse(raw);
  if (!parsed.success) back("brand", `Invalid brand settings: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("brand", parsed.data);
  back("brand", "Brand settings saved.");
}

export async function saveSmmAction(formData: FormData) {
  await requireUser();
  const platforms = formData.getAll("defaultPlatforms").map(String).filter((p) => (PLATFORMS as readonly string[]).includes(p));
  const days = formData.getAll("postingDays").map(Number).filter((d) => d >= 1 && d <= 7);
  const parsed = z
    .object({
      approvalLeadMinutes: z.coerce.number().int().min(0).max(10080),
      autoPublishAfterApproval: z.boolean(),
      brandVoice: z.string().max(2000),
      postingTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .safeParse({ approvalLeadMinutes: s(formData, "approvalLeadMinutes"), autoPublishAfterApproval: formData.get("autoPublishAfterApproval") === "on", brandVoice: s(formData, "brandVoice"), postingTime: s(formData, "postingTime") || "11:00" });
  if (!parsed.success) back("smm", `Invalid SMM settings: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("smm", { ...parsed.data, defaultPlatforms: platforms, postingDays: days, hashtagsHy: lines(s(formData, "hashtagsHy")), hashtagsRu: lines(s(formData, "hashtagsRu")), hashtagsEn: lines(s(formData, "hashtagsEn")) });
  back("smm", "SMM settings saved.");
}

export async function saveTelegramAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({ adminChatId: z.string().max(40), channelId: z.string().max(80), notifyNewLeads: z.boolean(), notifyClientFeedback: z.boolean(), dailyDigestTime: z.string().regex(/^(\d{2}:\d{2})?$/) })
    .safeParse({ adminChatId: s(formData, "adminChatId"), channelId: s(formData, "channelId"), notifyNewLeads: formData.get("notifyNewLeads") === "on", notifyClientFeedback: formData.get("notifyClientFeedback") === "on", dailyDigestTime: s(formData, "dailyDigestTime") });
  if (!parsed.success) back("telegram", "Invalid Telegram settings (digest time must be HH:MM).", "error");
  saveSetting("telegram", parsed.data);
  back("telegram", "Telegram settings saved.");
}

export async function sendTelegramTestAction(formData: FormData) {
  const user = await requireUser();
  const chat = s(formData, "adminChatId");
  if (!telegramEnabled()) back("telegram", "TELEGRAM_BOT_TOKEN is not set — the message was logged as a dry-run in the server console.", "error");
  if (!chat) back("telegram", "Enter the admin chat id first (send /start to the bot, then /chatid).", "error");
  try {
    const me = await getMe();
    await sendMessage(chat, `✅ Test message from ${env.appUrl}/admin (${user.name}). Bot @${me?.username ?? "?"} is connected.`);
    back("telegram", `Test message sent to chat ${chat}.`);
  } catch (e) {
    back("telegram", `Telegram error: ${(e as Error).message}`, "error");
  }
}

export async function saveLiveAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({ backendUrl: z.string().url().max(200), defaultDisplayHours: z.coerce.number().min(0.5).max(1000), defaultRealHours: z.coerce.number().min(0.5).max(1000), defaultDays: z.coerce.number().int().min(1).max(3650) })
    .safeParse({ backendUrl: s(formData, "backendUrl").replace(/\/$/, ""), defaultDisplayHours: s(formData, "defaultDisplayHours"), defaultRealHours: s(formData, "defaultRealHours"), defaultDays: s(formData, "defaultDays") });
  if (!parsed.success) back("live", `Invalid Live 3D settings: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("live", parsed.data);
  back("live", "Live 3D settings saved.");
}

export async function testLiveConnectionAction() {
  await requireUser();
  const r = await listLiveInstances();
  if (r.ok) back("live", `Connected — ${r.instances.length} instance(s) on the backend.`);
  back("live", `Live backend: ${r.error ?? "unknown error"}`, "error");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ password: z.string().min(8).max(200), confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] })
    .safeParse({ password: String(formData.get("password") ?? ""), confirm: String(formData.get("confirm") ?? "") });
  if (!parsed.success) back("security", parsed.error.issues[0]?.message ?? "Invalid password", "error");
  await changePassword(user.id, parsed.data.password);
  back("security", "Password changed. Existing sessions stay signed in until they expire.");
}
