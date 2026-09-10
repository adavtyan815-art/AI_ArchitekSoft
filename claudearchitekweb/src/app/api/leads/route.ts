import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createLead } from "@/lib/crm";
import { notifyNewLead } from "@/lib/notify";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

const LIMIT = 10;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  cur.count++;
  return cur.count > LIMIT;
}

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

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
  details: z.record(z.string(), z.unknown()).optional(),
  files: z.array(z.string().max(40)).max(20).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
  pagePath: opt(300),
  source: opt(30),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = LeadSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  const b = parsed.data;

  // honeypot: bots fill it, humans never see it
  if (b.website) return NextResponse.json({ ok: true, id: "ok", code: "OK" });

  if (!b.phone && !b.email && !b.telegram) return NextResponse.json({ ok: false, error: "contact_required" }, { status: 400 });

  const utm = b.utm ? Object.fromEntries(Object.entries(b.utm).filter(([, v]) => v)) : undefined;
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
    details: b.details,
    files: b.files,
    utm,
    pagePath: b.pagePath || undefined,
    source: b.source || "website",
  });

  try {
    await notifyNewLead(lead);
  } catch (e) {
    console.warn("[leads] notify failed", (e as Error).message);
  }

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

  return NextResponse.json({ ok: true, id: lead.id, code: lead.id.slice(-6).toUpperCase() });
}
