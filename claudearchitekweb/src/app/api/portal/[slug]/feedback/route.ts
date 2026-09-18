/**
 * POST /api/portal/[slug]/feedback  { k?, type: approve|change|change_request|question, message?, contact? }
 * The token may come from the JSON body (`k`) or the query string (?k=).
 *
 * One link holder could otherwise insert rows and trigger an owner notification in a loop, so the
 * endpoint is limited per link and per address, repeats of the same message are answered with the
 * row that already exists, and a project can only be approved once.
 */
import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { logActivity } from "@/lib/crm";
import { notifyClientFeedback } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { actionStrings } from "@/lib/admin-log";
import { labelFor, local } from "@/lib/i18n/admin";
import { checkAccess, getShareLinkBySlug, passcodeCookieName, recordEvent } from "@/lib/portal";
import { clientIp, createLimiter, retryHeaders } from "@/lib/rate-limit";
import { nowIso } from "@/lib/utils";
import { readJsonObject } from "../../../_lib/body";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
/** A repeat of the exact same message inside this window is the same message, not a new one. */
const DEDUPE_MS = 10 * 60_000;

/** Ten messages per hour, per client page and per address. */
const submissions = createLimiter("portal-feedback", { limit: 10, windowMs: 3600_000 });

const FeedbackSchema = z.object({
  type: z.enum(["approve", "change", "change_request", "question"]),
  message: z.string().max(4000).optional(),
  contact: z.string().max(200).optional(),
});

const TYPE_MAP = { approve: "approve", change: "change_request", change_request: "change_request", question: "question" } as const;
type FeedbackType = (typeof TYPE_MAP)[keyof typeof TYPE_MAP];

/**
 * Timeline sentences for something the *client* did. They are written in the owner's default
 * language (Armenian) unless the admin interface is set to English, like every other system entry.
 */
const sentences = (locale: "hy" | "en") =>
  local(
    {
      hy: {
        approved: (slug: string) => `Հաճախորդը հաստատեց նախագիծը «${slug}» էջից`,
        changes: (slug: string) => `Հաճախորդը խնդրեց փոփոխություններ «${slug}» էջից`,
        question: (slug: string) => `Հաճախորդը հարց տվեց «${slug}» էջից`,
        contact: (c: string) => ` (կապ՝ ${c})`,
      },
      en: {
        approved: (slug: string) => `Client approved the project on the “${slug}” page`,
        changes: (slug: string) => `Client requested changes on the “${slug}” page`,
        question: (slug: string) => `Client asked a question on the “${slug}” page`,
        contact: (c: string) => ` (contact: ${c})`,
      },
    },
    locale
  );

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = await readJsonObject(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ ok: false, error: "bad_json" }, { status: body.status });

  const token = (typeof body.value.k === "string" && body.value.k) || req.nextUrl.searchParams.get("k") || "";
  const link = getShareLinkBySlug(slug);
  const access = checkAccess(link, token, link ? req.cookies.get(passcodeCookieName(link.id))?.value : null);
  if (access !== "ok" || !link) return NextResponse.json({ ok: false, error: access }, { status: access === "passcode" ? 401 : 404 });
  if (!link.allowFeedback) return NextResponse.json({ ok: false, error: "feedback_disabled" }, { status: 403 });

  const parsed = FeedbackSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  const type: FeedbackType = TYPE_MAP[parsed.data.type];
  const message = parsed.data.message?.trim().slice(0, 4000) ?? "";
  const contact = parsed.data.contact?.trim().slice(0, 200) ?? "";
  if (type !== "approve" && !message) return NextResponse.json({ ok: false, error: "message_required" }, { status: 400 });

  const ip = clientIp(req.headers);
  for (const key of [`link:${link.id}`, `ip:${ip || "local"}`]) {
    const r = submissions.take(key);
    if (!r.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: retryHeaders(r) });
  }

  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, link.projectId)).get();
  if (!project) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // A project is approved once. Without this a reloaded page offers the approve option again and
  // every click adds another row for the owner to work through.
  if (type === "approve") {
    const existing = db
      .select({ id: schema.clientFeedback.id, createdAt: schema.clientFeedback.createdAt })
      .from(schema.clientFeedback)
      .where(and(eq(schema.clientFeedback.projectId, project.id), eq(schema.clientFeedback.type, "approve")))
      .orderBy(desc(schema.clientFeedback.createdAt))
      .get();
    if (existing) return NextResponse.json({ ok: false, error: "already_approved", id: existing.id, stage: project.stage, createdAt: existing.createdAt }, { status: 409 });
  }

  // The same sentence sent twice (a double tap, a retried request) is one message.
  if (message) {
    const twin = db
      .select({ id: schema.clientFeedback.id, createdAt: schema.clientFeedback.createdAt, message: schema.clientFeedback.message })
      .from(schema.clientFeedback)
      .where(and(eq(schema.clientFeedback.shareLinkId, link.id), eq(schema.clientFeedback.type, type), gte(schema.clientFeedback.createdAt, new Date(Date.now() - DEDUPE_MS).toISOString())))
      .orderBy(desc(schema.clientFeedback.createdAt))
      .get();
    if (twin && twin.message === message) return NextResponse.json({ ok: true, id: twin.id, type, stage: project.stage, createdAt: twin.createdAt, duplicate: true });
  }

  const fb = { id: newId("fb"), projectId: project.id, shareLinkId: link.id, type, message: message || null, contact: contact || null, resolved: false, createdAt: nowIso() };
  db.insert(schema.clientFeedback).values(fb).run();

  const { t, L, locale } = await actionStrings();
  const S = sentences(locale);
  const headline = type === "approve" ? S.approved(link.slug) : type === "change_request" ? S.changes(link.slug) : S.question(link.slug);
  // The stored text is the fallback for older readers; `meta` lets formatActivity re-render the entry
  // in whatever language the admin is reading in, with real stage labels instead of raw keys.
  logActivity("project", project.id, `${headline}${message ? `: ${message.slice(0, 500)}` : ""}${contact ? S.contact(contact) : ""}`, "message", null, {
    e: "portal_feedback",
    kind: type,
    slug: link.slug,
    message: message ? message.slice(0, 500) : undefined,
  });

  let stageChanged = false;
  if (type === "approve" && project.stage === "approval") {
    db.update(schema.projects).set({ stage: "production_prep", updatedAt: nowIso() }).where(eq(schema.projects.id, project.id)).run();
    logActivity("project", project.id, L.stageChange(labelFor(t, "projectStage", "approval"), labelFor(t, "projectStage", "production_prep")), "status", null, {
      e: "stage_changed",
      from: "approval",
      to: "production_prep",
      by: "client",
    });
    stageChanged = true;
  }

  const ua = req.headers.get("user-agent") ?? "";
  try {
    recordEvent(link.id, type === "approve" ? "approve" : type === "change_request" ? "change_request" : "question", { feedbackId: fb.id }, { ip, ua });
  } catch (e) {
    console.warn("[portal] recordEvent failed", (e as Error).message);
  }
  track({ type: "portal_action", path: `/p/${slug}`, locale: link.language, segment: project.segment, ip, userAgent: ua, meta: { action: `feedback_${type}`, linkId: link.id } });

  // The client should not wait for Telegram/e-mail to answer, and a slow bot must not make them resend.
  after(async () => {
    try {
      await notifyClientFeedback(fb, project);
    } catch (e) {
      console.warn("[portal] notifyClientFeedback failed", (e as Error).message);
    }
  });

  return NextResponse.json({ ok: true, id: fb.id, type, stage: stageChanged ? "production_prep" : project.stage, createdAt: fb.createdAt });
}
