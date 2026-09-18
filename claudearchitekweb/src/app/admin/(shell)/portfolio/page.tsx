import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPortfolioItems } from "@/lib/portfolio-admin";
import { listProjectsLite } from "@/lib/smm-admin";
import { getAdminDict } from "@/lib/i18n/admin";
import { CompactList, CompactRow, PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { RelTime } from "@/components/admin/rel-time";
import { Notice } from "@/components/admin/notice";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form-buttons";
import { Badge, Select } from "@/components/ui";
import { portfolioListActionForm, publishProjectToPortfolioForm } from "@/app/admin/actions/portfolio-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function OpBtn({ id, op, children, title, disabled }: { id: string; op: string; children: React.ReactNode; title?: string; disabled?: boolean }) {
  return (
    <form action={portfolioListActionForm} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      {/* `undefined`, never `false`: SubmitButton spreads the rest props after its own pending state,
          so an explicit disabled={false} would re-enable the button while the action runs. */}
      <SubmitButton variant="ghost" className="btn-sm min-h-10" title={title} aria-label={title} pendingText="…" disabled={disabled || undefined}>
        {children}
      </SubmitButton>
    </form>
  );
}

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.portfolio;
  const sp = await searchParams;
  const items = listPortfolioItems();
  const projects = listProjectsLite();
  const published = items.filter((i) => i.isPublished).length;
  const featured = items.filter((i) => i.isFeatured).length;

  return (
    <>
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        actions={
          <>
            <Link href="/portfolio" target="_blank" className="btn-secondary btn-sm"><ExternalLink size={14} /> {L.viewPublic}</Link>
            <Link href="/admin/portfolio/new" className="btn-primary btn-sm"><Plus size={14} /> {L.newItem}</Link>
          </>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <SpecStrip cols={3}>
        <StatCard label={L.stats.items} value={items.length} />
        <StatCard label={L.stats.published} value={published} tone={published ? "success" : undefined} />
        <StatCard label={L.stats.featured} value={featured} tone={featured ? "brand" : undefined} />
      </SpecStrip>

      <form action={publishProjectToPortfolioForm} className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-2.5">
        <Select name="projectId" className="h-9 w-full text-[13.5px] sm:w-64" defaultValue="">
          <option value="">{L.fromProject}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
          ))}
        </Select>
        <SubmitButton variant="secondary" className="btn-sm" pendingText="…">{L.createFromProject}</SubmitButton>
      </form>

      <div className="mt-5">
        <Panel title={L.panel}>
          {items.length === 0 ? (
            <p className="text-sm text-muted">{L.empty}</p>
          ) : (
            <>
              {/* Phone: one row per item, tapping it opens the editor (cover, flags, order and delete
                  all live there). The audit measured this page at 7754px for six items as a stacked
                  key/value table. md and up keeps the real table below. */}
              <CompactList>
                {items.map((i) => (
                  <CompactRow
                    key={i.id}
                    href={`/admin/portfolio/${i.id}`}
                    title={i.titleObj.hy || i.titleObj.en || i.slug}
                    meta={
                      <>
                        {i.projectCode ? `${i.projectCode} · ` : ""}
                        {L.categories[i.category as keyof typeof L.categories] ?? i.category} · <RelTime iso={i.createdAt} locale={locale} />
                      </>
                    }
                    badge={<StatusBadge value={i.isPublished ? (i.isFeatured ? "vip" : "published") : "draft"} label={i.isPublished ? (i.isFeatured ? L.featuredFlag : L.publishedFlag) : L.hiddenFlag} />}
                  />
                ))}
              </CompactList>
              <div className="overflow-x-auto max-md:hidden">
                <table className="table-admin">
                <thead>
                  <tr>
                    <th>{L.table.n}</th>
                    <th>{L.table.cover}</th>
                    <th>{L.table.titles}</th>
                    <th>{L.table.category}</th>
                    <th>{L.table.project}</th>
                    <th>{L.table.flags}</th>
                    <th className="num">{L.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={i.id}>
                      <td data-label={L.table.n} className="font-mono text-[11px] text-faint tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                      <td data-label={L.table.cover}>
                        {i.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.coverUrl} alt="" loading="lazy" className="h-12 w-16 rounded-sm border border-line object-cover" />
                        ) : (
                          <span className="flex h-12 w-16 items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-[9.5px] tracking-[0.06em] text-faint uppercase">{L.noCover}</span>
                        )}
                      </td>
                      <td data-label={L.table.titles}>
                        {/* One wrapper: in the phone card layout the td itself is a flex row, so three
                            sibling blocks became three narrow columns with one word per line. */}
                        <div className="min-w-0">
                          <Link href={`/admin/portfolio/${i.id}`} className="font-semibold [overflow-wrap:anywhere] text-fg hover:text-accent">{i.titleObj.hy || i.titleObj.en || i.slug}</Link>
                          <div className="text-xs [overflow-wrap:anywhere] text-muted">{[i.titleObj.ru, i.titleObj.en].filter(Boolean).join(" · ")}</div>
                          <div className="font-mono text-[10.5px] [overflow-wrap:anywhere] text-faint">/{i.slug}</div>
                        </div>
                      </td>
                      <td data-label={L.table.category} className="text-xs">{L.categories[i.category as keyof typeof L.categories] ?? i.category}</td>
                      <td data-label={L.table.project} className="text-xs">
                        {i.projectId ? (
                          <Link href={`/admin/projects/${i.projectId}`} className="inline-flex min-h-10 items-center text-fg-2 hover:text-accent">
                            {i.projectCode}
                          </Link>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td data-label={L.table.flags}>
                        {/* Same square badges as every other module's state column, still clickable to toggle. */}
                        <div className="flex flex-col items-end gap-1 md:items-start">
                          <OpBtn id={i.id} op="publish" title={L.togglePublish}>
                            <Badge tone={i.isPublished ? "success" : "neutral"}>{i.isPublished ? L.publishedFlag : L.hiddenFlag}</Badge>
                          </OpBtn>
                          <OpBtn id={i.id} op="feature" title={L.toggleFeature}>
                            <Badge tone={i.isFeatured ? "brand" : "neutral"}>{i.isFeatured ? L.featuredFlag : L.notFeatured}</Badge>
                          </OpBtn>
                        </div>
                      </td>
                      <td data-label="">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {/* The first item cannot move up and the last cannot move down: the action was a no-op reload. */}
                          <OpBtn id={i.id} op="up" title={L.moveUp} disabled={idx === 0}><ArrowUp size={14} /></OpBtn>
                          <OpBtn id={i.id} op="down" title={L.moveDown} disabled={idx === items.length - 1}><ArrowDown size={14} /></OpBtn>
                          <Link href={`/admin/portfolio/${i.id}`} className="btn-secondary btn-sm min-h-10">{t.common.edit}</Link>
                          <form action={portfolioListActionForm} className="inline">
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="op" value="delete" />
                            <ConfirmSubmit message={L.deleteConfirm}>{t.common.delete}</ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
