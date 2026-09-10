import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES } from "@/lib/portfolio-admin";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { PageHeader } from "@/components/admin/shell";
import { PortfolioForm } from "@/components/admin/portfolio/portfolio-form";

export const dynamic = "force-dynamic";

export default async function NewPortfolioItemPage() {
  await requireUser();
  const projects = listProjectsLite();
  const assets = listMediaAssetsLite(300);

  return (
    <>
      <PageHeader crumbs={[{ label: "Portfolio", href: "/admin/portfolio" }, { label: "New item" }]} title="New portfolio item" subtitle="Shown on the public site under /portfolio in all three languages." />
      <PortfolioForm
        item={{ slug: "", category: "kitchen", title: { hy: "", ru: "", en: "" }, summary: { hy: "", ru: "", en: "" }, projectId: null, coverAssetId: null, assetIds: [], videoAssetId: null, liveUrl: null, isPublished: true, isFeatured: false }}
        projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl }))}
        categories={PORTFOLIO_CATEGORIES}
      />
    </>
  );
}
