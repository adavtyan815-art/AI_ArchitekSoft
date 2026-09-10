import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { shareUrl } from "@/lib/crm";
import { env } from "@/lib/env";
import { formatDate, relativeTime } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/admin/shell";
import { Badge, Empty } from "@/components/ui";
import { CopyButton } from "@/components/admin/copy-button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { toggleShareLinkAction } from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

export default async function ClientPagesPage() {
  await requireUser();
  const db = getDb();
  const rows = db
    .select({
      link: schema.shareLinks,
      projectId: schema.projects.id,
      code: schema.projects.code,
      title: schema.projects.title,
    })
    .from(schema.shareLinks)
    .leftJoin(schema.projects, eq(schema.shareLinks.projectId, schema.projects.id))
    .orderBy(desc(schema.shareLinks.createdAt))
    .limit(500)
    .all();

  const views30 = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.shareEvents)
    .where(sql`${schema.shareEvents.type} = 'view' and ${schema.shareEvents.createdAt} >= ${new Date(Date.now() - 30 * 86400_000).toISOString()}`)
    .get()?.c ?? 0;

  const active = rows.filter((r) => r.link.isActive).length;
  const totalViews = rows.reduce((s, r) => s + r.link.viewsCount, 0);

  return (
    <>
      <PageHeader title="Client pages" subtitle="Personal links you send to clients — one page per project, with Live 3D, renders and feedback." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Links" value={rows.length} hint={`${active} active`} />
        <StatCard label="Total views" value={totalViews} />
        <StatCard label="Views (30 d)" value={views30} tone={views30 ? "brand" : undefined} />
      </div>

      {rows.length === 0 ? (
        <Empty title="No client pages yet" text="Open a project and create a client page from its “Client page” tab." action={<Link href="/admin/projects" className="btn-primary btn-sm">Go to projects</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Project</th>
                <th>Slug / URL</th>
                <th>Lang</th>
                <th className="text-right">Views</th>
                <th>Last viewed</th>
                <th>Expires</th>
                <th>Sent</th>
                <th>State</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ link: l, projectId, code, title }) => {
                const url = shareUrl(l, env.appUrl);
                const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                return (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap">
                      {projectId ? (
                        <Link href={`/admin/projects/${projectId}?tab=client`} className="font-medium text-ink-900 hover:text-brand-600">
                          {title}
                        </Link>
                      ) : (
                        <span className="text-ink-500">— deleted project —</span>
                      )}
                      <div className="font-mono text-xs text-ink-500">{code ?? ""}</div>
                    </td>
                    <td>
                      <div className="font-mono text-xs text-ink-900">/p/{l.slug}</div>
                      <div className="max-w-[22rem] truncate font-mono text-[11px] text-ink-400" title={url}>
                        {url}
                      </div>
                    </td>
                    <td className="uppercase text-ink-600">{l.language}</td>
                    <td className="text-right tabular-nums">{l.viewsCount}</td>
                    <td className="whitespace-nowrap text-ink-500">{l.lastViewedAt ? relativeTime(l.lastViewedAt) : "—"}</td>
                    <td className="whitespace-nowrap text-ink-600">{l.expiresAt ? formatDate(l.expiresAt) : "—"}</td>
                    <td className="whitespace-nowrap text-xs text-ink-500">{l.sentAt ? `${l.sentVia} · ${relativeTime(l.sentAt)}` : "—"}</td>
                    <td>
                      <Badge tone={expired ? "warning" : l.isActive ? "success" : "neutral"}>{expired ? "expired" : l.isActive ? "active" : "off"}</Badge>
                      {l.passcode ? <div className="mt-0.5 text-[11px] text-ink-500">code {l.passcode}</div> : null}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" title="Open">
                          <ExternalLink size={14} />
                        </a>
                        <CopyButton text={url} label="Copy link" iconOnly className="btn-ghost btn-sm" />
                        <form action={toggleShareLinkAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <ConfirmButton message={l.isActive ? "Deactivate this client page?" : "Activate this client page?"} className="btn-ghost btn-sm">
                            {l.isActive ? "Off" : "On"}
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
