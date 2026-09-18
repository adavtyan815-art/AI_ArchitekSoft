"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { SESSION_COOKIE, changePassword, requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { saveSetting } from "@/lib/settings";
import { getMe, sendMessage, telegramEnabled } from "@/lib/telegram";
import { isSafeLiveBackendUrl, listLiveInstances } from "@/lib/live";
import { PLATFORMS } from "@/lib/ai";
import { env } from "@/lib/env";
import { sha256 } from "@/lib/ids";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";
import { TIME_HHMM, isEmail, isHttpUrl, isPhone, issueField, issueMessage, normalizeHttpUrl, parseNumber, withNotice, type FormIssue } from "@/lib/form";

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        brandSaved: "Բրենդի կարգավորումները պահպանված են։",
        smmSaved: "Սոց. ցանցերի կարգավորումները պահպանված են։",
        needPlatform: "Ընտրիր գոնե մեկ հարթակ նոր գրառումների համար։",
        needDay: "Ընտրիր հրապարակման գոնե մեկ օր։",
        tgSaved: "Telegram-ի կարգավորումները պահպանված են։",
        tgSavedKeptChat: "Telegram-ի կարգավորումները պահպանված են։ Ադմինի չաթի id-ն չի փոխվել (դաշտը դատարկ էր)։",
        badTelegramHandle: "«Telegram»՝ գրիր @անուն կամ https://t.me/… հղում։",
        badChatId: "«Ադմինի չաթի id»՝ պետք է թիվ լինի (օր.՝ 123456789 կամ -1001234567890)։",
        badChannelId: "«Ալիքի id»՝ գրիր @ալիքի_անուն կամ -100…-ով սկսվող թիվ։",
        noToken: "TELEGRAM_BOT_TOKEN չկա՝ ոչինչ չի ուղարկվել։ Փորձնական կանչը գրանցվեց սերվերի մատյանում։",
        needChat: "Սկզբում լրացրու ադմինի չաթի id-ն (բոտին ուղարկիր /start, հետո /chatid)։",
        testSentTo: "Փորձնական հաղորդագրությունն ուղարկվեց չաթ",
        testBody: "Փորձնական հաղորդագրություն",
        botConnected: "բոտը միացված է։",
        tgError: "Telegram-ի սխալ՝",
        liveSaved: "Live 3D կարգավորումները պահպանված են։",
        liveHttps: "«Սերվերի հասցե»՝ պետք է սկսվի https://-ով (http:// թույլատրվում է միայն localhost-ի համար)։",
        liveOk: "Կապը կա — սերվերում",
        liveOk2: "սեսիա։",
        liveErr: "Live սերվեր՝",
        unknownError: "անհայտ սխալ",
        passwordLength: "Նոր գաղտնաբառը պետք է լինի 8–200 նիշ։",
        mismatch: "Գաղտնաբառերը չեն համընկնում։",
        needCurrent: "Գրիր ընթացիկ գաղտնաբառը։",
        wrongCurrent: "Ընթացիկ գաղտնաբառը սխալ է։",
        samePassword: "Նոր գաղտնաբառը պետք է տարբերվի ընթացիկից։",
        tooManyTries: "Շատ սխալ փորձեր։ Փորձիր 15 րոպեից։",
        passwordChanged: "Գաղտնաբառը փոխված է։ Մյուս բոլոր սարքերի սեսիաները փակվեցին։",
      },
      en: {
        brandSaved: "Brand settings saved.",
        smmSaved: "Social settings saved.",
        needPlatform: "Pick at least one default platform for new posts.",
        needDay: "Pick at least one posting day.",
        tgSaved: "Telegram settings saved.",
        tgSavedKeptChat: "Telegram settings saved. The admin chat id was left unchanged (the field was empty).",
        badTelegramHandle: "Telegram must be an @handle or an https://t.me/… link.",
        badChatId: "Admin chat id must be a number (e.g. 123456789 or -1001234567890).",
        badChannelId: "Channel id must be @channelname or a number that starts with -100.",
        noToken: "TELEGRAM_BOT_TOKEN is not set, so nothing was sent. The dry-run call was written to the server console.",
        needChat: "Enter the admin chat id first (send /start to the bot, then /chatid).",
        testSentTo: "Test message sent to chat",
        testBody: "Test message",
        botConnected: "is connected.",
        tgError: "Telegram error:",
        liveSaved: "Live 3D settings saved.",
        liveHttps: "Backend URL must start with https:// (http:// is allowed for localhost only).",
        liveOk: "Connected —",
        liveOk2: "session(s) on the backend.",
        liveErr: "Live backend:",
        unknownError: "unknown error",
        passwordLength: "The new password must be 8–200 characters.",
        mismatch: "Passwords do not match.",
        needCurrent: "Enter your current password.",
        wrongCurrent: "The current password is wrong.",
        samePassword: "The new password must differ from the current one.",
        tooManyTries: "Too many wrong attempts. Try again in 15 minutes.",
        passwordChanged: "Password changed. Every other signed-in device was signed out.",
      },
    },
    locale,
  );
  return { ...words, locale, labels: adminDict(locale).settings };
}

