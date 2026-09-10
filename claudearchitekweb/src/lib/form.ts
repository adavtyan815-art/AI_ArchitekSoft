/** Small FormData readers used by admin server actions. Trims, bounds length, coerces numbers/booleans. */

export function fstr(fd: FormData, key: string, max = 4000): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export function fopt(fd: FormData, key: string, max = 4000): string | null {
  const v = fstr(fd, key, max);
  return v ? v : null;
}

export function fnum(fd: FormData, key: string): number | null {
  const v = fstr(fd, key, 40);
  if (!v) return null;
  const n = Number(v.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
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
