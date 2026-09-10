/**
 * POST /api/portal/[slug]/event  { k?, type: open_live|open_viewer|open_ar|download, meta? }
 * Fire-and-forget client-side beacon; the token may be in the body or ?k=.
 */
import { NextResponse, type NextRequest } from "next/server";
import { track } from "@/lib/analytics";
import { checkAccess, getShareLinkBySlug, passcodeCookieName, recordEvent } from "@/lib/portal";

const TYPES = new Set(["open_live", "open_viewer", "open_ar", "download"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const type = String(body.type ?? "");
  if (!TYPES.has(type)) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });

  const token = (typeof body.k === "string" && body.k) || req.nextUrl.searchParams.get("k") || "";
  const link = getShareLinkBySlug(slug);
  const access = checkAccess(link, token, link ? req.cookies.get(passcodeCookieName(link.id))?.value : null);
  if (access !== "ok" || !link) return NextResponse.json({ ok: false, error: access }, { status: access === "passcode" ? 401 : 404 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = req.headers.get("user-agent") ?? "";
  const meta = typeof body.meta === "object" && body.meta ? (body.meta as Record<string, unknown>) : typeof body.meta === "string" ? body.meta : null;
  recordEvent(link.id, type, meta, { ip, ua });
  track({ type: "portal_action", path: `/p/${slug}`, locale: link.language, ip, userAgent: ua, meta: { action: type, linkId: link.id } });
  return NextResponse.json({ ok: true });
}
