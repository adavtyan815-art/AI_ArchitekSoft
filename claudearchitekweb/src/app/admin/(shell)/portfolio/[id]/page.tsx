import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, EyeOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PORTFOLIO_CATEGORIES, getPortfolioItem } from "@/lib/portfolio-admin";
import { listMediaAssetsLite, listProjectsLite } from "@/lib/smm-admin";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { PageHeader } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PortfolioForm } from "@/components/admin/portfolio/portfolio-form";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function EditPortfolioItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.portfolio;
  const X = local(
    {
      hy: { notPublic: "Թաքցված է — չկա հանրային էջ", notPublicHint: "Հրապարակի՛ր, որ էջը բացվի կայքում։" },
      en: { notPublic: "Hidden — no public page", notPublicHint: "Publish the item to open it on the website." },
    },
    locale
  );
  const { id } = await params;
  const sp = await searchParams;
  const item = getPortfolioItem(id);
  if (!item) notFound();
  const projects = listProjectsLite();
  // The item's own cover, gallery and video are always offered, however old they are; every project
  // keeps its newest media pickable after the library has grown past the limit.
  const assets = listMediaAssetsLite(300, { perProject: 60, includeIds: [item.coverAssetId, item.videoAssetId, ...item.assetIdList] });
  const categoryLabel = L.categories[item.category as keyof typeof L.categories] ?? item.category;

  return (
    <>
      <PageHeader
        crumbs={[{ label: L.title, href: "/admin/portfolio" }, { label: item.titleObj.hy || item.slug }]}
        title={item.titleObj.hy || item.titleObj.en || item.slug}
        subtitle={`/${item.slug} · ${categoryLabel} · ${item.isPublished ? L.publishedFlag : L.hiddenFlag}`}
        actions={
          // An unpublished item has no public page: the link opened a 404 in a new tab with no hint.
          item.isPublished ? (
            <Link href={`/portfolio/${item.slug}`} target="_blank" className="btn-secondary btn-sm">
              <ExternalLink size={14} /> {L.publicPage}
            </Link>
          ) : (
            <span className="btn-secondary btn-sm cursor-not-allowed opacity-60" aria-disabled title={X.notPublicHint}>
              <EyeOff size={14} /> {X.notPublic}
            </span>
          )
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
