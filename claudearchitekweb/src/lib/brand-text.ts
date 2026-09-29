import { pickLang, type Locale } from "@/lib/i18n";

/**
 * Brand texts (address, working hours) in the visitor's language.
 * - A value saved per language (Admin → Settings: `{"hy": …, "ru": …, "en": …}`) is used as written.
 * - A plain value — one text for every language, e.g. "Vanadzor, Armenia" / "Mon–Sat 10:00–19:00" — is localised
 *   where it can be done safely: day abbreviations and the places we work in. Anything else is left as typed.
 */
const DAYS: Record<string, Record<Locale, string>> = {
  Mon: { hy: "Երկ", ru: "Пн", en: "Mon" },
  Tue: { hy: "Երք", ru: "Вт", en: "Tue" },
  Wed: { hy: "Չրք", ru: "Ср", en: "Wed" },
  Thu: { hy: "Հնգ", ru: "Чт", en: "Thu" },
  Fri: { hy: "Ուրբ", ru: "Пт", en: "Fri" },
  Sat: { hy: "Շբթ", ru: "Сб", en: "Sat" },
  Sun: { hy: "Կիր", ru: "Вс", en: "Sun" },
};
const PLACES: Record<string, Record<Locale, string>> = {
  Armenia: { hy: "Հայաստան", ru: "Армения", en: "Armenia" },
  Yerevan: { hy: "Երևան", ru: "Ереван", en: "Yerevan" },
  Vanadzor: { hy: "Վանաձոր", ru: "Ванадзор", en: "Vanadzor" },
  Gyumri: { hy: "Գյումրի", ru: "Гюмри", en: "Gyumri" },
  Dilijan: { hy: "Դիլիջան", ru: "Дилижан", en: "Dilijan" },
};
const WORD = (keys: string[]) => new RegExp(`\\b(${keys.join("|")})\\b`, "g");
const DAY_RE = WORD(Object.keys(DAYS));
const PLACE_RE = WORD(Object.keys(PLACES));

/** Is this value a per-language JSON object (as the admin form saves it)? */
function isPerLanguage(value: string): boolean {
  try {
    const v = JSON.parse(value) as unknown;
    return !!v && typeof v === "object" && !Array.isArray(v);
  } catch {
    return false;
  }
}

export function localizeBrandText(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (isPerLanguage(value)) return String(pickLang(value, locale, ""));
  if (locale === "en") return value;
  return value.replace(DAY_RE, (d) => DAYS[d][locale]).replace(PLACE_RE, (p) => PLACES[p][locale]);
}

/** One language of a brand text, for the admin form's per-language fields (a plain value is localised). */
export function brandTextIn(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (isPerLanguage(value)) {
    try {
      return String((JSON.parse(value) as Record<string, unknown>)[locale] ?? "");
    } catch {
      return "";
    }
  }
  return localizeBrandText(value, locale);
}
