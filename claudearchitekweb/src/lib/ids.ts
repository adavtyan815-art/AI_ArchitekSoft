/** Server-only id/token/hash helpers (node:crypto). Keep out of client components. */
import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Short, URL-safe unique id (16 chars). */
export function newId(prefix?: string): string {
  const id = randomBytes(10).toString("base64url").slice(0, 14);
  return prefix ? `${prefix}_${id}` : id;
}

export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmac(secret: string, input: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

/** Constant-time string comparison (both sides are hashed first, so length does not leak either). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** The request number a visitor sees after sending the form: the last six characters of the lead id. */
export function leadCode(leadId: string): string {
  return leadId.slice(-6).toUpperCase();
}
