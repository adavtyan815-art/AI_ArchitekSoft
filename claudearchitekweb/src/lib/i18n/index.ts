import { hy } from "./hy";
import { ru } from "./ru";
import { en } from "./en";

export const LOCALES = ["hy", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "hy";

export type Dictionary = typeof hy;

const dicts: Record<Locale, Dictionary> = { hy, ru: ru as Dictionary, en: en as Dictionary };

export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

export function getDictionary(locale: Locale): Dictionary {
  return dicts[locale] ?? dicts.hy;
}

/** Build a public URL for a locale: hy has no prefix, ru/en are prefixed. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  hy: { short: "ՀԱՅ", name: "Հայերեն" },
  ru: { short: "РУС", name: "Русский" },
  en: { short: "ENG", name: "English" },
};

export function pickLang<T>(value: string | null | undefined, locale: Locale, fallback: T): string | T {
  if (!value) return fallback;
  try {
    const obj = JSON.parse(value) as Record<string, string>;
    return obj[locale] || obj.hy || obj.en || obj.ru || fallback;
  } catch {
    return value;
  }
}
