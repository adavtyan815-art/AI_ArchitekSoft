/**
 * POST /api/track — the site's own page-view beacon.
 *
 * Only the three events a browser can honestly report are accepted here. `form_submit`,
 * `portal_view` and `portal_action` are written by the server (the leads route and the portal
 * routes), so the lead and conversion figures in the dashboard cannot be inflated from outside.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { clientIp, createLimiter } from "@/lib/rate-limit";
import { readJsonObject } from "../_lib/body";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;

/** One page view per navigation; 120/min still covers fast browsing and a shared office address. */
const beacons = createLimiter("track", { limit: 120, windowMs: 60_000 });

const str = (max: number) => z.string().trim().max(max).optional();

const EventSchema = z.object({
  type: z.enum(["page_view", "cta_click", "form_start"]),
  path: str(300),
  locale: str(5),
  segment: str(20),
  referrer: str(300),
  utm: z.object({ source: str(100), medium: str(100), campaign: str(100) }).optional(),
  meta: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

/** Host part of a referrer, or undefined for our own pages (internal navigation is not a traffic source). */
function externalHost(referrer: string | undefined, ownHosts: Set<string>): string | undefined {
  if (!referrer) return undefined;
  const host = referrer
    .replace(/^[a-z]+:\/\//i, "")
    .split("/")[0]
    .toLowerCase();
  if (!host || ownHosts.has(host) || ownHosts.has(host.replace(/^www\./, ""))) return undefined;
  return host;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!beacons.take(ip || "local").ok) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await readJsonObject(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ ok: false }, { status: body.status });
  const parsed = EventSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const b = parsed.data;

  let configuredHost: string | null = null;
  try {
    configuredHost = new URL(env.appUrl).host;
  } catch {
    configuredHost = null;
  }
  const ownHosts = new Set<string>();
  for (const h of [req.headers.get("host"), configuredHost]) {
    if (!h) continue;
    ownHosts.add(h.toLowerCase());
    ownHosts.add(h.toLowerCase().replace(/^www\./, ""));
  }

  track({
    type: b.type,
    path: b.path,
    locale: b.locale,
    segment: b.segment,
    referrer: externalHost(b.referrer, ownHosts),
    utm: b.utm,
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
    meta: b.meta,
  });
  return NextResponse.json({ ok: true });
}
