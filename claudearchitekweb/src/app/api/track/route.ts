import { NextResponse, type NextRequest } from "next/server";
import { track } from "@/lib/analytics";

const TYPES = new Set(["page_view", "cta_click", "form_start", "form_submit", "portal_view", "portal_action"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = String(body.type ?? "");
  if (!TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const utm = (body.utm ?? {}) as { source?: string; medium?: string; campaign?: string };
  track({
    type: type as "page_view",
    path: typeof body.path === "string" ? body.path : undefined,
    locale: typeof body.locale === "string" ? body.locale : undefined,
    segment: typeof body.segment === "string" ? body.segment : undefined,
    referrer: typeof body.referrer === "string" ? body.referrer.replace(/^https?:\/\//, "").split("/")[0] : undefined,
    utm,
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
    meta: typeof body.meta === "object" && body.meta ? (body.meta as Record<string, unknown>) : undefined,
  });
  return NextResponse.json({ ok: true });
}