function back(tab: string, text: string, tone: "ok" | "error" = "ok"): never {
  revalidatePath("/admin/settings");
  redirect(withNotice(`/admin/settings?tab=${tab}`, text, tone));
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (v: string) => v.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// Draft of a rejected form. A failed save redirects, and the page would re-render from the stored
// settings, losing everything the admin typed. The submitted (non-secret, short) values travel in a
// 60-second HttpOnly cookie scoped to the settings page; `readSettingsDraft(tab)` gives them back.
// ---------------------------------------------------------------------------
const DRAFT_COOKIE = "at_settings_draft";
const DRAFT_PATH = "/admin/settings";
type DraftValue = string | string[] | boolean;
type SettingsDraft = { tab: string; field: string; values: Record<string, DraftValue> };

async function rememberDraft(tab: string, values: Record<string, DraftValue>, issue?: FormIssue | string) {
  const short = Object.fromEntries(Object.entries(values).filter(([, v]) => (Array.isArray(v) ? v.join(",").length : String(v).length) <= 400));
  const field = typeof issue === "string" ? issue : issueField(issue);
  const payload = Buffer.from(JSON.stringify({ tab, field, values: short } satisfies SettingsDraft), "utf8").toString("base64url");
  if (payload.length > 3600) return; // a cookie holds about 4 KB; without a draft the form simply shows the stored values
  (await cookies()).set(DRAFT_COOKIE, payload, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: DRAFT_PATH, maxAge: 60 });
}

async function forgetDraft() {
  const jar = await cookies();
  if (jar.get(DRAFT_COOKIE)) jar.set(DRAFT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: env.isProd, path: DRAFT_PATH, maxAge: 0 });
}

/**
 * The values of the last rejected submit of a settings tab, plus the key of the field that failed
 * (`field`, e.g. "email"). Pages use it as `defaultValue={draft?.values.phone ?? brand.phone}`. Null when there is none.
 */
