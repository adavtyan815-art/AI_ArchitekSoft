/**
 * POST /api/portal/[slug]/passcode  { k, passcode }
 *
 * On success sets an HttpOnly cookie `pp_<linkId>` for 30 days. The cookie is a keyed digest bound to
 * the link (see `passcodeCookieValue`), so it cannot be derived from a short code or reused elsewhere.
 * Wrong codes are counted per link and per address: short codes are otherwise guessed in minutes by
 * firing the attempts in parallel, which no per-request delay can prevent.
 */
import { NextResponse, type NextRequest } from "next/server";
import { checkAccess, getShareLinkBySlug, passcodeCookieValue, passcodeMatches, passcodeCookieName } from "@/lib/portal";
import { clientIp, createLimiter, retryHeaders } from "@/lib/rate-limit";
import { readJsonObject } from "../../../_lib/body";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

/** Five wrong codes per link (and per address) → locked for 1, then 5, then 15 minutes. */
const guesses = createLimiter("portal-passcode", { limit: 5, windowMs: 15 * 60_000, lockMs: [60_000, 5 * 60_000, 15 * 60_000] });

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = await readJsonObject(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ ok: false, error: "bad_json" }, { status: body.status });

  const token = (typeof body.value.k === "string" && body.value.k) || req.nextUrl.searchParams.get("k") || "";
  const link = getShareLinkBySlug(slug);
  // Validate everything except the passcode itself.
  const access = checkAccess(link, token, null);
  if (!link || (access !== "ok" && access !== "passcode")) return NextResponse.json({ ok: false, error: access }, { status: 404 });
  if (!link.passcode) return NextResponse.json({ ok: true, needed: false });

  const ip = clientIp(req.headers);
  const keys = [`link:${link.id}`, ...(ip ? [`ip:${ip}`] : [])];
  const lockedFor = () => Math.max(0, ...keys.map((k) => guesses.blocked(k)).filter((r) => !r.ok).map((r) => r.retryAfterSec));
  const wait = lockedFor();
  if (wait > 0) return NextResponse.json({ ok: false, error: "locked", retryAfterSec: wait }, { status: 429, headers: retryHeaders({ ok: false, retryAfterSec: wait }) });

  const passcode = typeof body.value.passcode === "string" ? body.value.passcode.trim().slice(0, 64) : "";
  if (!passcode || !passcodeMatches(link, passcode)) {
    // Counted before the answer goes out, so attempts fired in parallel are all counted.
    for (const k of keys) guesses.fail(k);
    const after = lockedFor();
    if (after > 0) return NextResponse.json({ ok: false, error: "locked", retryAfterSec: after }, { status: 429, headers: retryHeaders({ ok: false, retryAfterSec: after }) });
    return NextResponse.json({ ok: false, error: "wrong" }, { status: 401 });
  }
  for (const k of keys) guesses.reset(k);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: passcodeCookieName(link.id),
    value: passcodeCookieValue(link.id, passcode),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/`,
    maxAge: 30 * 24 * 3600,
  });
  return res;
}
