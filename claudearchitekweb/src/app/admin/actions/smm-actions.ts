"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PLATFORMS, aiStatus, rewriteText } from "@/lib/ai";
import { createPostPack, getPostFull, publishPost, schedulePost, sendForApproval, setPostStatus } from "@/lib/smm";
import { deletePost, duplicatePost, setPostAssets, toAssetLite, updatePost, updateVariant } from "@/lib/smm-admin";
import { generatePoster } from "@/lib/media";
import { getDb, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { telegramEnabled } from "@/lib/telegram";
import { nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice / error wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  return local(
    {
      hy: {
        notFound: "Փոստը չի գտնվել։",
        sourceImage: "Աղբյուրը պետք է լինի նկար։",
        noPlatform: "Ոչ մի հարթակ միացված չէ։",
        invalidDate: "Ամսաթիվը սխալ է։",
        setScheduleFirst: "Սկզբում նշիր պլանավորված ժամը։",
        generated: "Փոստի փաթեթը ստեղծված է՝",
        withTemplates: "ներկառուցված ձևանմուշներով",
        deleted: "Փոստը ջնջված է։",
        approvalDry: "նշվեց «սպասում է հաստատման» (Telegram-ը կարգավորված չէ՝ փորձնական ռեժիմ)։",
        approvalSent: "ուղարկվեց Telegram՝ հաստատման։",
        approved: "հաստատված է։",
        cancelled: "չեղարկված է։",
        deletedOne: "ջնջված է։",
        simulated: "փորձնական",
        platformsWord: "հարթակ",
        unknownAction: "Անհայտ գործողություն։",
        approvalDryMsg: "Telegram-ը կարգավորված չէ (բոտի բանալի / ադմին չաթի id)։ Փոստը նշվեց «սպասում է հաստատման» — հաստատիր այստեղ։",
        approvalOkMsg: "Նախադիտումն ուղարկվեց Telegram ադմին չաթ՝ «Հաստատել / Խմբագրել / Բաց թողնել» կոճակներով։",
        noAiKey: "AI բանալի չկա (ANTHROPIC_API_KEY կամ GEMINI_API_KEY) — տեքստը մնաց անփոփոխ։",
      },
      en: {
        notFound: "Post not found.",
        sourceImage: "Source must be an image asset.",
        noPlatform: "No platform variant is enabled.",
        invalidDate: "Invalid date.",
        setScheduleFirst: "Set a schedule time first.",
        generated: "Post pack generated with",
        withTemplates: "built-in templates",
        deleted: "Post deleted.",
        approvalDry: "marked awaiting approval (Telegram dry run: no bot configured).",
        approvalSent: "sent to Telegram for approval.",
        approved: "approved.",
        cancelled: "cancelled.",
        deletedOne: "deleted.",
        simulated: "simulated",
        platformsWord: "platform(s)",
        unknownAction: "Unknown action.",
        approvalDryMsg: "Telegram is not configured (bot token / admin chat id). The post is marked awaiting approval; approve it here in the admin.",
        approvalOkMsg: "Preview sent to the Telegram admin chat with Approve / Edit / Skip buttons.",
        noAiKey: "No AI key configured (ANTHROPIC_API_KEY or GEMINI_API_KEY) — text returned unchanged.",
      },
    },
    locale,
  );
}

const PlatformEnum = z.enum(PLATFORMS);
const LangEnum = z.enum(["hy", "ru", "en"]);
const GoalEnum = z.enum(["trust", "sales_b2b", "sales_b2c", "showcase", "education"]);

function notice(path: string, text: string, tone: "ok" | "error" = "ok"): never {
  redirect(`${path}?notice=${encodeURIComponent(text)}&tone=${tone}`);
}

function refresh(id?: string) {
  revalidatePath("/admin/smm");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/smm/${id}`);
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------
const CreateSchema = z.object({
  projectId: z.string().nullable().optional(),
  assetIds: z.array(z.string()).max(20),
  platforms: z.array(PlatformEnum).min(1),
  language: LangEnum,
  goal: GoalEnum,
  scheduledAt: z.string().nullable().optional(),
  extraInstructions: z.string().max(2000).optional(),
});

export async function createPostAction(input: z.infer<typeof CreateSchema>) {
  const user = await requireUser();
  const data = CreateSchema.parse(input);
  const r = await createPostPack({ ...data, projectId: data.projectId || null, scheduledAt: data.scheduledAt || null, createdBy: user.id });
  refresh(r.postId);
  const m = await M();
  notice(`/admin/smm/${r.postId}`, `${m.generated} ${r.provider === "template" ? m.withTemplates : r.provider}. ${r.warning && r.provider !== "template" ? r.warning : ""}`.trim());
}

const PosterSchema = z.object({
  sourceAssetId: z.string(),
  ratio: z.enum(["1:1", "4:5", "16:9", "9:16"]),
  headline: z.string().max(80).optional(),
  projectId: z.string().nullable().optional(),
  postId: z.string().optional(),
});

/** Generates a branded poster from a render; returns the new asset (optionally appended to a post). */
export async function generatePosterAction(input: z.infer<typeof PosterSchema>) {
  await requireUser();
  const data = PosterSchema.parse(input);
  const src = getDb().select().from(schema.assets).where(eq(schema.assets.id, data.sourceAssetId)).get();
  if (!src || !src.mime.startsWith("image/")) return { ok: false as const, error: (await M()).sourceImage };
  const brand = getSetting("brand");
  const row = await generatePoster({ sourceRelPath: src.relPath, ratio: data.ratio, headline: data.headline, brand: brand.name, sub: brand.website.replace(/^https?:\/\/(www\.)?/, ""), projectId: data.projectId ?? src.projectId ?? null });
  const asset = getDb().select().from(schema.assets).where(eq(schema.assets.id, row.id)).get()!;
  if (data.postId) {
    const full = getPostFull(data.postId);
    if (full) setPostAssets(data.postId, [...full.assets.map((a) => a.id), asset.id]);
    refresh(data.postId);
  }
  return { ok: true as const, asset: toAssetLite(asset) };
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
const VariantSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  title: z.string().max(200).nullable(),
  text: z.string().max(70000),
  hashtags: z.array(z.string().max(80)).max(40),
  cta: z.string().max(300).nullable(),
  format: z.enum(["image", "carousel", "video", "reel", "short", "text"]),
});
const SaveSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
  goal: GoalEnum.optional(),
  language: LangEnum.optional(),
  variants: z.array(VariantSchema),
  assetIds: z.array(z.string()).max(20),
});

export async function savePostAction(input: z.infer<typeof SaveSchema>) {
  await requireUser();
  const data = SaveSchema.parse(input);
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: (await M()).notFound };
  updatePost(data.id, { title: data.title, notes: data.notes ?? null, ...(data.goal ? { goal: data.goal } : {}), ...(data.language ? { language: data.language } : {}) });
  for (const v of data.variants) updateVariant(data.id, v.id, { enabled: v.enabled, title: v.title, text: v.text, hashtags: v.hashtags, cta: v.cta, format: v.format });
  setPostAssets(data.id, data.assetIds);
  refresh(data.id);
  return { ok: true as const };
}

export async function schedulePostAction(input: { id: string; scheduledAt: string | null }) {
  await requireUser();
  const data = z.object({ id: z.string(), scheduledAt: z.string().nullable() }).parse(input);
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: (await M()).notFound };
  if (data.scheduledAt && Number.isNaN(new Date(data.scheduledAt).getTime())) return { ok: false as const, error: (await M()).invalidDate };
  // Keep the approval state if already sent; only draft/scheduled flip.
  if (["draft", "scheduled"].includes(full.post.status)) schedulePost(data.id, data.scheduledAt);
  else getDb().update(schema.posts).set({ scheduledAt: data.scheduledAt, updatedAt: nowIso() }).where(eq(schema.posts.id, data.id)).run();
  refresh(data.id);
  return { ok: true as const };
}

export async function setPostStatusAction(input: { id: string; status: "approved" | "cancelled" | "draft" | "scheduled" }) {
  await requireUser();
  const data = z.object({ id: z.string(), status: z.enum(["approved", "cancelled", "draft", "scheduled"]) }).parse(input);
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: (await M()).notFound };
  if (data.status === "scheduled" && !full.post.scheduledAt) return { ok: false as const, error: (await M()).setScheduleFirst };
  setPostStatus(data.id, data.status, data.status === "approved" ? { approvedAt: nowIso() } : {});
  refresh(data.id);
  return { ok: true as const };
}

export async function sendApprovalAction(input: { id: string }) {
  await requireUser();
  const { id } = z.object({ id: z.string() }).parse(input);
  const full = getPostFull(id);
  if (!full) return { ok: false as const, error: (await M()).notFound };
  const r = await sendForApproval(id);
  refresh(id);
  const configured = telegramEnabled() && !!getSetting("telegram").adminChatId;
  const m = await M();
  return { ok: true as const, dryRun: !!("dryRun" in r && r.dryRun), configured, message: "dryRun" in r && r.dryRun ? m.approvalDryMsg : m.approvalOkMsg };
}

export async function publishNowAction(input: { id: string }) {
  await requireUser();
  const { id } = z.object({ id: z.string() }).parse(input);
  const full = getPostFull(id);
  if (!full) return { ok: false as const, error: (await M()).notFound };
  if (!full.variants.some((v) => v.enabled)) return { ok: false as const, error: (await M()).noPlatform };
  const r = await publishPost(id);
  refresh(id);
  return { ok: true as const, status: r.status, results: r.results };
}

export async function duplicatePostAction(input: { id: string }) {
  const user = await requireUser();
  const { id } = z.object({ id: z.string() }).parse(input);
  const newId = duplicatePost(id, user.id);
  if (!newId) return { ok: false as const, error: (await M()).notFound };
  refresh(newId);
  return { ok: true as const, id: newId };
}

export async function deletePostAction(input: { id: string }) {
  await requireUser();
  const { id } = z.object({ id: z.string() }).parse(input);
  deletePost(id);
  refresh();
  notice("/admin/smm", (await M()).deleted);
}

const RewriteSchema = z.object({ instruction: z.string().min(1).max(500), text: z.string().min(1).max(70000), language: LangEnum });

export async function rewriteVariantAction(input: z.infer<typeof RewriteSchema>) {
  await requireUser();
  const data = RewriteSchema.parse(input);
  const status = aiStatus();
  if (status.provider === "template") return { ok: true as const, text: data.text, changed: false, provider: status.provider, note: (await M()).noAiKey };
  try {
    const text = await rewriteText(data.instruction, data.text, data.language);
    return { ok: true as const, text: text || data.text, changed: !!text && text !== data.text, provider: status.provider };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Quick actions from the hub table (plain forms)
// ---------------------------------------------------------------------------
export async function quickActionForm(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const full = getPostFull(id);
  const m = await M();
  if (!full) notice("/admin/smm", m.notFound, "error");
  if (op === "approval") {
    const r = await sendForApproval(id);
    refresh(id);
    notice("/admin/smm", `"${full.post.title}" ${"dryRun" in r && r.dryRun ? m.approvalDry : m.approvalSent}`);
  }
  if (op === "publish") {
    const r = await publishPost(id);
    refresh(id);
    const sim = r.results.filter((x) => x.status === "simulated").length;
    notice("/admin/smm", `"${full.post.title}": ${r.status.replace("_", " ")} — ${r.results.length} ${m.platformsWord}${sim ? `, ${sim} ${m.simulated}` : ""}.`, r.status === "failed" ? "error" : "ok");
  }
  if (op === "approve") {
    setPostStatus(id, "approved", { approvedAt: nowIso() });
    refresh(id);
    notice("/admin/smm", `"${full.post.title}" ${m.approved}`);
  }
  if (op === "cancel") {
    setPostStatus(id, "cancelled");
    refresh(id);
    notice("/admin/smm", `"${full.post.title}" ${m.cancelled}`);
  }
  if (op === "delete") {
    deletePost(id);
    refresh();
    notice("/admin/smm", `"${full.post.title}" ${m.deletedOne}`);
  }
  notice("/admin/smm", m.unknownAction, "error");
}