export async function readSettingsDraft(tab: string): Promise<{ field: string; values: Record<string, DraftValue> } | null> {
  await requireUser();
  const raw = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SettingsDraft;
    if (!parsed || parsed.tab !== tab || typeof parsed.values !== "object" || parsed.values === null) return null;
    return { field: typeof parsed.field === "string" ? parsed.field : "", values: parsed.values };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------
const URL_KEYS = ["website", "instagram", "facebook", "linkedin", "youtube", "tiktok"] as const;
const optionalUrl = z.string().max(200).refine((v) => !v || isHttpUrl(v), { message: "url" });
const optionalPhone = z.string().max(40).refine((v) => !v || isPhone(v), { message: "phone" });

const BrandSchema = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(160),
  phone: optionalPhone,
  phone2: optionalPhone,
  email: z.string().max(120).refine((v) => !v || isEmail(v), { message: "email" }),
  telegram: z.string().max(60).refine((v) => !v || /^@?[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v) || (isHttpUrl(v) && /^https?:\/\/(t|telegram)\.me\//i.test(v)), { message: "TELEGRAM_HANDLE" }),
  whatsapp: optionalPhone,
  address: z.string().max(200),
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  tiktok: optionalUrl,
  defaultLanguage: z.enum(["hy", "ru", "en"]),
  workingHours: z.string().max(120),
});

export async function saveBrandAction(formData: FormData) {
  await requireUser();
  const keys = Object.keys(BrandSchema.shape) as (keyof z.infer<typeof BrandSchema>)[];
  const raw: Record<string, string> = Object.fromEntries(keys.map((k) => [k, s(formData, k)]));
  // "facebook.com/ArchiTekSoft" is what people paste: give it a scheme, then validate strictly.
  for (const k of URL_KEYS) if (raw[k]) raw[k] = normalizeHttpUrl(raw[k]) ?? raw[k];
  const parsed = BrandSchema.safeParse(raw);
  const m = await M();
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    await rememberDraft("brand", raw, issue);
    back("brand", issueMessage(issue, m.labels.brand as unknown as Record<string, string>, m.locale, { TELEGRAM_HANDLE: m.badTelegramHandle }), "error");
  }
  saveSetting("brand", parsed.data);
  await forgetDraft();
  revalidatePath("/", "layout"); // the public header and footer show these values
  back("brand", m.brandSaved);
}

