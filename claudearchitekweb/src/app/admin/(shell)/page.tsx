import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/crm";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatMoney } from "@/lib/utils";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { OverviewCharts } from "@/components/admin/overview-charts";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const { t, locale } = await getAdminDict();
  const O = t.overview;
  const s = dashboardStats();

  const sourceRows = s.sourceRows.map((r) => ({ label: r.source ? labelFor(t, "leadSources", r.source) : t.common.unknown, c: r.c }));
  const typeRows = s.typeRows.map((r) => ({ label: labelFor(t, "rooms", r.type), c: r.c }));

  return (
    <>
      <PageHeader
        title={O.hello(user.name)}
        subtitle={O.subtitle}
        actions={
          <Link href="/admin/smm/new" className="btn-primary btn-sm">
            <Plus size={14} /> {O.newPost}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={O.newLeads} value={s.leadsNew} hint={O.leadsHint(s.leads30, s.leadsB2b30)} tone={s.leadsNew ? "brand" : undefined} />
        <StatCard label={O.activeProjects} value={s.projectsActive} hint={O.doneHint(s.projectsDone)} />
        <StatCard label={O.pipeline} value={formatMoney(s.pipelineValue)} hint={O.paidHint(formatMoney(s.paidValue))} />
        <StatCard label={O.postsAwaiting} value={s.postsAwaiting} hint={O.postsHint(s.postsScheduled, s.postsPublished30)} tone={s.postsAwaiting ? "warning" : undefined} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={O.companies} value={s.companies} hint={O.contactsHint(s.contacts)} />
        <StatCard label={O.individuals} value={s.individuals} />
        <StatCard label={O.clientPages} value={s.links} hint={O.viewsHint(s.linkViews30)} />
        <StatCard label={O.feedbackTasks} value={`${s.feedbackOpen} / ${s.tasksOpen}`} tone={s.feedbackOpen ? "warning" : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title={O.leads30} className="lg:col-span-2">
          <OverviewCharts
            leadsByDay={s.leadsByDay}
            sourceRows={sourceRows}
            typeRows={typeRows}
            labels={{ empty: O.noLeads30, sources: O.sources, projectTypes: O.projectTypes, b2b: t.common.b2b, b2c: t.common.b2c }}
          />
        </Panel>
        <Panel title={O.byStage}>
          <ul className="space-y-2">
            {s.stageRows.length === 0 ? <li className="text-sm text-muted">{O.noActiveProjects}</li> : null}
            {s.stageRows.map((r) => (
              <li key={r.stage} className="flex items-center justify-between gap-3 text-sm">
                <StatusBadge value={r.stage} label={labelFor(t, "projectStage", r.stage)} />
                <span className="font-medium tabular-nums text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title={O.recentLeads}
          actions={
            <Link href="/admin/leads" className="text-xs font-semibold text-accent">
              {O.allLeads}
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {s.recentLeads.map((l) => (
              <li key={l.id} className="py-2.5">
                <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {l.name}
                      {l.companyName ? ` · ${l.companyName}` : ""}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {l.service ? labelFor(t, "services", l.service) : "—"} · {labelFor(t, "leadSources", l.source)} · {relTime(l.createdAt, locale)}
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-1">
                    <StatusBadge value={l.segment} label={labelFor(t, "segments", l.segment)} />
                    <StatusBadge value={l.status} label={labelFor(t, "leadStatus", l.status)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={O.feedback}
          actions={
            <Link href="/admin/projects" className="text-xs font-semibold text-accent">
              {O.toProjects}
            </Link>
          }
        >
          {s.recentFeedback.length === 0 ? <div className="text-sm text-muted">{O.noFeedback}</div> : null}
          <ul className="divide-y divide-line">
            {s.recentFeedback.map((f) => (
              <li key={f.id} className="py-2.5">
                <Link href={`/admin/projects/${f.projectId}`} className="block">
                  <span className="flex items-center gap-2 text-sm">
                    <StatusBadge value={f.type === "approve" ? "approved" : f.type === "change_request" ? "awaiting_approval" : "pending"} label={labelFor(t, "feedbackType", f.type)} />
                    <span className="text-xs text-muted">{relTime(f.createdAt, locale)}</span>
                  </span>
                  {f.message ? <span className="mt-1 block line-clamp-2 text-sm text-fg-2">{f.message}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={O.upcoming}
          actions={
            <Link href="/admin/smm" className="text-xs font-semibold text-accent">
              {O.toSmm}
            </Link>
          }
        >
          {s.upcomingPosts.length === 0 ? (
            <div className="text-sm text-muted">
              {O.nothingScheduled}{" "}
              <Link href="/admin/smm/new" className="text-accent">
                {O.createPost}
              </Link>
            </div>
          ) : null}
          <ul className="divide-y divide-line">
            {s.upcomingPosts.map((p) => (
              <li key={p.id} className="py-2.5">
                <Link href={`/admin/smm/${p.id}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{p.title}</span>
                    <span className="block text-xs text-muted">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleString(locale === "hy" ? "hy-AM" : "en-GB") : O.notScheduled}</span>
                  </span>
                  <StatusBadge value={p.status} label={labelFor(t, "postStatus", p.status)} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
