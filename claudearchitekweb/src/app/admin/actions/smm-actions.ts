"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PLATFORMS, aiStatus, rewriteText } from "@/lib/ai";
import { createPostPack, getPostFull, publishPost, schedulePost, sendForApproval, setPostStatus } from "@/lib/smm";
import { deletePost, duplicatePost, setPostAssets, toAssetLite, updatePost, updateVariant } from "@/lib/smm-admin";
import { generatePoster } from "@/lib/media";
import { runInbox, suggestSlot, suggestedSlotOf, wasImported } from "@/lib/inbox";
import { PLATFORM_META } from "@/lib/social";
import { listAmbientTracks } from "@/lib/audio";
import { toYerevanInput } from "@/lib/tz";
import { getDb, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { telegramEnabled } from "@/lib/telegram";
import { nowIso } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice / error wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
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
        invalidInput: "Տվյալները սխալ են։ Ստուգիր դաշտերը և փորձիր նորից։",
        titleRequired: "Ներքին անվանումը պարտադիր է։",
        titleTooLong: "Ներքին անվանումը շատ երկար է (առավելագույնը 120 նիշ)։",
        textTooLong: "Տեքստը շատ երկար է (առավելագույնը 70 000 նիշ)։",
        variantTitleTooLong: "Վերնագիրը շատ երկար է (առավելագույնը 200 նիշ)։",
        hashtagTooLong: "Հեշթեգը շատ երկար է (առավելագույնը 80 նիշ)։",
        tooManyHashtags: "Հեշթեգները շատ են (առավելագույնը 40)։",
        ctaTooLong: "Կոչը շատ երկար է (առավելագույնը 300 նիշ)։",
        notesTooLong: "Նշումները շատ երկար են (առավելագույնը 2000 նիշ)։",
        tooManyMedia: "Մեկ փոստին կարելի է կցել առավելագույնը 20 ֆայլ։",
        pickPlatform: "Ընտրիր գոնե մեկ հարթակ։",
        instructionsTooLong: "Լրացուցիչ ցուցումները շատ երկար են (առավելագույնը 2000 նիշ)։",
        projectNotFound: "Նախագիծը չի գտնվել։",
        generateFailed: "Չհաջողվեց ստեղծել փոստը։ Փորձիր նորից։",
        posterFailed: "Պաստառը չհաջողվեց ստեղծել։ Ստուգիր, որ աղբյուր նկարը կա և վնասված չէ։",
        posterFromPoster: "Պաստառը չի կարող լինել նոր պաստառի աղբյուր։ Ընտրիր ռենդեր։",
        headlineTooLong: "Պաստառի վերնագիրը շատ երկար է (առավելագույնը 80 նիշ)։",
        pastDate: "Այս ժամն արդեն անցել է։ Ընտրիր ապագա ժամ կամ սեղմիր «Հրապարակել հիմա»։",
        alreadyPublished: "Փոստն արդեն հրապարակված է — նորից հրապարակելու համար կրկնօրինակիր այն։",
        publishingNow: "Փոստը հենց հիմա հրապարակվում է։ Մի քիչ սպասիր։",
        cancelledPost: "Փոստը չեղարկված է։ Սկզբում վերադարձրու սևագրի։",
        cannotCancelPublished: "Հրապարակված փոստը հնարավոր չէ չեղարկել։",
        cannotApprove: "Այս վիճակում փոստը հնարավոր չէ հաստատել։",
        approvalFailed: "Չհաջողվեց ուղարկել Telegram։",
        publishFailed: "Հրապարակումը չհաջողվեց։",
        failedWord: "չհաջողվեց՝",
        rewriteInput: "Գրիր ցուցում (մինչև 500 նիշ) և ոչ դատարկ տեքստ։",
        rewriteFailed: "AI-ը չկարողացավ վերաշարադրել տեքստը։ Փորձիր նորից։",
        inboxNone: "Պատրաստ պանակ չկա — ֆայլերը դեռ պատճենվում են։ Փորձիր կես րոպեից։",
        inboxEmpty: "Ֆայլերի պանակը դատարկ է։",
        inboxAlready: "Այս պանակն արդեն ներմուծված է։",
        inboxBlocked: "Հնարավոր չէ ներմուծել՝ այս պանակի ֆայլերից մեկը բաց է այլ ծրագրում։ Փակիր այն և փորձիր նորից՝",
        inboxPartialWord: "ֆայլ չհաջողվեց կարդալ",
        inboxImported: "Ներմուծվեց",
        inboxFailedWord: "չհաջողվեց՝",
        inboxWarningsWord: "զգուշացում",
        inboxFailedAction: "Ներմուծումը չհաջողվեց։ Ստուգիր սերվերի մատյանը։",
        noSuggestedSlot: "Այս փոստը առաջարկվող ժամ չունի։",
        noSlotAvailable: "Ազատ ժամ չգտնվեց։ Ստուգիր Կարգավորումներ → Սոց. ցանցեր օրերն ու ժամը։",
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
        invalidInput: "Some fields are invalid. Check the form and try again.",
        titleRequired: "The internal title is required.",
        titleTooLong: "The internal title is too long (max 120 characters).",
        textTooLong: "The text is too long (max 70,000 characters).",
        variantTitleTooLong: "The headline is too long (max 200 characters).",
        hashtagTooLong: "A hashtag is too long (max 80 characters).",
        tooManyHashtags: "Too many hashtags (max 40).",
        ctaTooLong: "The call to action is too long (max 300 characters).",
        notesTooLong: "The notes are too long (max 2000 characters).",
        tooManyMedia: "A post can have at most 20 media files.",
        pickPlatform: "Pick at least one platform.",
        instructionsTooLong: "The extra instructions are too long (max 2000 characters).",
        projectNotFound: "Project not found.",
        generateFailed: "The post could not be generated. Try again.",
        posterFailed: "The poster could not be generated. Check that the source image exists and is not damaged.",
        posterFromPoster: "A poster cannot be the source of another poster. Pick a render.",
        headlineTooLong: "The poster headline is too long (max 80 characters).",
        pastDate: "That time is in the past. Pick a future time or use Publish now.",
        alreadyPublished: "This post is already published — duplicate it to post again.",
        publishingNow: "This post is being published right now. Wait a moment.",
        cancelledPost: "This post is cancelled. Move it back to draft first.",
        cannotCancelPublished: "A post that has already been published cannot be cancelled.",
        cannotApprove: "This post cannot be approved in its current state.",
        approvalFailed: "Could not send to Telegram.",
        publishFailed: "Publishing failed.",
        failedWord: "failed:",
        rewriteInput: "Enter an instruction (up to 500 characters) and a non-empty text.",
        rewriteFailed: "The AI could not rewrite the text. Try again.",
        inboxNone: "Nothing is ready yet — the files are still being copied. Try again in half a minute.",
        inboxEmpty: "The file inbox is empty.",
        inboxAlready: "Already imported.",
        inboxBlocked: "Could not be imported — a file in this folder is open in another program. Close it and try again:",
        inboxPartialWord: "file(s) could not be read",
        inboxImported: "Imported",
        inboxFailedWord: "failed:",
        inboxWarningsWord: "warning(s)",
        inboxFailedAction: "The import failed. Check the server log.",
        noSuggestedSlot: "This post has no suggested slot.",
        noSlotAvailable: "No free slot was found. Check the posting days and time in Settings → Social media.",
      },
    },
    locale,
  );
  return { ...words, postStatus: adminDict(locale).postStatus as Record<string, string> };
}
type Msgs = Awaited<ReturnType<typeof M>>;
type FullPost = NonNullable<ReturnType<typeof getPostFull>>;

