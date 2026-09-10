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
import { getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  return local(
    {
      hy: {
        invalidBrand: "Բրենդի կարգավորումները սխալ են՝",
        brandSaved: "Բրենդի կարգավորումները պահպանված են։",
        invalidSmm: "Սոց. ցանցերի կարգավորումները սխալ են՝",
        smmSaved: "Սոց. ցանցերի կարգավորումները պահպանված են։",
        invalidTg: "Telegram-ի կարգավորումները սխալ են (ամփոփման ժամը պետք է լինի ԺԺ:ՐՐ)։",
        tgSaved: "Telegram-ի կարգավորումները պահպանված են։",
        noToken: "TELEGRAM_BOT_TOKEN չկա — հաղորդագրությունը գրանցվեց սերվերի մատյանում որպես փորձնական։",
        needChat: "Սկզբում լրացրու ադմինի չաթի id-ն (բոտին ուղարկիր /start, հետո /chatid)։",
        testSentTo: "Փորձնական հաղորդագրությունն ուղարկվեց չաթ",
        testBody: "Փորձնական հաղորդագրություն",
        botConnected: "բոտը միացված է։",
        tgError: "Telegram-ի սխալ՝",
        invalidLive: "Live 3D կարգավորումները սխալ են՝",
        liveSaved: "Live 3D կարգավորումները պահպանված են։",
        liveOk: "Կապը կա — սերվերում",
        liveOk2: "սեսիա։",
        liveErr: "Live սերվեր՝",
        unknownError: "անհայտ սխալ",
        invalidPassword: "Գաղտնաբառը սխալ է (առնվազն 8 նիշ)։",
        mismatch: "Գաղտնաբառերը չեն համընկնում։",
        passwordChanged: "Գաղտնաբառը փոխված է։ Գործող սեսիաները մնում են ակտիվ մինչ ավարտը։",
      },
      en: {
        invalidBrand: "Invalid brand settings:",
        brandSaved: "Brand settings saved.",
        invalidSmm: "Invalid social settings:",
        smmSaved: "Social settings saved.",
        invalidTg: "Invalid Telegram settings (digest time must be HH:MM).",
        tgSaved: "Telegram settings saved.",
        noToken: "TELEGRAM_BOT_TOKEN is not set — the message was logged as a dry run in the server console.",
        needChat: "Enter the admin chat id first (send /start to the bot, then /chatid).",
        testSentTo: "Test message sent to chat",
        testBody: "Test message",
        botConnected: "is connected.",
        tgError: "Telegram error:",
        invalidLive: "Invalid Live 3D settings:",
        liveSaved: "Live 3D settings saved.",
        liveOk: "Connected —",
        liveOk2: "session(s) on the backend.",
        liveErr: "Live backend:",
        unknownError: "unknown error",
        invalidPassword: "Invalid password (at least 8 characters).",
        mismatch: "Passwords do not match.",
        passwordChanged: "Password changed. Existing sessions stay signed in until they expire.",
      },
    },
    locale,
  );
}

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
  const m = await M();
  if (!parsed.success) back("brand", `${m.invalidBrand} ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("brand", parsed.data);
  back("brand", m.brandSaved);
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
  const m = await M();
  if (!parsed.success) back("smm", `${m.invalidSmm} ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("smm", { ...parsed.data, defaultPlatforms: platforms, postingDays: days, hashtagsHy: lines(s(formData, "hashtagsHy")), hashtagsRu: lines(s(formData, "hashtagsRu")), hashtagsEn: lines(s(formData, "hashtagsEn")) });
  back("smm", m.smmSaved);
}

export async function saveTelegramAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({ adminChatId: z.string().max(40), channelId: z.string().max(80), notifyNewLeads: z.boolean(), notifyClientFeedback: z.boolean(), dailyDigestTime: z.string().regex(/^(\d{2}:\d{2})?$/) })
    .safeParse({ adminChatId: s(formData, "adminChatId"), channelId: s(formData, "channelId"), notifyNewLeads: formData.get("notifyNewLeads") === "on", notifyClientFeedback: formData.get("notifyClientFeedback") === "on", dailyDigestTime: s(formData, "dailyDigestTime") });
  const m = await M();
  if (!parsed.success) back("telegram", m.invalidTg, "error");
  saveSetting("telegram", parsed.data);
  back("telegram", m.tgSaved);
}

export async function sendTelegramTestAction(formData: FormData) {
  const user = await requireUser();
  const chat = s(formData, "adminChatId");
  const m = await M();
  if (!telegramEnabled()) back("telegram", m.noToken, "error");
  if (!chat) back("telegram", m.needChat, "error");
  try {
    const me = await getMe();
    await sendMessage(chat, `✅ ${m.testBody} — ${env.appUrl}/admin (${user.name}). @${me?.username ?? "?"} ${m.botConnected}`);
    back("telegram", `${m.testSentTo} ${chat}.`);
  } catch (e) {
    back("telegram", `${m.tgError} ${(e as Error).message}`, "error");
  }
}

export async function saveLiveAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({ backendUrl: z.string().url().max(200), defaultDisplayHours: z.coerce.number().min(0.5).max(1000), defaultRealHours: z.coerce.number().min(0.5).max(1000), defaultDays: z.coerce.number().int().min(1).max(3650) })
    .safeParse({ backendUrl: s(formData, "backendUrl").replace(/\/$/, ""), defaultDisplayHours: s(formData, "defaultDisplayHours"), defaultRealHours: s(formData, "defaultRealHours"), defaultDays: s(formData, "defaultDays") });
  const m = await M();
  if (!parsed.success) back("live", `${m.invalidLive} ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`, "error");
  saveSetting("live", parsed.data);
  back("live", m.liveSaved);
}

export async function testLiveConnectionAction() {
  await requireUser();
  const r = await listLiveInstances();
  const m = await M();
  if (r.ok) back("live", `${m.liveOk} ${r.instances.length} ${m.liveOk2}`);
  back("live", `${m.liveErr} ${r.error ?? m.unknownError}`, "error");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ password: z.string().min(8).max(200), confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "PASSWORD_MISMATCH", path: ["confirm"] })
    .safeParse({ password: String(formData.get("password") ?? ""), confirm: String(formData.get("confirm") ?? "") });
  const m = await M();
  if (!parsed.success) back("security", parsed.error.issues[0]?.message === "PASSWORD_MISMATCH" ? m.mismatch : m.invalidPassword, "error");
  await changePassword(user.id, parsed.data.password);
  back("security", m.passwordChanged);
}
