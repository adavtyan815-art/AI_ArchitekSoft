"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bust } from "@/lib/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES, deletePortfolioItem, movePortfolio, portfolioDraftFromProject, savePortfolioItem, togglePortfolio } from "@/lib/portfolio-admin";
import { getAdminLocale, local } from "@/lib/i18n/admin";

/** Notice wording for this action file. */
async function M() {
  const locale = await getAdminLocale();
  return local(
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
        fromProject: "Աշխատանքը ստեղծված է նախագծից։ Ստուգիր անվանումներն ու նկարագրությունը և պահպանիր։",
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
        fromProject: "Portfolio item created from the project. Review the titles and summary, then save.",
      },
    },
    locale,
  );
}

function refresh() {
  bust("portfolio:");
  revalidatePath("/admin/portfolio");
  revalidatePath("/", "layout"); // public site lists portfolio items
}

function back(text: string, tone: "ok" | "error" = "ok"): never {
  refresh();
  redirect(`/admin/portfolio?notice=${encodeURIComponent(text)}&tone=${tone}`);
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
  liveUrl: z.string().max(300).nullable(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
});

export async function savePortfolioAction(input: z.infer<typeof SaveSchema>) {
  await requireUser();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { id, ...data } = parsed.data;
  const m = await M();
  if (!data.title.hy && !data.title.ru && !data.title.en) return { ok: false as const, error: m.needTitle };
  const savedId = savePortfolioItem({ ...data, liveUrl: data.liveUrl || null, projectId: data.projectId || null, coverAssetId: data.coverAssetId || null, videoAssetId: data.videoAssetId || null }, id);
  refresh();
  revalidatePath(`/admin/portfolio/${savedId}`);
  redirect(`/admin/portfolio?notice=${encodeURIComponent(id ? m.saved : m.created)}&tone=ok`);
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
  const id = savePortfolioItem(draft);
  refresh();
  redirect(`/admin/portfolio/${id}?notice=${encodeURIComponent(m.fromProject)}&tone=ok`);
}
