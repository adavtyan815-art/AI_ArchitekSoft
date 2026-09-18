/**
 * Admin authentication: email + password (bcrypt) → opaque session token in an HttpOnly cookie.
 * The session id stored in the DB is sha256(token), so a DB leak does not leak live sessions.
 */
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, lt, ne } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { nowIso } from "./utils";
import { newId, newToken, sha256 } from "./ids";
import { clientIp, createLimiter } from "./rate-limit";

export const SESSION_COOKIE = "at_admin";
const SESSION_DAYS = 14;

/** Longest inputs the login accepts. bcrypt reads 72 bytes; 200 matches the change-password form. */
const MAX_EMAIL = 254;
const MAX_PASSWORD = 200;

/** Five attempts per 15 minutes, per address and per account; then locked for 1, 5 and 15 minutes. */
const attempts = createLimiter("admin-login", { limit: 5, windowMs: 15 * 60_000, lockMs: [60_000, 5 * 60_000, 15 * 60_000] });

/** Compared against when the email is unknown, so both answers cost one bcrypt round. Hashed once, on first use. */
let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= bcrypt.hash(newToken(24), 10));

let configChecked = false;
/** One boot-time line per weak setting; nothing is printed on a healthy production config. */
function warnWeakConfig() {
  if (configChecked) return;
  configChecked = true;
  if (env.isProd && env.isWeakSecret) {
    console.warn("[config] APP_SECRET is missing, a placeholder or shorter than 32 characters. Set a long random value: it keys client-page passcode cookies and the visitor hashes.");
  }
}

export async function ensureFirstAdmin() {
  warnWeakConfig();
  const db = getDb();
  const existing = db.select({ id: schema.users.id }).from(schema.users).limit(1).all();
  if (existing.length > 0) return;
  if (env.isProd && env.admin.isWeakPassword) {
    // Never create the owner with a published or placeholder password on a public host.
    console.error("[auth] No admin account was created: ADMIN_PASSWORD is missing, a placeholder, the development default or shorter than 12 characters. Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) and restart.");
    return;
  }
  const passwordHash = await bcrypt.hash(env.admin.password, 10);
  db.insert(schema.users)
    .values({ id: newId("usr"), email: env.admin.email.toLowerCase(), name: env.admin.name, passwordHash, role: "owner" })
    .run();
  console.log(`[auth] First admin created: ${env.admin.email}`);
}

/** Error keys: the login form maps them to its localised labels. */
export type LoginError = "invalid" | "locked";
export type LoginResult =
  | { ok: true; user: { id: string; name: string; email: string; role: string } }
  | { ok: false; error: LoginError; retryAfterSec?: number };

/** Log-safe copy of a client-supplied value: control characters removed, length capped. */
const clean = (v: string, max: number) => v.replace(/\p{Cc}+/gu, " ").slice(0, max);

export async function login(email: string, password: string, meta: { ip?: string; userAgent?: string } = {}): Promise<LoginResult> {
  const mail = email.toLowerCase().trim();
  // Refuse absurd inputs before the database and bcrypt see them.
  if (!mail || !password || mail.length > MAX_EMAIL || password.length > MAX_PASSWORD) return { ok: false, error: "invalid" };

  const keys = [`email:${mail}`, ...(meta.ip ? [`ip:${meta.ip}`] : [])];
  const lockedFor = () => Math.max(0, ...keys.map((k) => attempts.blocked(k)).filter((r) => !r.ok).map((r) => r.retryAfterSec));
  const wait = lockedFor();
  if (wait > 0) return { ok: false, error: "locked", retryAfterSec: wait };

  // Count the attempt before the (slow, async) password check so parallel guesses cannot slip past the limit.
  for (const k of keys) attempts.fail(k);

  const db = getDb();
  const fallbackHash = await dummy(); // awaited on both paths, so the first request does not stand out either
  const user = db.select().from(schema.users).where(eq(schema.users.email, mail)).get();
  const matches = await bcrypt.compare(password, user ? user.passwordHash : fallbackHash);
  if (!user || !matches) {
    console.warn(`[auth] failed login email=${JSON.stringify(clean(mail, 120))} ip=${meta.ip || "-"} ua=${JSON.stringify(clean(meta.userAgent ?? "", 160))}`);
    const after = lockedFor();
    return after > 0 ? { ok: false, error: "locked", retryAfterSec: after } : { ok: false, error: "invalid" };
  }
  for (const k of keys) attempts.reset(k);

  const token = newToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.insert(schema.sessions)
    .values({ id: sha256(token), userId: user.id, expiresAt: expires.toISOString(), userAgent: meta.userAgent?.slice(0, 200) })
    .run();
  db.update(schema.users).set({ lastLoginAt: nowIso() }).where(eq(schema.users.id, user.id)).run();
  // opportunistic cleanup of expired sessions
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, nowIso())).run();

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires,
  });
  return { ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) getDb().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token))).run();
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; name: string; email: string; role: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, sha256(token)))
    .get();
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

/**
 * For admin pages and server actions. Without a valid session the visitor is sent to the sign-in page
 * (redirect() throws NEXT_REDIRECT, which Next handles in both); route handlers use getSessionUser() and answer 401.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    return redirect("/admin/login");
  }
  return user;
}

/** Does `password` match the stored hash of this user? (Settings → Security asks for the current password.) */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  if (!password || password.length > MAX_PASSWORD) return false;
  const row = getDb().select({ passwordHash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!row) return false;
  return bcrypt.compare(password, row.passwordHash);
}

/** Stores the new password and signs the user out everywhere except the browser that made the change. */
export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const db = getDb();
  db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId)).run();
  let current: string | undefined;
  try {
    current = (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    current = undefined; // called outside a request (scripts): every session is revoked
  }
  db.delete(schema.sessions)
    .where(current ? and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, sha256(current))) : eq(schema.sessions.userId, userId))
    .run();
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: clientIp(h),
    userAgent: h.get("user-agent") || "",
  };
}
