/**
 * Key/value settings stored in the DB (JSON). Environment variables act as defaults;
 * values saved from Admin → Settings override them.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { nowIso } from "./utils";
import { bust, cached } from "./cache";

export type BrandSettings = {
  name: string;
  tagline: string;
  phone: string;
  phone2: string;
  email: string;
  telegram: string; // @handle
  whatsapp: string; // +374...
  address: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  defaultLanguage: "hy" | "ru" | "en";
  workingHours: string;
};

export type SmmSettings = {
  defaultPlatforms: string[];
  approvalLeadMinutes: number; // how long before scheduled time the Telegram approval is sent
  autoPublishAfterApproval: boolean;
  hashtagsHy: string[];
  hashtagsEn: string[];
  hashtagsRu: string[];
  brandVoice: string; // instructions for the AI copywriter
  postingDays: number[]; // 1..7 (Mon..Sun)
  postingTime: string; // "11:00"
};

export type TelegramSettings = {
  adminChatId: string;
  channelId: string;
  notifyNewLeads: boolean;
  notifyClientFeedback: boolean;
  dailyDigestTime: string; // "09:00" or ""
};

export type LiveSettings = {
  backendUrl: string;
  defaultDisplayHours: number;
  defaultRealHours: number;
  defaultDays: number;
};

const DEFAULTS: { brand: BrandSettings; smm: SmmSettings; telegram: TelegramSettings; live: LiveSettings } = {
  brand: {
    name: "ArchiTek Soft",
    tagline: "3D for furniture — from sketch to production",
    phone: "+374 41 184909",
    phone2: "+374 98 484909",
    email: "architeksoft@gmail.com",
    telegram: "@ArchiTek_Soft",
    whatsapp: "+37498484909",
    address: "Yerevan, Armenia",
    website: "https://www.architeksoft.com",
    instagram: "https://www.instagram.com/architek_soft",
    facebook: "https://facebook.com/ArchiTekSoft",
    linkedin: "https://linkedin.com/company/architek-soft",
    youtube: "https://youtube.com/@ArchiTekSoft",
    tiktok: "",
    defaultLanguage: "hy",
    workingHours: "Mon–Sat 10:00–19:00",
  },
  smm: {
    defaultPlatforms: ["facebook", "instagram", "linkedin", "telegram"],
    approvalLeadMinutes: 120,
    autoPublishAfterApproval: true,
    hashtagsHy: ["#ArchiTekSoft", "#Խոհանոց", "#Կահույք", "#3DՎիզուալիզացիա", "#Երևան"],
    hashtagsEn: ["#ArchiTekSoft", "#KitchenDesign", "#3DVisualization", "#Furniture3D", "#Armenia"],
    hashtagsRu: ["#ArchiTekSoft", "#Кухни", "#3DВизуализация", "#Ереван"],
    brandVoice:
      "Professional, calm, precise. Show, don't tell. Speak like an engineer who respects the reader's time. No hype, no emojis walls, no clickbait. Trust and expertise over likes.",
    postingDays: [2, 4, 6],
    postingTime: "11:00",
  },
  telegram: {
    adminChatId: "",
    channelId: "",
    notifyNewLeads: true,
    notifyClientFeedback: true,
    dailyDigestTime: "09:00",
  },
  live: {
    backendUrl: "https://live.architeksoft.com",
    defaultDisplayHours: 4,
    defaultRealHours: 8,
    defaultDays: 30,
  },
};

export type SettingsKey = keyof typeof DEFAULTS;
export type SettingsMap = { [K in SettingsKey]: (typeof DEFAULTS)[K] };

export function getSetting<K extends SettingsKey>(key: K): SettingsMap[K] {
  return cached(`settings:${key}`, 30_000, () => readSetting(key));
}

/**
 * Fields whose default comes from the environment. They are resolved on every read and are
 * never written to the settings row, so a later change in .env is picked up. A value saved
 * from Admin → Settings overrides the environment only while it is non-empty.
 */
function envBacked<K extends SettingsKey>(key: K): Partial<Record<keyof SettingsMap[K], string>> {
  if (key === "telegram") return { adminChatId: env.telegram.adminChatId, channelId: env.telegram.channelId } as Partial<Record<keyof SettingsMap[K], string>>;
  if (key === "live") return { backendUrl: env.live.backendUrl } as Partial<Record<keyof SettingsMap[K], string>>;
  return {};
}

/** The raw JSON object saved for a key: only what the admin stored, without defaults or environment values. */
function readStored(key: SettingsKey): Record<string, unknown> {
  const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  if (!row) return {};
  try {
    const parsed: unknown = JSON.parse(row.value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function resolve<K extends SettingsKey>(key: K, stored: Record<string, unknown>): SettingsMap[K] {
  const merged = { ...DEFAULTS[key], ...stored } as Record<string, unknown>;
  const defaults = DEFAULTS[key] as Record<string, unknown>;
  for (const [field, envValue] of Object.entries(envBacked(key))) {
    const own = stored[field];
    // stored override → environment → built-in default
    merged[field] = typeof own === "string" && own.trim() ? own : envValue || defaults[field];
  }
  return merged as SettingsMap[K];
}

function readSetting<K extends SettingsKey>(key: K): SettingsMap[K] {
  return resolve(key, readStored(key));
}

/**
 * What the environment (or the built-in default) provides for a key's env-backed fields.
 * The Settings page can show these as placeholders instead of pre-filling the inputs.
 */
export function envSettingDefaults<K extends SettingsKey>(key: K): Partial<SettingsMap[K]> {
  const defaults = DEFAULTS[key] as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, envValue] of Object.entries(envBacked(key))) out[field] = envValue || defaults[field];
  return out as Partial<SettingsMap[K]>;
}

export function saveSetting<K extends SettingsKey>(key: K, value: Partial<SettingsMap[K]>): SettingsMap[K] {
  // Merge onto the raw stored row, never onto the resolved setting: defaults and values that
  // come from the environment must not be frozen into the database.
  const stored: Record<string, unknown> = { ...readStored(key), ...(value as Record<string, unknown>) };
  const fallbacks = envSettingDefaults(key) as Record<string, unknown>;
  for (const field of Object.keys(fallbacks)) {
    const v = stored[field];
    // Empty, or identical to what the environment already provides → not an override.
    if (typeof v !== "string" || !v.trim() || v === fallbacks[field]) delete stored[field];
  }
  const json = JSON.stringify(stored);
  getDb()
    .insert(schema.settings)
    .values({ key, value: json, updatedAt: nowIso() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: json, updatedAt: nowIso() } })
    .run();
  bust("settings:");
  return resolve(key, stored);
}

export function getAllSettings(): SettingsMap {
  return {
    brand: getSetting("brand"),
    smm: getSetting("smm"),
    telegram: getSetting("telegram"),
    live: getSetting("live"),
  };
}
