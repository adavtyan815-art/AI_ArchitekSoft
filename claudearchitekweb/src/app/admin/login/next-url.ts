/**
 * Where a visitor is sent after signing in. Only this site's admin area is accepted: exactly `/admin`,
 * `/admin/...` or `/admin?...`, query string included. Anything else (another path, `//host`, a
 * backslash, an absolute URL, a `javascript:` string) falls back to the dashboard.
 *
 * Lives in its own module because a `"use server"` file may only export async functions.
 */
export function safeNext(next: string | undefined | null): string {
  const value = (next ?? "").trim();
  const ok =
    /^\/admin(\/|\?|$)/.test(value) &&
    !value.startsWith("/admin//") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    value.length <= 512;
  return ok ? value : "/admin";
}
