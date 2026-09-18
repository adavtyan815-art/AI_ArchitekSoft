/**
 * Small FormData readers and validation helpers used by admin server actions.
 * Trims, bounds length, coerces numbers/booleans, turns zod issues into localised sentences.
 * No framework imports here: the file is unit-testable with plain tsx.
 */

export function fstr(fd: FormData, key: string, max = 4000): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export function fopt(fd: FormData, key: string, max = 4000): string | null {
  const v = fstr(fd, key, max);
  return v ? v : null;
}

/**
 * Human number → number. Understands the ways people type amounts in hy/ru/en:
 *   "3,5" → 3.5 · "1500,50" → 1500.5 · "1 500,50" → 1500.5 · "1,500" → 1500 · "1,234,567.8" → 1234567.8 · "1.500,50" → 1500.5
 * Anything that is not clearly one number ("1-2", "1.2.3", "12abc", "abc") → null, never a silently merged digit string.
 */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  // spaces are only ever digit grouping (the whitespace class also covers the no-break and the narrow no-break space)
  const s = String(raw).replace(/\s/g, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalised: string | null = null;
  if (hasComma && hasDot) {
    if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) normalised = s.replace(/,/g, ""); // 1,234,567.89
    else if (/^-?\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) normalised = s.replace(/\./g, "").replace(",", "."); // 1.234.567,89
  } else if (hasComma) {
    if (/^-?\d+,\d{1,2}$/.test(s)) normalised = s.replace(",", "."); // decimal comma
    else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) normalised = s.replace(/,/g, ""); // thousands
  } else if (/^-?(\d+(\.\d+)?|\.\d+)$/.test(s)) {
    normalised = s;
  }
  if (normalised === null) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/** Number field. Empty or not a number → null. */
export function fnum(fd: FormData, key: string): number | null {
  return parseNumber(fstr(fd, key, 40));
}

/**
 * Number field for validated forms: empty → null, a number → the number, any other text → NaN.
 * zod's z.number() rejects NaN, so a typo becomes a validation message instead of silently clearing the stored value.
 */
export function fnumStrict(fd: FormData, key: string): number | null {
  const raw = fstr(fd, key, 40);
  if (!raw) return null;
  const n = parseNumber(raw);
  return n === null ? Number.NaN : n;
}

export function fbool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "1" || v === "true";
}

/** "a, b ,c" → '["a","b","c"]' or null */
export function ftags(fd: FormData, key: string): string | null {
  const v = fstr(fd, key, 1000);
  if (!v) return null;
  const arr = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return arr.length ? JSON.stringify(arr) : null;
}

