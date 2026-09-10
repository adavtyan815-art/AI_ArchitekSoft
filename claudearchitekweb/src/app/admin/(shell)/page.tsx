import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/crm";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatMoney } from "@/lib/utils";
import { PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
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

      <SpecStrip>
        <StatCard label={O.newLeads} value={s.leadsNew} hint={O.leadsHint(s.leads30, s.leadsB2b30)} tone={s.leadsNew ? "brand" : undefined} />
        <StatCard label={O.activeProjects} value={s.projectsActive} hint={O.doneHint(s.projectsDone)} />
        <StatCard label={O.pipeline} value={formatMoney(s.pipelineValue)} hint={O.paidHint(formatMoney(s.paidValue))} />
        <StatCard label={O.postsAwaiting} value={s.postsAwaiting} hint={O.postsHint(s.postsScheduled, s.postsPublished30)} tone={s.postsAwaiting ? "warning" : undefined} />
        <StatCard label={O.companies} value={s.companies} hint={O.contactsHint(s.contacts)} />
        <StatCard label={O.individuals} value={s.individuals} />
        <StatCard label={O.clientPages} value={s.links} hint={O.viewsHint(s.linkViews30)} />
        <StatCard label={O.feedbackTasks} value={`${s.feedbackOpen} / ${s.tasksOpen}`} tone={s.feedbackOpen ? "warning" : undefined} />
      </SpecStrip>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title={O.leads30} className="lg:col-span-2">
          <OverviewCharts
            leadsByDay={s.leadsByDay}
            sourceRows={sourceRows}
            typeRows={typeRows}
            labels={{ empty: O.noLeads30, sources: O.sources, projectTypes: O.projectTypes, b2b: t.common.b2b, b2c: t.common.b2c }}
          />
        </Panel>
        <Panel title={O.byStage} bodyClassName="px-4 py-0 sm:px-5">
          {s.stageRows.length === 0 ? <div className="py-4 text-sm text-muted">{O.noActiveProjects}</div> : null}
          <ul className="divide-y divide-line">
            {s.stageRows.map((r) => (
              <li key={r.stage} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <StatusBadge value={r.stage} label={labelFor(t, "projectStage", r.stage)} />
                <span className="num text-[13.5px] text-fg">{r.c}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title={O.recentLeads}
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/leads" className="font-mono text-[10.5px] tracking-[0.1em] text-accent uppercase hover:underline">
              {O.allLeads}
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {s.recentLeads.map((l) => (
              <li key={l.id} className="py-3">
                <Link href={`/admin/leads/${l.id}`} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-fg">
                      {l.name}
                      {l.companyName ? ` · ${l.companyName}` : ""}
                    </span>
                    <span className="caption mt-0.5 block truncate">
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
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/projects" className="font-mono text-[10.5px] tracking-[0.1em] text-accent uppercase hover:underline">
              {O.toProjects}
            </Link>
          }
        >
          {s.recentFeedback.length === 0 ? <div className="py-4 text-sm text-muted">{O.noFeedback}</div> : null}
          <ul className="divide-y divide-line">
            {s.recentFeedback.map((f) => (
              <li key={f.id} className="py-3">
                <Link href={`/admin/projects/${f.projectId}`} className="block">
                  <span className="flex items-center gap-2">
                    <StatusBadge value={f.type === "approve" ? "approved" : f.type === "change_request" ? "awaiting_approval" : "pending"} label={labelFor(t, "feedbackType", f.type)} />
                    <span className="caption">{relTime(f.createdAt, locale)}</span>
                  </span>
                  {f.message ? <span className="mt-1.5 block line-clamp-2 text-[13.5px] text-fg-2">{f.message}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={O.upcoming}
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/smm" className="font-mono text-[10.5px] tracking-[0.1em] text-accent uppercase hover:underline">
              {O.toSmm}
            </Link>
          }
        >
          {s.upcomingPosts.length === 0 ? (
            <div className="py-4 text-sm text-muted">
              {O.nothingScheduled}{" "}
              <Link href="/admin/smm/new" className="text-accent u-link">
                {O.createPost}
              </Link>
            </div>
          ) : null}
          <ul className="divide-y divide-line">
            {s.upcomingPosts.map((p) => (
              <li key={p.id} className="py-3">
                <Link href={`/admin/smm/${p.id}`} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-fg">{p.title}</span>
                    <span className="caption mt-0.5 block">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleString(locale === "hy" ? "hy-AM" : "en-GB") : O.notScheduled}</span>
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
