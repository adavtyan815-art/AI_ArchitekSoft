import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPortfolioItems } from "@/lib/portfolio-admin";
import { listProjectsLite } from "@/lib/smm-admin";
import { PageHeader, Panel, StatCard } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form-buttons";
import { Select } from "@/components/ui";
import { portfolioListActionForm, publishProjectToPortfolioForm } from "@/app/admin/actions/portfolio-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function OpBtn({ id, op, children, title }: { id: string; op: string; children: React.ReactNode; title?: string }) {
  return (
    <form action={portfolioListActionForm} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <SubmitButton variant="ghost" className="btn-sm" title={title} pendingText="…">{children}</SubmitButton>
    </form>
  );
}

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const items = listPortfolioItems();
  const projects = listProjectsLite();
  const published = items.filter((i) => i.isPublished).length;
  const featured = items.filter((i) => i.isFeatured).length;

  return (
    <>
      <PageHeader
        title="Portfolio"
        subtitle="What the public site shows under /portfolio. Order, visibility and the featured flag are controlled here."
        actions={
          <>
            <Link href="/portfolio" target="_blank" className="btn-secondary btn-sm"><ExternalLink size={14} /> View public page</Link>
            <Link href="/admin/portfolio/new" className="btn-primary btn-sm"><Plus size={14} /> New item</Link>
          </>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Items" value={items.length} />
        <StatCard label="Published" value={published} tone={published ? "success" : undefined} />
        <StatCard label="Featured" value={featured} tone={featured ? "brand" : undefined} />
      </div>

      <div className="mt-5">
        <Panel
          title="Items"
          actions={
            <form action={publishProjectToPortfolioForm} className="flex items-center gap-2">
              <Select name="projectId" className="w-56 py-1.5 text-xs" defaultValue="">
                <option value="">Publish a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
                ))}
              </Select>
              <SubmitButton variant="secondary" className="btn-sm" pendingText="…">Create from project</SubmitButton>
            </form>
          }
        >
          {items.length === 0 ? (
            <p className="text-sm text-ink-500">No portfolio items yet. Create one from a project, or add it manually.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-admin">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cover</th>
                    <th>Titles</th>
                    <th>Category</th>
                    <th>Project</th>
                    <th>Flags</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={i.id}>
                      <td className="text-xs text-ink-500">{idx + 1}</td>
                      <td>
                        {i.coverUrl ? <img src={i.coverUrl} alt="" className="h-12 w-16 rounded-md object-cover" /> : <span className="flex h-12 w-16 items-center justify-center rounded-md bg-ink-100 text-[10px] text-ink-400">no cover</span>}
                      </td>
                      <td>
                        <Link href={`/admin/portfolio/${i.id}`} className="font-medium text-ink-900 hover:text-brand-600">{i.titleObj.hy || i.titleObj.en || i.slug}</Link>
                        <div className="text-xs text-ink-500">{[i.titleObj.ru, i.titleObj.en].filter(Boolean).join(" · ")}</div>
                        <div className="text-[11px] text-ink-400">/{i.slug}</div>
                      </td>
                      <td className="text-xs capitalize">{i.category.replace(/_/g, " ")}</td>
                      <td className="text-xs">{i.projectId ? <Link href={`/admin/projects/${i.projectId}`} className="text-ink-700 hover:text-brand-600">{i.projectCode}</Link> : <span className="text-ink-400">—</span>}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <OpBtn id={i.id} op="publish" title="Toggle published">
                            <span className={i.isPublished ? "text-success-500" : "text-ink-400"}>{i.isPublished ? "published" : "hidden"}</span>
                          </OpBtn>
                          <OpBtn id={i.id} op="feature" title="Toggle featured">
                            <span className={i.isFeatured ? "text-brand-600" : "text-ink-400"}>{i.isFeatured ? "featured" : "not featured"}</span>
                          </OpBtn>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <OpBtn id={i.id} op="up" title="Move up"><ArrowUp size={14} /></OpBtn>
                          <OpBtn id={i.id} op="down" title="Move down"><ArrowDown size={14} /></OpBtn>
                          <Link href={`/admin/portfolio/${i.id}`} className="btn-secondary btn-sm">Edit</Link>
                          <form action={portfolioListActionForm} className="inline">
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="op" value="delete" />
                            <ConfirmSubmit message={`Delete "${i.titleObj.hy || i.slug}" from the portfolio?`}>Delete</ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