// ---------------------------------------------------------------------------
// Social media
// ---------------------------------------------------------------------------
export async function saveSmmAction(formData: FormData) {
  await requireUser();
  const platforms = formData.getAll("defaultPlatforms").map(String).filter((p) => (PLATFORMS as readonly string[]).includes(p));
  const days = [...new Set(formData.getAll("postingDays").map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
  const leadRaw = s(formData, "approvalLeadMinutes");
  const raw = {
    // an empty box is "not filled in", never 0 minutes
    approvalLeadMinutes: leadRaw ? (parseNumber(leadRaw) ?? Number.NaN) : null,
    autoPublishAfterApproval: formData.get("autoPublishAfterApproval") === "on",
    brandVoice: s(formData, "brandVoice"),
    postingTime: s(formData, "postingTime") || "11:00",
    defaultPlatforms: platforms,
    postingDays: days,
  };
  const parsed = z
    .object({
      approvalLeadMinutes: z.number().int().min(0).max(10080).nullable().refine((v) => v !== null, { message: "required" }).transform((v) => v as number),
      autoPublishAfterApproval: z.boolean(),
      brandVoice: z.string().max(2000),
      postingTime: z.string().refine((v) => TIME_HHMM.test(v), { message: "time" }),
      defaultPlatforms: z.array(z.string()).min(1, { message: "NEED_PLATFORM" }),
      postingDays: z.array(z.number()).min(1, { message: "NEED_DAY" }),
    })
    .safeParse(raw);
  const m = await M();
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const L = m.labels.smm;
    const labels = { approvalLeadMinutes: L.leadTime, brandVoice: L.brandVoice, postingTime: L.postingTime, defaultPlatforms: L.defaultPlatforms, postingDays: L.postingDays };
    await rememberDraft("smm", { approvalLeadMinutes: leadRaw, autoPublishAfterApproval: raw.autoPublishAfterApproval, postingTime: raw.postingTime, defaultPlatforms: platforms, postingDays: days.map(String), hashtagsHy: s(formData, "hashtagsHy"), hashtagsRu: s(formData, "hashtagsRu"), hashtagsEn: s(formData, "hashtagsEn"), brandVoice: raw.brandVoice }, issue);
    back("smm", issueMessage(issue, labels, m.locale, { NEED_PLATFORM: m.needPlatform, NEED_DAY: m.needDay }), "error");
  }
  saveSetting("smm", { ...parsed.data, hashtagsHy: lines(s(formData, "hashtagsHy")), hashtagsRu: lines(s(formData, "hashtagsRu")), hashtagsEn: lines(s(formData, "hashtagsEn")) });
  await forgetDraft();
  back("smm", m.smmSaved);
}

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------
export async function saveTelegramAction(formData: FormData) {
  await requireUser();
  const raw = {
    adminChatId: s(formData, "adminChatId"),
    channelId: s(formData, "channelId"),
    notifyNewLeads: formData.get("notifyNewLeads") === "on",
    notifyClientFeedback: formData.get("notifyClientFeedback") === "on",
    dailyDigestTime: s(formData, "dailyDigestTime"),
  };
  const parsed = z
    .object({
      adminChatId: z.string().max(40).refine((v) => !v || /^-?\d{4,20}$/.test(v), { message: "CHAT_ID" }),
      channelId: z.string().max(80).refine((v) => !v || /^@[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v) || /^-100\d{5,20}$/.test(v), { message: "CHANNEL_ID" }),
      notifyNewLeads: z.boolean(),
      notifyClientFeedback: z.boolean(),
      dailyDigestTime: z.string().refine((v) => !v || TIME_HHMM.test(v), { message: "time" }),
    })
    .safeParse(raw);
  const m = await M();
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const L = m.labels.telegram;
    await rememberDraft("telegram", raw, issue);
    back("telegram", issueMessage(issue, { adminChatId: L.adminChatId, channelId: L.channelId, dailyDigestTime: L.digest }, m.locale, { CHAT_ID: m.badChatId, CHANNEL_ID: m.badChannelId }), "error");
  }

  // The bot's /setadmin command can store the admin chat id while this form is open. A stale form must not wipe it:
  // an empty box, or a value the admin did not touch (equal to the hidden `adminChatIdPrev` the form was rendered with),
  // leaves the stored id alone. Clearing it is explicit: the `clearAdminChatId` checkbox.
  const { adminChatId, ...rest } = parsed.data;
  const clear = formData.get("clearAdminChatId") === "on";
  const prev = formData.has("adminChatIdPrev") ? s(formData, "adminChatIdPrev") : null;
  const untouched = prev !== null && prev === adminChatId;
  let keptChat = false;
  if (clear) saveSetting("telegram", { ...rest, adminChatId: "" });
  else if (!adminChatId || untouched) {
    const after = saveSetting("telegram", rest);
    keptChat = !adminChatId && !!after.adminChatId; // say so, or the admin thinks the empty box cleared it
  } else saveSetting("telegram", { ...rest, adminChatId });
  await forgetDraft();
  back("telegram", keptChat ? m.tgSavedKeptChat : m.tgSaved);
}

export async function sendTelegramTestAction(formData: FormData) {
  const user = await requireUser();
  const chat = s(formData, "adminChatId");
  const m = await M();
  if (!chat) back("telegram", m.needChat, "error");

  // Only the Telegram calls sit inside try/catch: back() redirects by throwing NEXT_REDIRECT, which must never be caught here.
  let failure: string | null = null;
  try {
    const me = telegramEnabled() ? await getMe() : null;
    // Without a bot token sendMessage() is a dry run that writes the call to the server console.
    await sendMessage(chat, `✅ ${m.testBody} — ${env.appUrl}/admin (${user.name}). @${me?.username ?? "?"} ${m.botConnected}`);
  } catch (e) {
    failure = (e as Error).message || m.unknownError;
  }
  if (failure !== null) back("telegram", `${m.tgError} ${failure}`, "error");
  if (!telegramEnabled()) back("telegram", m.noToken, "error");
  back("telegram", `${m.testSentTo} ${chat}.`);
}

