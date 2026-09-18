/** Asia/Yerevan helpers (UTC+4, no DST). Used by the admin UI for scheduling and display. Pure: safe in client components. */
export const YEREVAN_TZ = "Asia/Yerevan";
const YEREVAN_OFFSET_MS = 4 * 3600_000;

/** UI language → BCP-47 tag used for month names. English stays en-GB (day first), as before. */
const DATE_LOCALES: Record<string, string> = { hy: "hy-AM", ru: "ru-RU", en: "en-GB" };

/**
 * One date format for the whole admin: "17 Sept 2026 10:03" / "17 սեպ 2026 10:03" / "17 сент. 2026 10:03",
 * always Yerevan time, 24 h, no seconds. Pass the UI language so month names follow it (default: English).
 */
export function fmtYerevan(iso: string | null | undefined, mode: "datetime" | "date" | "time" = "datetime", locale: string = "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const map: Record<string, string> = {};
  const f = new Intl.DateTimeFormat(DATE_LOCALES[locale] ?? DATE_LOCALES.en, { timeZone: YEREVAN_TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (const p of f.formatToParts(d)) map[p.type] = p.value;
  const date = `${map.day} ${map.month} ${map.year}`;
  const time = `${map.hour === "24" ? "00" : map.hour}:${map.minute}`;
  if (mode === "date") return date;
  if (mode === "time") return time;
  return `${date} ${time}`;
}

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: YEREVAN_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(iso))) map[p.type] = p.value;
  return map;
}

/** ISO (UTC) → value for <input type="datetime-local"> expressed in Yerevan time. */
export function toYerevanInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(iso);
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/** datetime-local value (Yerevan) → ISO UTC. Empty → null. */
export function fromYerevanInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(`${value.length === 16 ? value + ":00" : value}+04:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "YYYY-MM-DD" of an ISO timestamp in Yerevan time. */
export function yerevanDay(iso: string): string {
  const p = parts(iso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "HH:MM" (24 h) of a moment in Yerevan time. Independent of the server's own time zone. */
export function yerevanHhmm(at: Date = new Date()): string {
  const p = parts(at.toISOString());
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/**
 * Next posting slot as ISO UTC: the first moment strictly after `from` that falls on one of `days`
 * (1 = Monday … 7 = Sunday, Yerevan calendar) at `time` ("HH:MM", Yerevan). Null when no valid day/time is configured.
 */
export function nextYerevanSlot(days: number[], time: string, from: Date = new Date()): string | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((time ?? "").trim());
  const wanted = new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7));
  if (!m || wanted.size === 0) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  // Shift into "Yerevan wall clock as UTC" so the UTC getters read Yerevan calendar fields (fixed +04:00, no DST).
  const wall = new Date(from.getTime() + YEREVAN_OFFSET_MS);
  for (let i = 0; i <= 7; i++) {
    const slotWall = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + i, hh, mm, 0);
    const isoDow = new Date(slotWall).getUTCDay() || 7;
    const slot = slotWall - YEREVAN_OFFSET_MS;
    if (wanted.has(isoDow) && slot > from.getTime()) return new Date(slot).toISOString();
  }
  return null;
}
