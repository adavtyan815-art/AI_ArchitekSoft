"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { bust } from "@/lib/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PORTFOLIO_CATEGORIES, deletePortfolioItem, movePortfolio, portfolioDraftFromProject, savePortfolioItem, togglePortfolio } from "@/lib/portfolio-admin";
import { slugify } from "@/lib/utils";
import { isHttpUrl, issueMessage, withNotice } from "@/lib/form";
import { adminDict, getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice wording for this action file (the admin dictionary is hy + en). */
async function M() {
  const locale = await getAdminLocale();
  const words = local(
    {
      hy: {
        needTitle: "Տուր անվանում գոնե մեկ լեզվով։",
        saved: "Աշխատանքը պահպանված է։",
        created: "Աշխատանքը ստեղծված է։",
        deleted: "Աշխատանքը ջնջված է։",
        missingId: "Աշխատանքի id-ն բացակայում է։",
        unknownAction: "Անհայտ գործողություն։",
        pickProject: "Սկզբում ընտրիր նախագիծ։",
        projectNotFound: "Նախագիծը չի գտնվել։",
        fromProject: "Աշխատանքը ստեղծված է նախագծից և դեռ թաքցված է։ Ստուգիր անվանումներն ու նկարագրությունը, հետո նշիր «Հրապարակված» և պահպանիր։",
        slugTaken: (s: string) => `«${s}» հասցեն զբաղված է։ Ընտրիր ուրիշը։`,
        urlChanged: (s: string) => `Ուշադրություն՝ հրապարակային հասցեն այժմ /portfolio/${s} է, հինը այլևս չի բացվի։`,
      },
      en: {
        needTitle: "Give the item a title in at least one language.",
        saved: "Portfolio item saved.",
        created: "Portfolio item created.",
        deleted: "Portfolio item deleted.",
        missingId: "Missing item id.",
        unknownAction: "Unknown action.",
        pickProject: "Pick a project first.",
        projectNotFound: "Project not found.",
        fromProject: "Portfolio item created from the project and still hidden. Review the titles and summary, then tick “Published” and save.",
        slugTaken: (s: string) => `The address “${s}” is already used by another item. Pick a different one.`,
        urlChanged: (s: string) => `Note: the public address is now /portfolio/${s}; the previous one no longer opens.`,
      },
    },
    locale,
  );
  return { ...words, locale, labels: adminDict(locale).portfolio.form };
}

function refresh() {
  bust("portfolio:");
  revalidatePath("/admin/portfolio");
  revalidatePath("/", "layout"); // public site lists portfolio items
}

function back(text: string, tone: "ok" | "error" = "ok"): never {
  refresh();
  redirect(withNotice("/admin/portfolio", text, tone));
}

const I18n = z.object({ hy: z.string().max(200), ru: z.string().max(200), en: z.string().max(200) });
const SaveSchema = z.object({
  id: z.string().optional(),
  slug: z.string().max(80),
  category: z.enum(PORTFOLIO_CATEGORIES),
  title: I18n,
  summary: z.object({ hy: z.string().max(1000), ru: z.string().max(1000), en: z.string().max(1000) }),
  projectId: z.string().nullable(),
  coverAssetId: z.string().nullable(),
  assetIds: z.array(z.string()).max(40),
  videoAssetId: z.string().nullable(),
  // the public page turns this into a button: http(s) only, so a javascript: or free-text value never gets rendered
  liveUrl: z
    .string()
    .max(300)
    .nullable()
    .refine((v) => !v || isHttpUrl(v), { message: "url" }),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
});

export async function savePortfolioAction(input: z.infer<typeof SaveSchema>) {
  await requireUser();
  const m = await M();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    const L = m.labels;
    const labels = { slug: L.slug, category: L.category, liveUrl: L.liveUrl, title: L.titleLang, summary: L.summaryLang, assetIds: L.gallery, coverAssetId: L.cover, videoAssetId: L.video };
    return { ok: false as const, error: issueMessage(parsed.error.issues[0], labels, m.locale) };
  }
  const { id, ...data } = parsed.data;
  if (!data.title.hy && !data.title.ru && !data.title.en) return { ok: false as const, error: m.needTitle };

  const db = getDb();
  const current = id ? db.select({ slug: schema.portfolioItems.slug, isPublished: schema.portfolioItems.isPublished }).from(schema.portfolioItems).where(eq(schema.portfolioItems.id, id)).get() : null;
  const wanted = slugify(data.slug);
  if (wanted) {
    // savePortfolioItem would silently append "-2"; the admin would keep a URL they never chose.
    const clash = db.select({ id: schema.portfolioItems.id }).from(schema.portfolioItems).where(eq(schema.portfolioItems.slug, wanted)).get();
    if (clash && clash.id !== id) return { ok: false as const, error: m.slugTaken(wanted) };
  }
  // Clearing the slug on an existing item used to regenerate it from the title and break the live URL.
  const slug = wanted || current?.slug || data.slug;

  const savedId = savePortfolioItem({ ...data, slug, liveUrl: data.liveUrl || null, projectId: data.projectId || null, coverAssetId: data.coverAssetId || null, videoAssetId: data.videoAssetId || null }, id);
  const saved = db.select({ slug: schema.portfolioItems.slug }).from(schema.portfolioItems).where(eq(schema.portfolioItems.id, savedId)).get();
  const urlChanged = !!current && !!saved && current.slug !== saved.slug && current.isPublished;
  refresh();
  revalidatePath(`/admin/portfolio/${savedId}`);
  const text = `${id ? m.saved : m.created}${urlChanged && saved ? ` ${m.urlChanged(saved.slug)}` : ""}`;
  redirect(withNotice("/admin/portfolio", text, "ok"));
}

export async function portfolioListActionForm(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const m = await M();
  if (!id) back(m.missingId, "error");
  if (op === "publish") togglePortfolio(id, "isPublished");
  else if (op === "feature") togglePortfolio(id, "isFeatured");
  else if (op === "up") movePortfolio(id, "up");
  else if (op === "down") movePortfolio(id, "down");
  else if (op === "delete") {
    deletePortfolioItem(id);
    back(m.deleted);
  } else back(m.unknownAction, "error");
  refresh();
  redirect("/admin/portfolio");
}

export async function publishProjectToPortfolioForm(formData: FormData) {
  await requireUser();
  const projectId = z.string().min(1).safeParse(String(formData.get("projectId") ?? ""));
  const m = await M();
  if (!projectId.success) back(m.pickProject, "error");
  const draft = portfolioDraftFromProject(projectId.data);
  if (!draft) back(m.projectNotFound, "error");
  // The draft is built from a project's own data (title, summary, gallery), so it can be longer than
  // the schema allows. portfolioDraftFromProject already trims to those limits; this is the belt to
  // that pair of braces — an over-long project title must produce a message, not a silent truncation.
  const checked = SaveSchema.safeParse({ ...draft, isPublished: false });
  if (!checked.success) {
    const L = m.labels;
    const labels = { slug: L.slug, category: L.category, liveUrl: L.liveUrl, title: L.titleLang, summary: L.summaryLang, assetIds: L.gallery, coverAssetId: L.cover, videoAssetId: L.video };
    back(issueMessage(checked.error.issues[0], labels, m.locale), "error");
  }
  // The notice asks the admin to review it first, so the item must not already be on the public site.
  const id = savePortfolioItem(checked.data);
  refresh();
  redirect(withNotice(`/admin/portfolio/${id}`, m.fromProject, "ok"));
}