// ---------------------------------------------------------------------------
// Live 3D
// ---------------------------------------------------------------------------
export async function saveLiveAction(formData: FormData) {
  await requireUser();
  const num = (k: string) => {
    const v = s(formData, k);
    return v ? (parseNumber(v) ?? Number.NaN) : Number.NaN;
  };
  const rawUrl = s(formData, "backendUrl").replace(/\/+$/, "");
  const parsed = z
    .object({
      backendUrl: z
        .string()
        .min(1)
        .max(200)
        .refine((v) => isHttpUrl(v), { message: "url" })
        // Same guard the runtime uses before it sends the Live credentials anywhere: https everywhere,
        // plain http only for a backend on this machine, never a URL that carries credentials.
        .refine((v) => !isHttpUrl(v) || isSafeLiveBackendUrl(v), { message: "LIVE_HTTPS" }),
      defaultDisplayHours: z.number().min(0.5).max(1000),
      defaultRealHours: z.number().min(0.5).max(1000),
      defaultDays: z.number().int().min(1).max(3650),
    })
    .safeParse({ backendUrl: rawUrl, defaultDisplayHours: num("defaultDisplayHours"), defaultRealHours: num("defaultRealHours"), defaultDays: num("defaultDays") });
  const m = await M();
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const L = m.labels.live;
    await rememberDraft("live", { backendUrl: rawUrl, defaultDisplayHours: s(formData, "defaultDisplayHours"), defaultRealHours: s(formData, "defaultRealHours"), defaultDays: s(formData, "defaultDays") }, issue);
    back("live", issueMessage(issue, { backendUrl: L.backendUrl, defaultDisplayHours: L.displayHours, defaultRealHours: L.realHours, defaultDays: L.days }, m.locale, { LIVE_HTTPS: m.liveHttps }), "error");
  }
  saveSetting("live", parsed.data);
  await forgetDraft();
  back("live", m.liveSaved);
}

export async function testLiveConnectionAction() {
  await requireUser();
  const m = await M();
  let r: Awaited<ReturnType<typeof listLiveInstances>> | null = null;
  let failure = "";
  try {
    r = await listLiveInstances();
  } catch (e) {
    failure = (e as Error).message;
  }
  if (r?.ok) back("live", `${m.liveOk} ${r.instances.length} ${m.liveOk2}`);
  back("live", `${m.liveErr} ${r?.error ?? (failure || m.unknownError)}`, "error");
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
/** Wrong current-password attempts per user: 5 in 15 minutes, then the form is locked for the rest of the window. */
const WRONG_LIMIT = 5;
const WRONG_WINDOW_MS = 15 * 60_000;
const wrongTries = new Map<string, { count: number; reset: number }>();

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const m = await M();
  const current = String(formData.get("currentPassword") ?? formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) back("security", m.needCurrent, "error");
  if (password.length < 8 || password.length > 200) back("security", m.passwordLength, "error");
  if (password !== confirm) back("security", m.mismatch, "error");

  const now = Date.now();
  const tries = wrongTries.get(user.id);
  if (tries && tries.reset > now && tries.count >= WRONG_LIMIT) back("security", m.tooManyTries, "error");

  const db = getDb();
  const row = db.select({ passwordHash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id)).get();
  const currentOk = !!row && (await bcrypt.compare(current, row.passwordHash));
  if (!currentOk) {
    const cur = tries && tries.reset > now ? tries : { count: 0, reset: now + WRONG_WINDOW_MS };
    cur.count++;
    wrongTries.set(user.id, cur);
    back("security", m.wrongCurrent, "error");
  }
  wrongTries.delete(user.id);
  if (current === password) back("security", m.samePassword, "error");

  await changePassword(user.id, password);
  // Whoever else holds a session for this account (another device, or a thief) is signed out; this browser stays in.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const others = token ? and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, sha256(token))) : eq(schema.sessions.userId, user.id);
  db.delete(schema.sessions).where(others).run();
  back("security", m.passwordChanged);
}
