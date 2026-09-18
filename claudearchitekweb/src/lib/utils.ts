export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    // Armenian → Latin (simplified) so client names produce readable slugs
    ա: "a", բ: "b", գ: "g", դ: "d", ե: "e", զ: "z", է: "e", ը: "y", թ: "t", ժ: "zh", ի: "i", լ: "l", խ: "kh",
    ծ: "ts", կ: "k", հ: "h", ձ: "dz", ղ: "gh", ճ: "ch", մ: "m", յ: "y", ն: "n", շ: "sh", ո: "o", չ: "ch",
    պ: "p", ջ: "j", ռ: "r", ս: "s", վ: "v", տ: "t", ր: "r", ց: "ts", ու: "u", փ: "p", ք: "q", և: "ev", օ: "o", ֆ: "f",
    // Russian → Latin
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const lower = input.toLowerCase();
  let out = "";
  for (const ch of lower) out += map[ch] ?? ch;
  return out
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Everything the studio and its clients read is Yerevan time, wherever the server runs (Docker is UTC). */
const DISPLAY_TZ = "Asia/Yerevan";

/** UI language → the BCP 47 tag used for month names, digits grouping and decimal marks. */
const INTL_LOCALE: Record<string, string> = { hy: "hy-AM", ru: "ru-RU", en: "en-GB" };

function intlLocale(locale?: string | null): string {
  if (!locale) return "en-GB";
  return INTL_LOCALE[locale] ?? locale;
}

const BYTE_UNITS: Record<string, [string, string, string, string]> = {
  hy: ["Բ", "ԿԲ", "ՄԲ", "ԳԲ"],
  ru: ["Б", "КБ", "МБ", "ГБ"],
  en: ["B", "KB", "MB", "GB"],
};

/**
 * File size for display. Without a locale the output is unchanged ("1.5 MB");
 * with "hy" | "ru" | "en" the unit and the decimal mark follow the language.
 */
export function formatBytes(bytes: number, locale?: string | null): string {
  const units = BYTE_UNITS[locale ?? "en"] ?? BYTE_UNITS.en;
  const num = (value: number, digits: number) =>
    locale ? new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) : value.toFixed(digits);
  if (bytes < 1024) return `${bytes} ${units[0]}`;
  if (bytes < 1024 * 1024) return `${num(bytes / 1024, 0)} ${units[1]}`;
  if (bytes < 1024 * 1024 * 1024) return `${num(bytes / 1024 / 1024, 1)} ${units[2]}`;
  return `${num(bytes / 1024 / 1024 / 1024, 2)} ${units[3]}`;
}

/**
 * Amount + currency code. The code is always Latin ("AMD"), never the dram sign:
 * the display serif and the mono face have no U+058F glyph, so the sign was drawn
 * from a fallback font, larger and off the baseline next to the digits.
 *
 * The separator is an ordinary space, not U+00A0. A no-break space made "5,500,000 AMD" one
 * unbreakable word, and in a narrow box (the Overview "Pipeline value" card on a 390px phone)
 * `overflow-wrap: break-word` then had to break it somewhere: it split the code itself, leaving
 * "5,500,000 AM" above a lone "D". A normal space gives the line a legal break point between the
 * figure and the code, so the code is never cut in half. Where the two must stay on one line the
 * call site says so with `whitespace-nowrap`, which is what the money table cells already do.
 */
export function formatMoney(amount: number | null | undefined, currency = "AMD"): string {
  if (amount === null || amount === undefined) return "—";
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
  return `${n} ${currency || "AMD"}`;
}

/**
 * "16 Sept 2026" (+ " 10:30" with withTime), always in Yerevan time.
 * `locale` ("hy" | "ru" | "en" or a BCP 47 tag) picks the month name; the admin
 * keeps the default English form, client pages pass the link's language.
 */
export function formatDate(iso: string | null | undefined, withTime = false, locale?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = intlLocale(locale);
  // Built from parts so every language reads "day month year" without the
  // trailing year word some locales append ("2026 г.", "2026 թ.").
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(tag, { timeZone: DISPLAY_TZ, day: "2-digit", month: "short", year: "numeric" }).formatToParts(d)) parts[p.type] = p.value;
  const date = `${parts.day} ${parts.month} ${parts.year}`;
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: DISPLAY_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${date} ${time}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return formatDate(iso);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Calendar year in Yerevan (a project created at 01:00 on 1 January must not get last year's code on a UTC server). */
export function yerevanYear(date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: DISPLAY_TZ, year: "numeric" }).format(date));
}

export function projectCode(seq: number, year = yerevanYear()): string {
  return `AT-${year}-${String(seq).padStart(4, "0")}`;
}