const PlatformEnum = z.enum(PLATFORMS);
const LangEnum = z.enum(["hy", "ru", "en"]);
const GoalEnum = z.enum(["trust", "sales_b2b", "sales_b2c", "showcase", "education"]);
const CanvasModeEnum = z.enum(["original", "smart_4_5", "story_9_16"]);
const CanvasMatteEnum = z.enum(["blur", "dark"]);
const AudioModeEnum = z.enum(["none", "auto", "custom"]);

/** Statuses after which something has been (or is being) sent out: no cancel, no new approval round. */
const SENT_STATUSES = ["published", "partially_published", "publishing"];
/** A schedule this far in the past is still accepted (clock skew, slow click). */
const PAST_TOLERANCE_MS = 60_000;
const MAX_MEDIA = 20;

function notice(path: string, text: string, tone: "ok" | "error" = "ok"): never {
  redirect(`${path}?notice=${encodeURIComponent(text)}&tone=${tone}`);
}

function refresh(id?: string) {
  revalidatePath("/admin/smm");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/smm/${id}`);
}

const platformLabel = (p: string) => PLATFORM_META[p]?.label ?? p;

/**
 * First Zod issue → one readable, localised sentence that names the field.
 * `variantLabel` turns a variant index into its platform name for the prefix.
 */
function validationMessage(error: z.ZodError, m: Msgs, variantLabel?: (index: number) => string | null): string {
  const issue = error.issues[0];
  if (!issue) return m.invalidInput;
  const path = issue.path;
  const inVariant = path[0] === "variants";
  const field = String(inVariant ? (path[2] ?? "") : (path[0] ?? ""));
  const big = issue.code === "too_big";
  let text = m.invalidInput;
  if (!inVariant && field === "title") text = big ? m.titleTooLong : m.titleRequired;
  else if (!inVariant && field === "notes") text = m.notesTooLong;
  else if (field === "assetIds" && big) text = m.tooManyMedia;
  else if (field === "platforms") text = m.pickPlatform;
  else if (field === "extraInstructions") text = m.instructionsTooLong;
  else if (field === "headline") text = m.headlineTooLong;
  else if (inVariant && field === "text" && big) text = m.textTooLong;
  else if (inVariant && field === "title" && big) text = m.variantTitleTooLong;
  else if (inVariant && field === "cta" && big) text = m.ctaTooLong;
  else if (inVariant && field === "hashtags" && big) text = path.length > 3 ? m.hashtagTooLong : m.tooManyHashtags;
  const index = inVariant ? path[1] : undefined;
  const label = typeof index === "number" ? variantLabel?.(index) : null;
  return label ? `${label}: ${text}` : text;
}

/** null = fine; otherwise the localised reason the ISO timestamp cannot be used as a schedule. */
function scheduleProblem(iso: string | null | undefined, m: Msgs): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return m.invalidDate;
  if (at < Date.now() - PAST_TOLERANCE_MS) return m.pastDate;
  return null;
}

/** Why a post in this state cannot be published right now (null = it can). */
function publishProblem(full: FullPost, m: Msgs): string | null {
  if (full.post.status === "publishing") return m.publishingNow;
  if (full.post.status === "published") return m.alreadyPublished;
  if (full.post.status === "cancelled") return m.cancelledPost;
  if (!full.variants.some((v) => v.enabled)) return m.noPlatform;
  return null;
}

/** Why a post in this state cannot be sent for approval (null = it can). */
function approvalProblem(full: FullPost, m: Msgs): string | null {
  if (full.post.status === "publishing") return m.publishingNow;
  if (full.post.status === "published" || full.post.status === "partially_published") return m.alreadyPublished;
  if (full.post.status === "cancelled") return m.cancelledPost;
  if (!full.variants.some((v) => v.enabled)) return m.noPlatform;
  return null;
}

/** Why the status cannot move to `next` (null = allowed). Published history is never rewritten. */
function statusProblem(current: string, next: "approved" | "cancelled" | "draft" | "scheduled", m: Msgs): string | null {
  if (current === "publishing") return m.publishingNow;
  if (next === "cancelled") return SENT_STATUSES.includes(current) ? m.cannotCancelPublished : null;
  if (SENT_STATUSES.includes(current)) return m.alreadyPublished;
  if (next === "approved") {
    if (current === "cancelled") return m.cancelledPost;
    return ["draft", "scheduled", "awaiting_approval"].includes(current) ? null : m.cannotApprove;
  }
  return null;
}

type PublishOutcome = { platform: string; status: string; url?: string; error?: string; note?: string };

/**
 * Runs the publish pipeline and normalises its result. The pipeline may answer with
 * `{ status, results }` or with an error shape (`{ ok: false, error }`); both end up here.
 */
async function runPublish(id: string, m: Msgs): Promise<{ ok: true; status: string; results: PublishOutcome[] } | { ok: false; error: string }> {
  try {
    const r: unknown = await publishPost(id);
    const o = (r && typeof r === "object" ? r : {}) as { status?: unknown; results?: unknown; error?: unknown };
    const status = typeof o.status === "string" ? o.status : "failed";
    const results = Array.isArray(o.results) ? (o.results as PublishOutcome[]) : [];
    // Nothing was attempted. The callers already checked that a platform is enabled, so an empty "published" means every
    // enabled variant had gone out earlier; anything else is reported as an error, never as a publish.
    // publishPost already answers with a localised sentence (no platform enabled, post busy, not publishable),
    // so it is used as-is; m.noPlatform is only the fallback for an unexpected empty result.
    if (results.length === 0 && status !== "published") return { ok: false, error: typeof o.error === "string" && o.error ? o.error : m.noPlatform };
    return { ok: true, status, results };
  } catch (e) {
    console.error("[smm] publish failed", e);
    return { ok: false, error: m.publishFailed };
  }
}

function projectExists(id: string) {
  return !!getDb().select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, id)).get();
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------
const CreateSchema = z.object({
  projectId: z.string().nullable().optional(),
  assetIds: z.array(z.string()).max(MAX_MEDIA),
  platforms: z.array(PlatformEnum).min(1),
  language: LangEnum,
  goal: GoalEnum,
  scheduledAt: z.string().nullable().optional(),
  extraInstructions: z.string().max(2000).optional(),
});

/** Creates the post pack and redirects to the editor; returns `{ ok: false, error }` when the input is not usable. */
export async function createPostAction(input: z.infer<typeof CreateSchema>) {
  const user = await requireUser();
  const m = await M();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: validationMessage(parsed.error, m) };
  const data = parsed.data;
  const when = scheduleProblem(data.scheduledAt, m);
  if (when) return { ok: false as const, error: when };
  if (data.projectId && !projectExists(data.projectId)) return { ok: false as const, error: m.projectNotFound };
  let r: Awaited<ReturnType<typeof createPostPack>>;
  try {
    r = await createPostPack({ ...data, assetIds: [...new Set(data.assetIds)], projectId: data.projectId || null, scheduledAt: data.scheduledAt || null, createdBy: user.id });
  } catch (e) {
    console.error("[smm] createPostPack failed", e);
    return { ok: false as const, error: m.generateFailed };
  }
  refresh(r.postId);
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
  const m = await M();
  const parsed = PosterSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: validationMessage(parsed.error, m) };
  const data = parsed.data;
  const db = getDb();
  const src = db.select().from(schema.assets).where(eq(schema.assets.id, data.sourceAssetId)).get();
  if (!src || !src.mime.startsWith("image/")) return { ok: false as const, error: m.sourceImage };
  // A poster already carries the brand mark and a headline: using it as a source doubles both.
  if (src.kind === "poster") return { ok: false as const, error: m.posterFromPoster };
  if (data.projectId && !projectExists(data.projectId)) return { ok: false as const, error: m.projectNotFound };
  const full = data.postId ? getPostFull(data.postId) : null;
  if (data.postId && !full) return { ok: false as const, error: m.notFound };
  if (full && full.assets.length >= MAX_MEDIA) return { ok: false as const, error: m.tooManyMedia };
  try {
    const brand = getSetting("brand");
    const row = await generatePoster({ sourceRelPath: src.relPath, ratio: data.ratio, headline: data.headline?.trim() || undefined, brand: brand.name, sub: brand.website.replace(/^https?:\/\/(www\.)?/, ""), projectId: data.projectId ?? src.projectId ?? null });
    const asset = db.select().from(schema.assets).where(eq(schema.assets.id, row.id)).get();
    if (!asset) return { ok: false as const, error: m.posterFailed };
    if (data.postId && full) {
      setPostAssets(data.postId, [...full.assets.map((a) => a.id), asset.id]);
      refresh(data.postId);
    }
    return { ok: true as const, asset: toAssetLite(asset) };
  } catch (e) {
    console.error("[smm] generatePoster failed", e);
    return { ok: false as const, error: m.posterFailed };
  }
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
  // null = auto (chosen from platform + format, see defaultCanvasMode in lib/social/canvas.ts)
  canvasMode: CanvasModeEnum.nullable().optional(),
  canvasMatte: CanvasMatteEnum.optional(),
});
const SaveSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
  goal: GoalEnum.optional(),
  language: LangEnum.optional(),
  variants: z.array(VariantSchema),
  assetIds: z.array(z.string()).max(MAX_MEDIA),
  audioMode: AudioModeEnum.optional(),
  audioAssetId: z.string().nullable().optional(),
  audioAmbientFile: z.string().max(300).nullable().optional(),
});

export async function savePostAction(input: z.infer<typeof SaveSchema>) {
  await requireUser();
  const m = await M();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    // Name the platform of the offending variant when the post can still be looked up.
    const raw = input as { id?: unknown; variants?: { id?: unknown }[] } | null;
    const known = typeof raw?.id === "string" ? getPostFull(raw.id) : null;
    const label = (i: number) => {
      const vid = Array.isArray(raw?.variants) ? raw.variants[i]?.id : undefined;
      const v = known?.variants.find((x) => x.id === vid);
      return v ? platformLabel(v.platform) : null;
    };
    return { ok: false as const, error: validationMessage(parsed.error, m, label) };
  }
  const data = parsed.data;
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: m.notFound };

  let audioPatch: { audioMode: "none" | "auto" | "custom"; audioAssetId: string | null; audioAmbientFile: string | null } | null = null;
  if (data.audioMode) {
    if (data.audioMode === "custom") {
      const a = data.audioAssetId ? getDb().select({ id: schema.assets.id }).from(schema.assets).where(and(eq(schema.assets.id, data.audioAssetId), eq(schema.assets.kind, "audio"))).get() : null;
      if (!a) return { ok: false as const, error: m.invalidInput };
      audioPatch = { audioMode: "custom", audioAssetId: a.id, audioAmbientFile: null };
    } else if (data.audioMode === "auto") {
      const track = data.audioAmbientFile ? listAmbientTracks().find((t) => t.file === data.audioAmbientFile) : null;
      if (!track) return { ok: false as const, error: m.invalidInput };
      audioPatch = { audioMode: "auto", audioAssetId: null, audioAmbientFile: track.file };
    } else {
      audioPatch = { audioMode: "none", audioAssetId: null, audioAmbientFile: null };
    }
  }

  updatePost(data.id, { title: data.title, notes: data.notes ?? null, ...(data.goal ? { goal: data.goal } : {}), ...(data.language ? { language: data.language } : {}), ...(audioPatch ?? {}) });
  for (const v of data.variants) {
    updateVariant(data.id, v.id, {
      enabled: v.enabled,
      title: v.title,
      text: v.text,
      hashtags: v.hashtags,
      cta: v.cta,
      format: v.format,
      canvasMode: v.canvasMode ?? null,
      ...(v.canvasMatte ? { canvasMatte: v.canvasMatte } : {}),
    });
  }
  setPostAssets(data.id, [...new Set(data.assetIds)]);
  refresh(data.id);
  return { ok: true as const };
}

export async function schedulePostAction(input: { id: string; scheduledAt: string | null }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string(), scheduledAt: z.string().nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const data = parsed.data;
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: m.notFound };
  const when = scheduleProblem(data.scheduledAt, m);
  if (when) return { ok: false as const, error: when };
  const status = full.post.status;
  if (status === "published") return { ok: false as const, error: m.alreadyPublished };
  if (status === "publishing") return { ok: false as const, error: m.publishingNow };
  const db = getDb();
  if (status === "draft" || status === "scheduled") {
    schedulePost(data.id, data.scheduledAt);
  } else if (status === "failed" || status === "cancelled" || (status === "partially_published" && data.scheduledAt)) {
    // A new time is a new attempt: back to "scheduled" (or "draft" when the time is cleared) with a fresh approval round.
    schedulePost(data.id, data.scheduledAt);
    db.update(schema.posts).set({ approvedAt: null, approvalSentAt: null }).where(eq(schema.posts.id, data.id)).run();
  } else {
    // awaiting_approval / approved keep their approval state; only the time moves.
    db.update(schema.posts).set({ scheduledAt: data.scheduledAt, updatedAt: nowIso() }).where(eq(schema.posts.id, data.id)).run();
  }
  refresh(data.id);
  return { ok: true as const, status: getPostFull(data.id)?.post.status ?? status };
}

export async function setPostStatusAction(input: { id: string; status: "approved" | "cancelled" | "draft" | "scheduled" }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string(), status: z.enum(["approved", "cancelled", "draft", "scheduled"]) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const data = parsed.data;
  const full = getPostFull(data.id);
  if (!full) return { ok: false as const, error: m.notFound };
  const blocked = statusProblem(full.post.status, data.status, m);
  if (blocked) return { ok: false as const, error: blocked };
  if (data.status === "scheduled" && !full.post.scheduledAt) return { ok: false as const, error: m.setScheduleFirst };
  if (data.status === "approved" && !full.variants.some((v) => v.enabled)) return { ok: false as const, error: m.noPlatform };
  setPostStatus(data.id, data.status, data.status === "approved" ? { approvedAt: nowIso() } : {});
  refresh(data.id);
  return { ok: true as const, status: data.status as string };
}

export async function sendApprovalAction(input: { id: string }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const { id } = parsed.data;
  const full = getPostFull(id);
  if (!full) return { ok: false as const, error: m.notFound };
  const blocked = approvalProblem(full, m);
  if (blocked) return { ok: false as const, error: blocked };
  let r: Awaited<ReturnType<typeof sendForApproval>>;
  try {
    r = await sendForApproval(id);
  } catch (e) {
    // sendForApproval throws when the post cannot be claimed (already sent, another send in flight);
    // its message names the actual state, which is more useful than the generic failure line.
    console.error("[smm] sendForApproval failed", e);
    const detail = e instanceof Error && e.message ? e.message : "";
    return { ok: false as const, error: detail || m.approvalFailed };
  }
  refresh(id);
  const configured = telegramEnabled() && !!getSetting("telegram").adminChatId;
  const dryRun = !!("dryRun" in r && r.dryRun);
  return { ok: true as const, dryRun, configured, status: getPostFull(id)?.post.status ?? "awaiting_approval", message: dryRun ? m.approvalDryMsg : m.approvalOkMsg };
}

export async function publishNowAction(input: { id: string }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const { id } = parsed.data;
  const full = getPostFull(id);
  if (!full) return { ok: false as const, error: m.notFound };
  const blocked = publishProblem(full, m);
  if (blocked) return { ok: false as const, error: blocked };
  const r = await runPublish(id, m);
  refresh(id);
  if (!r.ok) return { ok: false as const, error: r.error };
  // Fresh per-variant state so the editor can update its cards without a reload.
  const variants = (getPostFull(id)?.variants ?? []).map((v) => ({ id: v.id, status: v.status, externalUrl: v.externalUrl, error: v.error }));
  return { ok: true as const, status: r.status, results: r.results, variants };
}

export async function duplicatePostAction(input: { id: string }) {
  const user = await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const newId = duplicatePost(parsed.data.id, user.id);
  if (!newId) return { ok: false as const, error: m.notFound };
  refresh(newId);
  return { ok: true as const, id: newId };
}

export async function deletePostAction(input: { id: string }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  deletePost(parsed.data.id);
  refresh();
  notice("/admin/smm", m.deleted);
}

const RewriteSchema = z.object({ instruction: z.string().trim().min(1).max(500), text: z.string().min(1).max(70000), language: LangEnum });

export async function rewriteVariantAction(input: z.infer<typeof RewriteSchema>) {
  await requireUser();
  const m = await M();
  const parsed = RewriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.rewriteInput };
  const data = parsed.data;
  const status = aiStatus();
  if (status.provider === "template") return { ok: true as const, text: data.text, changed: false, provider: status.provider, note: m.noAiKey };
  try {
    const text = await rewriteText(data.instruction, data.text, data.language);
    return { ok: true as const, text: text || data.text, changed: !!text && text !== data.text, provider: status.provider };
  } catch (e) {
    console.error("[smm] rewrite failed", e);
    return { ok: false as const, error: m.rewriteFailed };
  }
}

// ---------------------------------------------------------------------------
// Local file inbox
// ---------------------------------------------------------------------------

/**
 * "Import now" / "Import all" from the Inbox panel. The import itself claims each folder with an
 * atomic rename, so pressing this while the worker's own 60-second scan runs is harmless.
 */
export async function importInboxForm(formData: FormData) {
  await requireUser();
  const m = await M();
  const folder = String(formData.get("folder") ?? "").trim();
  let run: Awaited<ReturnType<typeof runInbox>>;
  try {
    run = await runInbox(folder ? { only: folder } : {});
  } catch (e) {
    console.error("[inbox] import action failed", e);
    notice("/admin/smm", m.inboxFailedAction, "error");
  }
  refresh();
  const blockedNames = run.blocked.map((r) => `"${r.name}"`).join(", ");
  if (!run.imported.length) {
    // Nothing was imported — and "the files are still being copied" is only one of the reasons for
    // that. A folder held open by another program, a folder the 60-second worker tick imported a
    // second before this click, and an empty inbox each need their own answer: the copy message is
    // wrong for all three, and for the second it lands above a panel that says the inbox is empty.
    if (run.blocked.length) notice("/admin/smm", `${m.inboxBlocked} ${blockedNames}`, "error");
    if (folder && wasImported(folder)) notice("/admin/smm", m.inboxAlready);
    if (!run.seen) notice("/admin/smm", m.inboxEmpty);
    notice("/admin/smm", m.inboxNone, "error");
  }
  const ok = run.imported.filter((r) => r.ok);
  const bad = run.imported.filter((r) => !r.ok);
  const warnings = ok.reduce((n, r) => n + r.warnings.length, 0);
  const unreadable = ok.reduce((n, r) => n + (r.unreadable ?? 0), 0);
  const parts = [`${m.inboxImported} ${ok.length}`];
  if (warnings) parts.push(`${warnings} ${m.inboxWarningsWord}`);
  if (unreadable) parts.push(`${unreadable} ${m.inboxPartialWord}`);
  if (bad.length) parts.push(`${m.inboxFailedWord} ${bad.map((r) => `"${r.name}"`).join(", ")}`);
  // "Import all" can import one folder and be unable to touch another; both have to be said.
  if (run.blocked.length) parts.push(`${m.inboxBlocked} ${blockedNames}`);
  // One imported folder goes straight to its draft; a batch, or anything to report, stays on the hub.
  if (ok.length === 1 && !bad.length && !run.blocked.length) notice(`/admin/smm/${ok[0].postId}`, parts.join(" · "));
  notice("/admin/smm", parts.join(" · "), bad.length || run.blocked.length ? "error" : "ok");
}

/**
 * Applies the slot an inbox import proposed. A proposal that has meanwhile passed is replaced by a
 * fresh one, so the button never schedules a post into the past.
 */
export async function applySuggestedSlotAction(input: { id: string }) {
  await requireUser();
  const m = await M();
  const parsed = z.object({ id: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: m.invalidInput };
  const full = getPostFull(parsed.data.id);
  if (!full) return { ok: false as const, error: m.notFound };
  const stored = suggestedSlotOf(full.post.notes);
  if (!stored) return { ok: false as const, error: m.noSuggestedSlot };
  const slot = new Date(stored).getTime() > Date.now() ? stored : suggestSlot();
  if (!slot) return { ok: false as const, error: m.noSlotAvailable };
  const r = await schedulePostAction({ id: parsed.data.id, scheduledAt: slot });
  if (!r.ok) return r;
  return { ok: true as const, scheduledAt: slot, scheduledLocal: toYerevanInput(slot) };
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
  const name = `"${full.post.title}"`;
  if (op === "approval") {
    const blocked = approvalProblem(full, m);
    if (blocked) notice("/admin/smm", `${name}: ${blocked}`, "error");
    let r: Awaited<ReturnType<typeof sendForApproval>> | null = null;
    let detail = "";
    try {
      r = await sendForApproval(id);
    } catch (e) {
      // The thrown message names the state that blocked the send (already sent, send in flight).
      console.error("[smm] sendForApproval failed", e);
      detail = e instanceof Error && e.message ? e.message : "";
    }
    if (!r) notice("/admin/smm", `${name}: ${detail || m.approvalFailed}`, "error");
    refresh(id);
    notice("/admin/smm", `${name} ${"dryRun" in r && r.dryRun ? m.approvalDry : m.approvalSent}`);
  }
  if (op === "publish") {
    // Same guard as the editor: nothing enabled (or already out) must never end up as "published".
    const blocked = publishProblem(full, m);
    if (blocked) notice("/admin/smm", `${name}: ${blocked}`, "error");
    const r = await runPublish(id, m);
    refresh(id);
    if (!r.ok) notice("/admin/smm", `${name}: ${r.error}`, "error");
    const sim = r.results.filter((x) => x.status === "simulated").length;
    const failed = r.results.filter((x) => x.status === "failed").map((x) => platformLabel(x.platform));
    const statusLabel = m.postStatus[r.status] ?? r.status.replace(/_/g, " ");
    notice("/admin/smm", `${name}: ${statusLabel} — ${r.results.length} ${m.platformsWord}${sim ? `, ${sim} ${m.simulated}` : ""}${failed.length ? `, ${m.failedWord} ${failed.join(", ")}` : ""}.`, r.status === "published" ? "ok" : "error");
  }
  if (op === "approve") {
    const blocked = statusProblem(full.post.status, "approved", m) ?? (full.variants.some((v) => v.enabled) ? null : m.noPlatform);
    if (blocked) notice("/admin/smm", `${name}: ${blocked}`, "error");
    setPostStatus(id, "approved", { approvedAt: nowIso() });
    refresh(id);
    notice("/admin/smm", `${name} ${m.approved}`);
  }
  if (op === "cancel") {
    const blocked = statusProblem(full.post.status, "cancelled", m);
    if (blocked) notice("/admin/smm", `${name}: ${blocked}`, "error");
    setPostStatus(id, "cancelled");
    refresh(id);
    notice("/admin/smm", `${name} ${m.cancelled}`);
  }
  if (op === "delete") {
    deletePost(id);
    refresh();
    notice("/admin/smm", `${name} ${m.deletedOne}`);
  }
  notice("/admin/smm", m.unknownAction, "error");
}
