"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES, deletePortfolioItem, movePortfolio, portfolioDraftFromProject, savePortfolioItem, togglePortfolio } from "@/lib/portfolio-admin";

function refresh() {
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
  if (!data.title.hy && !data.title.ru && !data.title.en) return { ok: false as const, error: "Give the item a title in at least one language" };
  const savedId = savePortfolioItem({ ...data, liveUrl: data.liveUrl || null, projectId: data.projectId || null, coverAssetId: data.coverAssetId || null, videoAssetId: data.videoAssetId || null }, id);
  refresh();
  revalidatePath(`/admin/portfolio/${savedId}`);
  redirect(`/admin/portfolio?notice=${encodeURIComponent(id ? "Portfolio item saved." : "Portfolio item created.")}&tone=ok`);
}

export async function portfolioListActionForm(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!id) back("Missing item id.", "error");
  if (op === "publish") togglePortfolio(id, "isPublished");
  else if (op === "feature") togglePortfolio(id, "isFeatured");
  else if (op === "up") movePortfolio(id, "up");
  else if (op === "down") movePortfolio(id, "down");
  else if (op === "delete") {
    deletePortfolioItem(id);
    back("Portfolio item deleted.");
  } else back("Unknown action.", "error");
  refresh();
  redirect("/admin/portfolio");
}

export async function publishProjectToPortfolioForm(formData: FormData) {
  await requireUser();
  const projectId = z.string().min(1).safeParse(String(formData.get("projectId") ?? ""));
  if (!projectId.success) back("Pick a project first.", "error");
  const draft = portfolioDraftFromProject(projectId.data);
  if (!draft) back("Project not found.", "error");
  const id = savePortfolioItem(draft);
  refresh();
  redirect(`/admin/portfolio/${id}?notice=${encodeURIComponent("Portfolio item created from the project. Review the titles and summary, then save.")}&tone=ok`);
}
