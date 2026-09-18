import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { AlertTriangle, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/crm";
import { getDb, schema } from "@/lib/db";
import { fmtAdminDate, formatMoneyTotals } from "@/lib/admin-helpers";
import { RelTime } from "@/components/admin/rel-time";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { OverviewCharts } from "@/components/admin/overview-charts";

export const dynamic = "force-dynamic";

/** Small mono link in a panel header; 40px tall to tap, without making the header taller. */
const HEADER_LINK = "-my-2.5 inline-flex min-h-10 items-center font-mono text-[10.5px] tracking-[0.1em] text-accent uppercase hover:underline";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const { t, locale } = await getAdminDict();
  const O = t.overview;
  const s = dashboardStats();

  // Money per currency: a USD quote is never added to an AMD one.
  const money = getDb()
    .select({
      currency: schema.projects.currency,
      pipeline: sql<number>`coalesce(sum(case when ${schema.projects.status} = 'active' then ${schema.projects.quoteAmount} else 0 end), 0)`,
      paid: sql<number>`coalesce(sum(${schema.projects.paidAmount}), 0)`,
    })
    .from(schema.projects)
    .groupBy(schema.projects.currency)
    .all();
  const pipelineRows = money.filter((r) => r.pipeline).map((r) => ({ currency: r.currency, amount: r.pipeline }));
  const pipeline = formatMoneyTotals(pipelineRows);
  const paid = formatMoneyTotals(money.map((r) => ({ currency: r.currency, amount: r.paid })));

  const sourceRows = s.sourceRows.map((r) => ({ label: r.source ? labelFor(t, "leadSources", r.source) : t.common.unknown, c: r.c }));
  // Both breakdowns under the "leads — last 30 days" heading must be about leads: roomRows is what the
  // last 30 days of leads asked for. s.typeRows is the all-time PROJECT mix and belongs to another panel.
  const roomRows = s.roomRows.map((r) => ({ label: labelFor(t, "rooms", r.type), c: r.c }));

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

      {/* every figure opens the list it counts — the whole cell is the link, so the tap target is the card */}
      <SpecStrip>
        <StatCard href="/admin/leads?status=new" label={O.newLeads} value={s.leadsNew} hint={O.leadsHint(s.leads30, s.leadsB2b30)} tone={s.leadsNew ? "brand" : undefined} />
        <StatCard href="/admin/projects?status=active" label={O.activeProjects} value={s.projectsActive} hint={O.doneHint(s.projectsDone)} />
        <StatCard href="/admin/projects?status=active" label={O.pipeline} value={<span className={cn("block break-words", pipelineRows.length > 1 && "text-[1.15rem] leading-tight sm:text-[1.3rem]")}>{pipeline}</span>} hint={O.paidHint(paid)} />
        <StatCard href="/admin/smm" label={O.postsAwaiting} value={s.postsAwaiting} hint={O.postsHint(s.postsScheduled, s.postsPublished30)} tone={s.postsAwaiting ? "warning" : undefined} />
        <StatCard href="/admin/companies" label={O.companies} value={s.companies} hint={O.contactsHint(s.contacts)} />
        <StatCard href="/admin/clients" label={O.individuals} value={s.individuals} />
        <StatCard href="/admin/pages" label={O.clientPages} value={s.links} hint={O.viewsHint(s.linkViews30)} />
        <StatCard href="/admin/tasks" label={O.feedbackTasks} value={`${s.feedbackOpen} / ${s.tasksOpen}`} tone={s.feedbackOpen ? "warning" : undefined} />
      </SpecStrip>

      {/* grid-cols-1 (= minmax(0,1fr)) keeps a long unbroken name from widening the only column on a phone */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={O.leads30} className="min-w-0 lg:col-span-2">
          <OverviewCharts
            leadsByDay={s.leadsByDay}
            sourceRows={sourceRows}
            typeRows={roomRows}
            labels={{ empty: O.noLeads30, sources: O.sources, projectTypes: O.projectTypes, b2b: t.common.b2b, b2c: t.common.b2c }}
          />
        </Panel>
        <Panel title={O.byStage} className="min-w-0" bodyClassName="px-4 py-0 sm:px-5">
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

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title={O.recentLeads}
          className="min-w-0"
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/leads" className={HEADER_LINK}>
              {O.allLeads}
            </Link>
          }
        >
          {s.recentLeads.length === 0 ? (
            <div className="py-4 text-sm text-muted">
              {t.crm.leads.emptyText}{" "}
              <Link href="/admin/leads/new" className="text-accent u-link">
                {t.crm.leads.emptyAction}
              </Link>
            </div>
          ) : null}
          <ul className="divide-y divide-line">
            {s.recentLeads.map((l) => (
              <li key={l.id} className="py-3">
                <Link href={`/admin/leads/${l.id}`} className="flex min-h-10 flex-col gap-1.5">
                  <span className="block min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-fg">
                      {l.name}
                      {l.companyName ? ` · ${l.companyName}` : ""}
                    </span>
                    <span className="caption mt-0.5 block truncate">
                      {l.service ? labelFor(t, "services", l.service) : "—"} · {labelFor(t, "leadSources", l.source)} · <RelTime iso={l.createdAt} locale={locale} />
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1">
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
          className="min-w-0"
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/projects" className={HEADER_LINK}>
              {O.toProjects}
            </Link>
          }
        >
          {s.recentFeedback.length === 0 ? <div className="py-4 text-sm text-muted">{O.noFeedback}</div> : null}
          <ul className="divide-y divide-line">
            {s.recentFeedback.map((f) => (
              <li key={f.id} className="py-3">
                <Link href={`/admin/projects/${f.projectId}?tab=feedback`} className="flex min-h-10 flex-col justify-center">
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={f.type === "approve" ? "approved" : f.type === "change_request" ? "awaiting_approval" : "pending"} label={labelFor(t, "feedbackType", f.type)} />
                    <span className="caption"><RelTime iso={f.createdAt} locale={locale} /></span>
                  </span>
                  {f.message ? <span className="mt-1.5 block line-clamp-2 text-[13.5px] break-words text-fg-2">{f.message}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={O.upcoming}
          className="min-w-0"
          bodyClassName="px-4 py-0 sm:px-5"
          actions={
            <Link href="/admin/smm" className={HEADER_LINK}>
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
                <Link href={`/admin/smm/${p.id}`} className="flex min-h-10 items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-fg">{p.title}</span>
                    {/* same format as the rest of the admin: interface language, Yerevan time, no seconds.
                        A post whose slot has passed is flagged with an icon AND a word, never colour alone. */}
                    <span className={cn("caption mt-0.5 flex items-center gap-1", p.overdue && "text-danger")}>
                      {p.overdue ? (
                        <>
                          <AlertTriangle size={12} aria-hidden />
                          <span className="sr-only">{t.tasks.overdue}: </span>
                        </>
                      ) : null}
                      {p.scheduledAt ? fmtAdminDate(p.scheduledAt, locale, true) : O.notScheduled}
                    </span>
                  </span>
                  <StatusBadge value={p.status} label={labelFor(t, "postStatus", p.status)} className="flex-none" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