export function fall(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** A `returnTo` form field, accepted only when it points back into the admin (never an absolute or protocol-relative URL). */
export function freturn(fd: FormData, key = "returnTo"): string | null {
  const v = fstr(fd, key, 300);
  if (!v.startsWith("/admin") || v.includes("\\") || /[\r\n]/.test(v)) return null;
  const rest = v.slice("/admin".length);
  return rest === "" || rest[0] === "/" || rest[0] === "?" ? v : null;
}

// ---------------------------------------------------------------------------
// Notices (admin pages render ?notice=…&tone=ok|error after a redirect)
// ---------------------------------------------------------------------------
export type NoticeTone = "ok" | "error";

/** `/admin/x?tab=y` + notice → `/admin/x?tab=y&notice=…&tone=…` (replaces a notice that is already there). */
export function withNotice(path: string, text: string, tone: NoticeTone = "ok"): string {
  const [base, query = ""] = path.split("#")[0].split("?");
  const params = new URLSearchParams(query);
  params.set("notice", text.slice(0, 600));
  params.set("tone", tone);
  return `${base}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Value checks shared by the action files
// ---------------------------------------------------------------------------

/** One list for the values the website wizard sends and the admin lead form offers, so a save never drops what the visitor picked. */
export const LEAD_SERVICES = ["kitchenpro", "showroom", "live", "ar", "cnc", "real_estate", "custom", "other"] as const;
export const LEAD_ROOMS = ["kitchen", "wardrobe", "living", "bedroom", "bathroom", "office", "apartment", "other"] as const;

/** http(s) URL with a real host, nothing else (no javascript:, data:, ftp:, free text). */
export function isHttpUrl(value: string): boolean {
  if (!value || /\s/.test(value)) return false;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  return u.hostname === "localhost" || u.hostname.includes(".");
}

/** "kahuyq.am" → "https://kahuyq.am". Returns null when the result is not an http(s) URL. */
export function normalizeHttpUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[^/:]+:\d+(\/|$)/.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
  return isHttpUrl(withScheme) ? withScheme : null;
}

const EMAIL_RE = /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/** Phone as people write it: optional +, digits, spaces, dashes, dots, brackets; 6–15 digits in total. */
export function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 6 && digits <= 15;
}

/** Strict calendar date "YYYY-MM-DD" (rejects 2026-02-30 and free text). */
export function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1970 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** The last second of a calendar day in Yerevan (UTC+4, no DST) as an ISO UTC string, or null for an invalid date. */
export function yerevanEndOfDayIso(date: string): string | null {
  if (!isCalendarDate(date)) return null;
  const d = new Date(`${date}T23:59:59+04:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 00:00 – 23:59 */
export const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------------------
// zod issue → localised, field-labelled sentence
// ---------------------------------------------------------------------------
export type FormLocale = "hy" | "en";

/** The part of a zod issue this file reads (structural, so form.ts does not import zod). */
export type FormIssue = {
  code?: string;
  path: PropertyKey[];
  message: string;
  origin?: string;
  format?: string;
  expected?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
};

const WORDS = {
  hy: {
    required: (f: string) => `«${f}» դաշտը պարտադիր է։`,
    tooShort: (f: string, n: string) => `«${f}»՝ առնվազն ${n} նիշ։`,
    tooLong: (f: string, n: string) => `«${f}»՝ առավելագույնը ${n} նիշ։`,
    tooSmall: (f: string, n: string) => `«${f}»՝ արժեքը չի կարող փոքր լինել ${n}-ից։`,
    tooBig: (f: string, n: string) => `«${f}»՝ արժեքը չի կարող մեծ լինել ${n}-ից։`,
    tooMany: (f: string, n: string) => `«${f}»՝ առավելագույնը ${n} հատ։`,
    notNumber: (f: string) => `«${f}» դաշտում պետք է թիվ լինի (օր.՝ 1500 կամ 3,5)։`,
    notInteger: (f: string) => `«${f}» դաշտում պետք է ամբողջ թիվ լինի։`,
    email: (f: string) => `«${f}»՝ էլ. հասցեն սխալ է գրված։`,
    url: (f: string) => `«${f}»՝ հղումը պետք է սկսվի http:// կամ https://-ով։`,
    phone: (f: string) => `«${f}»՝ հեռախոսահամարը սխալ է գրված (օր.՝ +374 99 123456)։`,
    time: (f: string) => `«${f}»՝ ժամը պետք է լինի ԺԺ:ՐՐ ձևով (00:00–23:59)։`,
    date: (f: string) => `«${f}»՝ ամսաթիվը սխալ է։`,
    invalid: (f: string) => `«${f}» դաշտի արժեքը սխալ է։`,
    generic: "Ձևը սխալ է լրացված։",
  },
  en: {
    required: (f: string) => `${f} is required.`,
    tooShort: (f: string, n: string) => `${f} must be at least ${n} characters.`,
    tooLong: (f: string, n: string) => `${f} must be at most ${n} characters.`,
    tooSmall: (f: string, n: string) => `${f} cannot be less than ${n}.`,
    tooBig: (f: string, n: string) => `${f} cannot be more than ${n}.`,
    tooMany: (f: string, n: string) => `${f}: at most ${n} items.`,
    notNumber: (f: string) => `${f} must be a number (e.g. 1500 or 3.5).`,
    notInteger: (f: string) => `${f} must be a whole number.`,
    email: (f: string) => `${f} is not a valid email address.`,
    url: (f: string) => `${f} must be a link that starts with http:// or https://.`,
    phone: (f: string) => `${f} is not a valid phone number (e.g. +374 99 123456).`,
    time: (f: string) => `${f} must be a time as HH:MM (00:00–23:59).`,
    date: (f: string) => `${f} is not a valid date.`,
    invalid: (f: string) => `${f} has an invalid value.`,
    generic: "The form has an invalid value.",
  },
} as const;

/**
 * First zod issue as a sentence in the admin's language, naming the field by its on-screen label.
 *  - `labels`: field key (dotted path, or its first segment) → the label shown in the form.
 *  - `custom`: message token used in .refine()/.superRefine() → ready sentence.
 * A refine() whose message is one of the tokens "required" | "email" | "url" | "phone" | "time" | "date" gets the matching field-labelled sentence.
 */
export function issueMessage(issue: FormIssue | undefined, labels: Record<string, string>, locale: FormLocale, custom: Record<string, string> = {}): string {
  const w = WORDS[locale] ?? WORDS.hy;
  if (!issue) return w.generic;
  if (custom[issue.message]) return custom[issue.message];
  const dotted = issue.path.map(String).join(".");
  const field = labels[dotted] ?? labels[String(issue.path[0] ?? "")] ?? dotted;
  if (!field) return w.generic;
  const min = issue.minimum !== undefined ? String(issue.minimum) : "";
  const max = issue.maximum !== undefined ? String(issue.maximum) : "";
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string") return min === "1" ? w.required(field) : w.tooShort(field, min);
      if (issue.origin === "array" || issue.origin === "set") return w.required(field);
      return w.tooSmall(field, min);
    case "too_big":
      if (issue.origin === "string") return w.tooLong(field, max);
      if (issue.origin === "array" || issue.origin === "set") return w.tooMany(field, max);
      return w.tooBig(field, max);
    case "invalid_type":
      if (issue.expected === "int") return w.notInteger(field);
      if (issue.expected === "number") return w.notNumber(field);
      return w.invalid(field);
    case "invalid_format":
      if (issue.format === "email") return w.email(field);
      if (issue.format === "url") return w.url(field);
      return w.invalid(field);
    case "custom":
      if (issue.message === "required") return w.required(field);
      if (issue.message === "email") return w.email(field);
      if (issue.message === "url") return w.url(field);
      if (issue.message === "phone") return w.phone(field);
      if (issue.message === "time") return w.time(field);
      if (issue.message === "date") return w.date(field);
      return w.invalid(field);
    default:
      return w.invalid(field);
  }
}

/** Dotted path of the first issue — lets a page mark the offending field. */
export function issueField(issue: FormIssue | undefined): string {
  return issue ? issue.path.map(String).join(".") : "";
}
