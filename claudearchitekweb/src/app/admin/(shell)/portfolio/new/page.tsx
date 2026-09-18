import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES } from "@/lib/portfolio-admin";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader } from "@/components/admin/shell";
import { PortfolioForm } from "@/components/admin/portfolio/portfolio-form";

export const dynamic = "force-dynamic";

export default async function NewPortfolioItemPage() {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.portfolio;
  const projects = listProjectsLite();
  // The project is picked on the client, so offer the newest media overall plus the newest of every project.
  const assets = listMediaAssetsLite(300, { perProject: 60 });

  return (
    <>
      <PageHeader crumbs={[{ label: L.title, href: "/admin/portfolio" }, { label: L.newItem }]} title={L.newTitle} subtitle={L.newSubtitle} />
      <PortfolioForm
        item={{ slug: "", category: "kitchen", title: { hy: "", ru: "", en: "" }, summary: { hy: "", ru: "", en: "" }, projectId: null, coverAssetId: null, assetIds: [], videoAssetId: null, liveUrl: null, isPublished: true, isFeatured: false }}
        projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl }))}
        categories={PORTFOLIO_CATEGORIES}
        labels={L.form}
        categoryLabels={L.categories}
      />
    </>
  );
}
