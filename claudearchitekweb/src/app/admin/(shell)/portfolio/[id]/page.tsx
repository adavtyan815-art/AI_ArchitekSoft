import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES, getPortfolioItem } from "@/lib/portfolio-admin";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PortfolioForm } from "@/components/admin/portfolio/portfolio-form";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function EditPortfolioItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.portfolio;
  const { id } = await params;
  const sp = await searchParams;
  const item = getPortfolioItem(id);
  if (!item) notFound();
  const projects = listProjectsLite();
  const assets = listMediaAssetsLite(300);
  const categoryLabel = L.categories[item.category as keyof typeof L.categories] ?? item.category;

  return (
    <>
      <PageHeader
        crumbs={[{ label: L.title, href: "/admin/portfolio" }, { label: item.titleObj.hy || item.slug }]}
        title={item.titleObj.hy || item.titleObj.en || item.slug}
        subtitle={`/${item.slug} · ${categoryLabel} · ${item.isPublished ? L.publishedFlag : L.hiddenFlag}`}
        actions={
          <Link href={`/portfolio/${item.slug}`} target="_blank" className="btn-secondary btn-sm">
            <ExternalLink size={14} /> {L.publicPage}
          </Link>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />
      <PortfolioForm
        item={{
          id: item.id,
          slug: item.slug,
          category: item.category,
          title: item.titleObj,
          summary: item.summaryObj,
          projectId: item.projectId,
          coverAssetId: item.coverAssetId,
          assetIds: item.assetIdList,
          videoAssetId: item.videoAssetId,
          liveUrl: item.liveUrl,
          isPublished: item.isPublished,
          isFeatured: item.isFeatured,
        }}
        projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, mime: a.mime, projectId: a.projectId, thumbUrl: a.thumbUrl }))}
        categories={PORTFOLIO_CATEGORIES}
        labels={L.form}
        categoryLabels={L.categories}
      />
    </>
  );
}
