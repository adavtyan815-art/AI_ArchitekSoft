/**
 * POST /api/leads — the public intake endpoint behind /contact and the /start wizard.
 *
 * It is unauthenticated, so everything is bounded: the body is read up to a fixed size, every field
 * has a length cap, `details` is an explicit shape (unknown keys are dropped) and one address may
 * send a limited number of requests per minute. The owner notification runs after the response.
 */
import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { createLead } from "@/lib/crm";
import { notifyNewLead } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { leadCode } from "@/lib/ids";
import { clientIp, createLimiter, retryHeaders } from "@/lib/rate-limit";
import { readJsonObject } from "../_lib/body";

export const runtime = "nodejs";

/** A full form is a few kilobytes; 64 KB leaves room for long messages and nothing else. */
const MAX_BODY_BYTES = 64 * 1024;
/** `details` is stored verbatim in the lead row, so it gets its own ceiling. */
const MAX_DETAILS_BYTES = 8 * 1024;

const leads = createLimiter("leads", { limit: 10, windowMs: 60_000 });

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/**
 * The extra answers the wizard collects. Known keys only: zod drops everything else, so a bot cannot
 * use the lead row as free storage.
 */
const DetailsSchema = z.object({
  companyType: opt(60),
  volume: opt(60),
  dims: z.object({ width: opt(20), depth: opt(20), height: opt(20) }).optional(),
  style: opt(2000),
  appliances: opt(500),
  deadline: opt(120),
});

const LeadSchema = z.object({
  segment: z.enum(["b2b", "b2c"]),
  name: z.string().trim().min(1).max(120),
  companyName: opt(120),
  phone: opt(40),
  email: opt(120),
  telegram: opt(60),
  preferredChannel: opt(20),
  language: opt(5),
  service: opt(40),
  roomType: opt(40),
  budget: opt(20),
  message: z.string().max(4000).optional().or(z.literal("")),
  details: DetailsSchema.optional(),
  files: z.array(z.string().max(40)).max(20).optional(),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
  pagePath: opt(300),
  source: opt(30),
  website: z.string().max(200).optional(), // honeypot
});

/** Empty strings and empty objects are not worth storing. */
function pruneEmpty<T extends Record<string, unknown>>(obj: T): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const inner = pruneEmpty(v as Record<string, unknown>);
      if (inner) out[k] = inner;
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = leads.take(ip || "local");
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: retryHeaders(limit) });

  const body = await readJsonObject(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ ok: false, error: body.error === "too_large" ? "too_large" : "invalid_json" }, { status: body.status });

  const parsed = LeadSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  const b = parsed.data;

  // honeypot: bots fill it, humans never see it
  if (b.website) return NextResponse.json({ ok: true, id: "ok", code: "OK" });

  if (!b.phone && !b.email && !b.telegram) return NextResponse.json({ ok: false, error: "contact_required" }, { status: 400 });

  const details = b.details ? pruneEmpty(b.details) : undefined;
  if (details && JSON.stringify(details).length > MAX_DETAILS_BYTES) return NextResponse.json({ ok: false, error: "details_too_large" }, { status: 400 });

  const utm = b.utm ? Object.fromEntries(Object.entries(b.utm).filter(([, v]) => v).slice(0, 12)) : undefined;
  const lead = createLead({
    segment: b.segment,
    name: b.name,
    companyName: b.companyName || undefined,
    phone: b.phone || undefined,
    email: b.email || undefined,
    telegram: b.telegram || undefined,
    preferredChannel: b.preferredChannel || undefined,
    language: b.language || undefined,
    service: b.service || undefined,
    roomType: b.roomType || undefined,
    budget: b.budget || undefined,
    message: b.message || undefined,
    details,
    files: b.files,
    utm,
    pagePath: b.pagePath || undefined,
    source: b.source || "website",
  });

  // Telegram/e-mail can be slow or unreachable; the visitor must not wait for them (and must not
  // resend the form because of it). `after()` runs once the response has been handed to the client.
  after(async () => {
    try {
      await notifyNewLead(lead);
    } catch (e) {
      console.warn("[leads] notify failed", (e as Error).message);
    }
  });

  track({
    type: "form_submit",
    path: b.pagePath || undefined,
    locale: b.language || undefined,
    segment: b.segment,
    utm: utm ? { source: utm.utm_source ?? utm.source, medium: utm.utm_medium ?? utm.medium, campaign: utm.utm_campaign ?? utm.campaign } : undefined,
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
    meta: { leadId: lead.id, service: lead.service, roomType: lead.roomType },
  });

  // `code` is the request number the visitor is shown; staff find it again with the same helper.
  return NextResponse.json({ ok: true, id: lead.id, code: leadCode(lead.id) });
}
