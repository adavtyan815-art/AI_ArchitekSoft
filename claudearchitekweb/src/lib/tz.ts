/** Asia/Yerevan helpers (UTC+4, no DST). Used by the admin UI for scheduling and display. */
export const YEREVAN_TZ = "Asia/Yerevan";

export function fmtYerevan(iso: string | null | undefined, mode: "datetime" | "date" | "time" = "datetime"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", { timeZone: YEREVAN_TZ, day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { timeZone: YEREVAN_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
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
