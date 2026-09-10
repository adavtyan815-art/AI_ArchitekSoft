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
    tagline: "KitchenPro — from sketch to production",
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
    hashtagsHy: ["#ArchiTekSoft", "#KitchenPro", "#Խոհանոց", "#Կահույք", "#3DՎիզուալիզացիա", "#Երևան"],
    hashtagsEn: ["#ArchiTekSoft", "#KitchenPro", "#KitchenDesign", "#3DVisualization", "#UnrealEngine5", "#Armenia"],
    hashtagsRu: ["#ArchiTekSoft", "#KitchenPro", "#Кухни", "#3DВизуализация", "#Ереван"],
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

function readSetting<K extends SettingsKey>(key: K): SettingsMap[K] {
  const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  const base = { ...DEFAULTS[key] } as SettingsMap[K];
  if (key === "telegram") {
    (base as TelegramSettings).adminChatId ||= env.telegram.adminChatId;
    (base as TelegramSettings).channelId ||= env.telegram.channelId;
  }
  if (key === "live") (base as LiveSettings).backendUrl = env.live.backendUrl || (base as LiveSettings).backendUrl;
  if (!row) return base;
  try {
    return { ...base, ...(JSON.parse(row.value) as object) } as SettingsMap[K];
  } catch {
    return base;
  }
}

export function saveSetting<K extends SettingsKey>(key: K, value: Partial<SettingsMap[K]>) {
  const merged = { ...getSetting(key), ...value };
  getDb()
    .insert(schema.settings)
    .values({ key, value: JSON.stringify(merged), updatedAt: nowIso() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(merged), updatedAt: nowIso() } })
    .run();
  bust("settings:");
  return merged;
}

export function getAllSettings(): SettingsMap {
  return {
    brand: getSetting("brand"),
    smm: getSetting("smm"),
    telegram: getSetting("telegram"),
    live: getSetting("live"),
  };
}
