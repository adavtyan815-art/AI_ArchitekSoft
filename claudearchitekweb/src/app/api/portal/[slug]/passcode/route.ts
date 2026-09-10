/**
 * POST /api/portal/[slug]/passcode  { k, passcode }
 * On success sets an HttpOnly cookie `pp_<linkId>` = sha256(passcode) for 30 days.
 */
import { NextResponse, type NextRequest } from "next/server";
import { checkAccess, getShareLinkBySlug, hashPasscode, passcodeCookieName } from "@/lib/portal";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const token = (typeof body.k === "string" && body.k) || req.nextUrl.searchParams.get("k") || "";
  const link = getShareLinkBySlug(slug);
  // Validate everything except the passcode itself.
  const access = checkAccess(link, token, null);
  if (!link || (access !== "ok" && access !== "passcode")) return NextResponse.json({ ok: false, error: access }, { status: 404 });
  if (!link.passcode) return NextResponse.json({ ok: true, needed: false });

  const passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";
  if (!passcode || hashPasscode(passcode) !== hashPasscode(link.passcode)) {
    // Small delay to make brute force less attractive.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, error: "wrong" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: passcodeCookieName(link.id),
    value: hashPasscode(passcode),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/`,
    maxAge: 30 * 24 * 3600,
  });
  return res;
}
