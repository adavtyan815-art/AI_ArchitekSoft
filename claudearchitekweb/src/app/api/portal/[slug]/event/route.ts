/**
 * POST /api/portal/[slug]/event  { k?, type: open_live|open_viewer|open_ar|download, meta? }
 * Fire-and-forget client-side beacon; the token may be in the body or ?k=.
 *
 * Only events the link actually offers are recorded, so the activity an owner sees always matches
 * what the client page really allows.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { checkAccess, getShareLinkBySlug, passcodeCookieName, recordEvent } from "@/lib/portal";
import { clientIp, createLimiter } from "@/lib/rate-limit";
import { readJsonObject } from "../../../_lib/body";
import type { ShareLink } from "@/lib/db/schema";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024;

/** A reader opens a handful of things per visit; 60/hour per link and per address is generous. */
const events = createLimiter("portal-event", { limit: 60, windowMs: 3600_000 });

const EventSchema = z.object({
  type: z.enum(["open_live", "open_viewer", "open_ar", "download"]),
  meta: z.union([z.string().max(300), z.record(z.string().max(40), z.union([z.string().max(300), z.number(), z.boolean()]))]).optional(),
});

/**
 * Is this something the link lets the client do? A link with downloads off cannot report a download.
 * `open_ar` is not listed: the AR button follows the project's model, not the web-viewer flag.
 */
function offeredBy(link: ShareLink, type: z.infer<typeof EventSchema>["type"]): boolean {
  if (type === "download") return link.allowDownload;
  if (type === "open_live") return link.showLive;
  if (type === "open_viewer") return link.showViewer;
  return true;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = await readJsonObject(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ ok: false, error: "bad_json" }, { status: body.status });
  const parsed = EventSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });

  const token = (typeof body.value.k === "string" && body.value.k) || req.nextUrl.searchParams.get("k") || "";
  const link = getShareLinkBySlug(slug);
  const access = checkAccess(link, token, link ? req.cookies.get(passcodeCookieName(link.id))?.value : null);
  if (access !== "ok" || !link) return NextResponse.json({ ok: false, error: access }, { status: access === "passcode" ? 401 : 404 });
  if (!offeredBy(link, parsed.data.type)) return NextResponse.json({ ok: false, error: "not_offered" }, { status: 403 });

  const ip = clientIp(req.headers);
  if (!events.take(`link:${link.id}`).ok || !events.take(`ip:${ip || "local"}`).ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const ua = req.headers.get("user-agent") ?? "";
  recordEvent(link.id, parsed.data.type, parsed.data.meta ?? null, { ip, ua });
  track({ type: "portal_action", path: `/p/${slug}`, locale: link.language, ip, userAgent: ua, meta: { action: parsed.data.type, linkId: link.id } });
  return NextResponse.json({ ok: true });
}
