import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES, getPortfolioItem } from "@/lib/portfolio-admin";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { PageHeader } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PortfolioForm } from "@/components/admin/portfolio/portfolio-form";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function EditPortfolioItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const item = getPortfolioItem(id);
  if (!item) notFound();
  const projects = listProjectsLite();
  const assets = listMediaAssetsLite(300);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Portfolio", href: "/admin/portfolio" }, { label: item.titleObj.hy || item.slug }]}
        title={item.titleObj.hy || item.titleObj.en || item.slug}
        subtitle={`/${item.slug} · ${item.category.replace(/_/g, " ")} · ${item.isPublished ? "published" : "hidden"}`}
        actions={
          <Link href={`/portfolio/${item.slug}`} target="_blank" className="btn-secondary btn-sm">
            <ExternalLink size={14} /> Public page
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
      />
    </>
  );
}
