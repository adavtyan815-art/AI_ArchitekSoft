/** Server-only id/token/hash helpers (node:crypto). Keep out of client components. */
import { randomBytes, createHash, createHmac } from "node:crypto";

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

