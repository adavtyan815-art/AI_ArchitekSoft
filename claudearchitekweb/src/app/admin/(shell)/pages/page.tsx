import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { shareUrl } from "@/lib/crm";
import { env } from "@/lib/env";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { formatDate } from "@/lib/utils";
import { PageHeader, SpecStrip, StatCard } from "@/components/admin/shell";
import { Badge, Empty } from "@/components/ui";
import { CopyButton } from "@/components/admin/copy-button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { toggleShareLinkAction } from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

export default async function ClientPagesPage() {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const G = t.pages;
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

  const views30 =
    db
      .select({ c: sql<number>`count(*)` })
      .from(schema.shareEvents)
      .where(sql`${schema.shareEvents.type} = 'view' and ${schema.shareEvents.createdAt} >= ${new Date(Date.now() - 30 * 86400_000).toISOString()}`)
      .get()?.c ?? 0;

  const sentViaNames: Record<string, string> = local(
    {
      hy: { copy: "պատճենում", telegram: "Telegram", whatsapp: "WhatsApp", email: "էլ. փոստ" },
      en: { copy: "copy", telegram: "Telegram", whatsapp: "WhatsApp", email: "email" },
    },
    locale
  );

  const active = rows.filter((r) => r.link.isActive).length;
  const totalViews = rows.reduce((s, r) => s + r.link.viewsCount, 0);

  return (
    <>
      <PageHeader title={G.title} subtitle={G.subtitle} />

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={G.links} value={rows.length} hint={G.activeHint(active)} />
        <StatCard label={G.totalViews} value={totalViews} />
        <StatCard label={G.views30} value={views30} tone={views30 ? "brand" : undefined} />
      </SpecStrip>

      {rows.length === 0 ? (
        <Empty
          title={G.emptyTitle}
          text={G.emptyText}
          action={
            <Link href="/admin/projects" className="btn-primary btn-sm">
              {G.emptyAction}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent max-md:shadow-none">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{G.colProject}</th>
                <th>{G.colUrl}</th>
                <th className="max-md:hidden!">{t.common.language}</th>
                <th className="num">{G.colViews}</th>
                <th>{G.colLastViewed}</th>
                <th className="max-md:hidden!">{G.colExpires}</th>
                <th className="max-md:hidden!">{G.colSent}</th>
                <th>{G.colState}</th>
                <th className="num">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ link: l, projectId, code, title }) => {
                const url = shareUrl(l, env.appUrl);
                const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                return (
                  <tr key={l.id}>
                    <td data-label={G.colProject} className="whitespace-nowrap">
                      {projectId ? (
                        <Link href={`/admin/projects/${projectId}?tab=client`} className="font-semibold text-fg transition-colors hover:text-accent">
                          {title}
                        </Link>
                      ) : (
                        <span className="text-muted">{G.deletedProject}</span>
                      )}
                      <div className="font-mono text-xs text-muted">{code ?? ""}</div>
                    </td>
                    <td data-label={G.colUrl}>
                      <div className="font-mono text-xs text-fg">/p/{l.slug}</div>
                      <div className="max-w-[22rem] truncate font-mono text-[11px] text-faint" title={url}>
                        {url}
                      </div>
                    </td>
                    <td data-label={t.common.language} className="font-mono text-[11px] tracking-[0.08em] uppercase max-md:hidden!">
                      {l.language}
                    </td>
                    <td data-label={G.colViews} className="num">
                      {l.viewsCount}
                    </td>
                    <td data-label={G.colLastViewed} className="font-mono text-[12px] whitespace-nowrap text-muted">
                      {l.lastViewedAt ? relTime(l.lastViewedAt, locale) : "—"}
                    </td>
                    <td data-label={G.colExpires} className="font-mono text-[12px] whitespace-nowrap max-md:hidden!">
                      {l.expiresAt ? formatDate(l.expiresAt) : "—"}
                    </td>
                    <td data-label={G.colSent} className="font-mono text-[11px] whitespace-nowrap text-muted max-md:hidden!">
                      {l.sentAt ? `${sentViaNames[l.sentVia ?? ""] ?? l.sentVia} · ${relTime(l.sentAt, locale)}` : "—"}
                    </td>
                    <td data-label={G.colState}>
                      <Badge tone={expired ? "warning" : l.isActive ? "success" : "neutral"}>{expired ? G.expired : l.isActive ? G.activeState : G.off}</Badge>
                      {l.passcode ? <div className="mt-0.5 text-[11px] text-muted">{G.codeHint(l.passcode)}</div> : null}
                    </td>
                    <td data-label="">
                      <div className="flex items-center justify-end gap-1">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" title={t.common.open} aria-label={t.common.open}>
                          <ExternalLink size={14} />
                        </a>
                        <CopyButton text={url} label={t.projects.copyLink} copiedLabel={t.common.copied} iconOnly className="btn-ghost btn-sm" />
                        <form action={toggleShareLinkAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <ConfirmButton message={l.isActive ? G.deactivateConfirm : G.activateConfirm} className="btn-ghost btn-sm">
                            {l.isActive ? G.offBtn : G.on}
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
