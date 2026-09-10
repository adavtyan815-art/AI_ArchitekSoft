import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/crm";
import { formatMoney, relativeTime } from "@/lib/utils";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { OverviewCharts } from "@/components/admin/overview-charts";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const s = dashboardStats();
  return (
    <>
      <PageHeader title={`Good day, ${user.name}`} subtitle="What needs attention today, and how the business is moving." actions={<Link href="/admin/smm/new" className="btn-primary btn-sm">New post</Link>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads" value={s.leadsNew} hint={`${s.leads30} in 30 days · ${s.leadsB2b30} B2B`} tone={s.leadsNew ? "brand" : undefined} />
        <StatCard label="Active projects" value={s.projectsActive} hint={`${s.projectsDone} completed`} />
        <StatCard label="Pipeline value" value={formatMoney(s.pipelineValue)} hint={`Paid: ${formatMoney(s.paidValue)}`} />
        <StatCard label="Posts awaiting approval" value={s.postsAwaiting} hint={`${s.postsScheduled} scheduled · ${s.postsPublished30} published (30d)`} tone={s.postsAwaiting ? "warning" : undefined} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={s.companies} hint={`${s.contacts} contacts`} />
        <StatCard label="Individual clients" value={s.individuals} />
        <StatCard label="Client pages" value={s.links} hint={`${s.linkViews30} views (30d)`} />
        <StatCard label="Open feedback / tasks" value={`${s.feedbackOpen} / ${s.tasksOpen}`} tone={s.feedbackOpen ? "warning" : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Leads — last 30 days" className="lg:col-span-2">
          <OverviewCharts leadsByDay={s.leadsByDay} stageRows={s.stageRows} sourceRows={s.sourceRows} typeRows={s.typeRows} />
        </Panel>
        <Panel title="Pipeline by stage">
          <ul className="space-y-2">
            {s.stageRows.length === 0 ? <li className="text-sm text-ink-500">No active projects.</li> : null}
            {s.stageRows.map((r) => (
              <li key={r.stage} className="flex items-center justify-between text-sm">
                <StatusBadge value={r.stage} />
                <span className="font-medium text-ink-900">{r.c}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent leads" actions={<Link href="/admin/leads" className="text-xs font-semibold text-brand-600">All leads →</Link>}>
          <ul className="divide-y divide-line">
            {s.recentLeads.map((l) => (
              <li key={l.id} className="py-2.5">
                <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-900">{l.name}{l.companyName ? ` · ${l.companyName}` : ""}</span>
                    <span className="block text-xs text-ink-500">{l.service ?? "—"} · {l.source} · {relativeTime(l.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <StatusBadge value={l.segment} />
                    <StatusBadge value={l.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Client feedback" actions={<Link href="/admin/projects" className="text-xs font-semibold text-brand-600">Projects →</Link>}>
          {s.recentFeedback.length === 0 ? <div className="text-sm text-ink-500">No unresolved feedback.</div> : null}
          <ul className="divide-y divide-line">
            {s.recentFeedback.map((f) => (
              <li key={f.id} className="py-2.5">
                <Link href={`/admin/projects/${f.projectId}`} className="block">
                  <span className="flex items-center gap-2 text-sm">
                    <StatusBadge value={f.type === "approve" ? "approved" : f.type === "change_request" ? "awaiting_approval" : "pending"} />
                    <span className="text-xs text-ink-500">{relativeTime(f.createdAt)}</span>
                  </span>
                  {f.message ? <span className="mt-1 block line-clamp-2 text-sm text-ink-700">{f.message}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Upcoming posts" actions={<Link href="/admin/smm" className="text-xs font-semibold text-brand-600">SMM →</Link>}>
          {s.upcomingPosts.length === 0 ? <div className="text-sm text-ink-500">Nothing scheduled. <Link href="/admin/smm/new" className="text-brand-600">Create a post</Link>.</div> : null}
          <ul className="divide-y divide-line">
            {s.upcomingPosts.map((p) => (
              <li key={p.id} className="py-2.5">
                <Link href={`/admin/smm/${p.id}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-900">{p.title}</span>
                    <span className="block text-xs text-ink-500">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleString("en-GB") : "not scheduled"}</span>
                  </span>
                  <StatusBadge value={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
