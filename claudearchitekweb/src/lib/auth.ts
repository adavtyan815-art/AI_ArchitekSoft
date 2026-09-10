/**
 * Admin authentication: email + password (bcrypt) → opaque session token in an HttpOnly cookie.
 * The session id stored in the DB is sha256(token), so a DB leak does not leak live sessions.
 */
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { eq, lt } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { nowIso } from "./utils";
import { newId, newToken, sha256 } from "./ids";

export const SESSION_COOKIE = "at_admin";
const SESSION_DAYS = 14;

export async function ensureFirstAdmin() {
  const db = getDb();
  const existing = db.select({ id: schema.users.id }).from(schema.users).limit(1).all();
  if (existing.length > 0) return;
  const passwordHash = await bcrypt.hash(env.admin.password, 10);
  db.insert(schema.users)
    .values({ id: newId("usr"), email: env.admin.email.toLowerCase(), name: env.admin.name, passwordHash, role: "owner" })
    .run();
  console.log(`[auth] First admin created: ${env.admin.email}`);
}

export async function login(email: string, password: string, userAgent?: string) {
  const db = getDb();
  const user = db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).get();
  if (!user) return { ok: false as const, error: "Invalid email or password" };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false as const, error: "Invalid email or password" };

  const token = newToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.insert(schema.sessions)
    .values({ id: sha256(token), userId: user.id, expiresAt: expires.toISOString(), userAgent: userAgent?.slice(0, 200) })
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
  return { ok: true as const, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
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

/** Throws a redirect-friendly error for server actions / route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  getDb().update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId)).run();
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "",
    userAgent: h.get("user-agent") || "",
  };
}
