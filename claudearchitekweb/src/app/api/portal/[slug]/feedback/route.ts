/**
 * POST /api/portal/[slug]/feedback  { k?, type: approve|change|change_request|question, message?, contact? }
 * The token may come from the JSON body (`k`) or the query string (?k=).
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { logActivity } from "@/lib/crm";
import { notifyClientFeedback } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { checkAccess, getShareLinkBySlug, passcodeCookieName, recordEvent } from "@/lib/portal";
import { nowIso } from "@/lib/utils";

const TYPE_MAP: Record<string, "approve" | "change_request" | "question"> = {
  approve: "approve",
  change: "change_request",
  change_request: "change_request",
  question: "question",
};

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
  const access = checkAccess(link, token, link ? req.cookies.get(passcodeCookieName(link.id))?.value : null);
  if (access !== "ok" || !link) return NextResponse.json({ ok: false, error: access }, { status: access === "passcode" ? 401 : 404 });
  if (!link.allowFeedback) return NextResponse.json({ ok: false, error: "feedback_disabled" }, { status: 403 });

  const type = TYPE_MAP[String(body.type ?? "")];
  if (!type) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 200) : "";
  if (type !== "approve" && !message) return NextResponse.json({ ok: false, error: "message_required" }, { status: 400 });

  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, link.projectId)).get();
  if (!project) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const fb = { id: newId("fb"), projectId: project.id, shareLinkId: link.id, type, message: message || null, contact: contact || null, resolved: false, createdAt: nowIso() };
  db.insert(schema.clientFeedback).values(fb).run();

  const label = type === "approve" ? "approved the project" : type === "change_request" ? "requested changes" : "asked a question";
  logActivity("project", project.id, `Client ${label} via link "${link.slug}"${message ? `: ${message.slice(0, 500)}` : ""}${contact ? ` (contact: ${contact})` : ""}`, "message");

  let stageChanged = false;
  if (type === "approve" && project.stage === "approval") {
    db.update(schema.projects).set({ stage: "production_prep", updatedAt: nowIso() }).where(eq(schema.projects.id, project.id)).run();
    logActivity("project", project.id, "Stage: approval → production_prep (client approval)", "status");
    stageChanged = true;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = req.headers.get("user-agent") ?? "";
  try {
    recordEvent(link.id, type === "approve" ? "approve" : type === "change_request" ? "change_request" : "question", { feedbackId: fb.id }, { ip, ua });
  } catch (e) {
    console.warn("[portal] recordEvent failed", (e as Error).message);
  }
  track({ type: "portal_action", path: `/p/${slug}`, locale: link.language, segment: project.segment, ip, userAgent: ua, meta: { action: `feedback_${type}`, linkId: link.id } });

  try {
    await notifyClientFeedback(fb, project);
  } catch (e) {
    console.warn("[portal] notifyClientFeedback failed", (e as Error).message);
  }

  return NextResponse.json({ ok: true, id: fb.id, type, stage: stageChanged ? "production_prep" : project.stage, createdAt: fb.createdAt });
}
