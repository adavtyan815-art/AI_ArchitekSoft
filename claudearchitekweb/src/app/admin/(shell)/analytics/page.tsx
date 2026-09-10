import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { summary } from "@/lib/analytics";
import { adminAnalytics } from "@/lib/analytics-admin";
import { PLATFORM_META } from "@/lib/social";
import { fmtYerevan } from "@/lib/tz";
import { cn, formatMoney } from "@/lib/utils";
import { getAdminDict, labelFor, type AdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { PostsChart, RevenueChart, ViewsByDayChart } from "@/components/admin/analytics/charts";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const RANGES = [7, 30, 90];

function Bars({ rows, empty }: { rows: { key: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-fg-2">{r.key}</span>
            <span className="ml-3 font-medium tabular-nums text-fg">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.analytics;
  const sp = await searchParams;
  const days = RANGES.includes(Number(first(sp.days))) ? Number(first(sp.days)) : 30;
  const site = summary(days);
  const a = adminAnalytics(days);

  const total = (x: string) => site.totals.find((r) => r.type === x)?.count ?? 0;
  const visitors = site.totals.find((x) => x.type === "page_view")?.visitors ?? 0;
  const views = total("page_view");
  const submits = total("form_submit");
  const conversion = views ? Math.round((submits / views) * 1000) / 10 : 0;
  const seg = (s: string) => site.segments.find((x) => x.segment === s)?.count ?? 0;
  const g = (group: keyof AdminDict, v: string | null | undefined) => labelFor(t, group, v);

  return (
    <>
      <PageHeader title={L.title} subtitle={L.subtitle} />

      <div className="card-inset mb-5 flex flex-wrap items-center gap-1.5 p-1.5">
        {RANGES.map((d) => (
          <Link key={d} href={`/admin/analytics?days=${d}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", days === d ? "bg-fg text-bg" : "text-fg-2 hover:bg-surface-3")}>
            {d} {L.days}
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={L.kpi.views} value={views} hint={`${days} ${L.days}`} />
        <StatCard label={L.kpi.visitors} value={visitors} hint={L.kpi.visitorsHint} tone="brand" />
        <StatCard label={L.kpi.cta} value={total("cta_click")} />
        <StatCard label={L.kpi.forms} value={`${total("form_start")} → ${submits}`} tone={submits ? "success" : undefined} />
        <StatCard label={L.kpi.conversion} value={`${conversion}%`} hint={L.kpi.conversionHint} tone={conversion >= 1 ? "success" : undefined} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title={L.panels.traffic}>
          <ViewsByDayChart data={site.byDay} labels={{ views: L.chart.views, visitors: L.chart.visitors, submits: L.chart.submits, empty: L.noTraffic }} />
        </Panel>
        <Panel title={L.panels.segments}>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-inset p-3">
              <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t.common.b2b}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">{seg("b2b")}</div>
            </div>
            <div className="card-inset p-3">
              <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t.common.b2c}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-accent">{seg("b2c")}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.panels.languages}</div>
            <Bars rows={site.locales.map((l) => ({ key: l.locale ?? t.common.unknown, value: l.count }))} empty={L.noData} />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title={L.panels.topPages}>
          {site.topPages.length === 0 ? (
            <p className="text-sm text-muted">{L.noViews}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-admin table-responsive">
                <thead>
                  <tr>
                    <th>{L.table.path}</th>
                    <th className="text-right">{L.table.views}</th>
                  </tr>
                </thead>
                <tbody>
                  {site.topPages.map((p) => (
                    <tr key={p.path ?? "?"}>
                      <td data-label={L.table.path} className="max-w-[320px] truncate text-fg-2">{p.path ?? "—"}</td>
                      <td data-label={L.table.views} className="text-right font-medium tabular-nums">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={L.panels.sources}>
          <Bars rows={site.sources.map((s) => ({ key: (s.source ?? "direct").replace(/^https?:\/\//, "").slice(0, 40), value: s.count }))} empty={L.noData} />
        </Panel>
      </div>

      <SectionHead>{L.sections.crm}</SectionHead>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`${L.crm.leads} (${days}${L.days})`} value={a.crm.leadsTotal} />
        <StatCard label={L.crm.wonLost} value={`${a.crm.leadsWon} / ${a.crm.leadsLost}`} tone={a.crm.leadsWon ? "success" : undefined} />
        <StatCard label={L.crm.conversion} value={`${a.crm.conversion}%`} hint={`${L.crm.allTime} ${a.crm.allTime.conversion}% / ${a.crm.allTime.total}`} />
        <StatCard label={L.crm.quotedPaid} value={formatMoney(a.crm.revenueTotals.paid)} hint={`${L.crm.quoted} ${formatMoney(a.crm.revenueTotals.quoted)}`} tone="brand" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title={L.panels.leadsByStatus}>
          <Bars rows={a.crm.leadsByStatus.map((r) => ({ key: g("leadStatus", r.status), value: r.c }))} empty={L.noData} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {a.crm.leadsBySegment.map((r) => (
              <div key={r.segment} className="card-inset px-3 py-2">
                <StatusBadge value={r.segment} label={g("segments", r.segment)} />
                <div className="mt-1 text-lg font-semibold tabular-nums text-fg">{r.c}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={L.panels.leadSources}>
          <Bars rows={a.crm.leadSources.map((r) => ({ key: g("leadSources", r.source ?? undefined) , value: r.c }))} empty={L.noData} />
        </Panel>
        <Panel title={L.panels.projects}>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.panels.byType}</div>
          <Bars rows={a.crm.projectsByType.map((r) => ({ key: g("rooms", r.type), value: r.c }))} empty={L.noData} />
          <div className="mt-4 mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.panels.byStage}</div>
          <Bars rows={a.crm.projectsByStage.map((r) => ({ key: g("projectStage", r.stage), value: r.c }))} empty={L.noData} />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={L.panels.revenue}>
          <RevenueChart data={a.crm.revenueByMonth} labels={{ quoted: L.chart.quoted, paid: L.chart.paid, empty: L.noRevenue }} />
        </Panel>
      </div>

      <SectionHead>{L.sections.clientPages}</SectionHead>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={L.pages.links} value={a.clientPages.links} />
        <StatCard label={`${L.pages.views} (${days}${L.days})`} value={a.clientPages.views} />
        <StatCard label={L.pages.openLive} value={a.clientPages.openLive} tone={a.clientPages.openLive ? "brand" : undefined} />
        <StatCard label={L.pages.openAr} value={a.clientPages.openAr} />
        <StatCard label={L.pages.approvals} value={`${a.clientPages.approvals} / ${a.clientPages.changeRequests}`} />
      </section>
      <div className="mt-3">
        <Panel title={L.panels.topLinks}>
          {a.clientPages.topLinks.length === 0 ? (
            <p className="text-sm text-muted">{L.pages.none}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-admin table-responsive">
                <thead>
                  <tr>
                    <th>{L.pages.page}</th>
                    <th>{L.pages.project}</th>
                    <th className="text-right">{L.table.views}</th>
                    <th>{L.pages.lastView}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.clientPages.topLinks.map((l) => (
                    <tr key={l.id}>
                      <td data-label={L.pages.page}>
                        <Link href="/admin/pages" className="font-medium text-fg hover:text-accent">{l.title ?? l.slug}</Link>
                      </td>
                      <td data-label={L.pages.project} className="text-xs text-fg-2">{l.projectCode} · {l.projectTitle}</td>
                      <td data-label={L.table.views} className="text-right font-medium tabular-nums">{l.views}</td>
                      <td data-label={L.pages.lastView} className="text-xs whitespace-nowrap text-muted">{fmtYerevan(l.lastViewedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <SectionHead>{L.sections.smm}</SectionHead>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={L.panels.perPlatform}>
          {a.smm.postsPerPlatform.length === 0 ? (
            <p className="text-sm text-muted">{L.noVariants}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.smm.postsPerPlatform.map((r) => (
                <li key={r.platform} className="flex flex-wrap items-center gap-2">
                  <PlatformChip platform={r.platform} meta={PLATFORM_META[r.platform]} />
                  <span className="ml-auto text-fg"><b className="tabular-nums">{r.published}</b> {L.publishedShort}</span>
                  <span className="text-muted">· {r.simulated} {L.simulatedShort}</span>
                  {r.failed ? <span className="text-danger">· {r.failed} {L.failedShort}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.panels.postsByStatus}</div>
            <Bars rows={a.smm.postsByStatus.map((r) => ({ key: g("postStatus", r.status), value: r.c }))} empty={L.noData} />
          </div>
        </Panel>
        <Panel title={L.panels.postsPerMonth}>
          <PostsChart data={a.smm.postsPerMonth} labels={{ created: L.chart.created, published: L.chart.published, empty: L.noPosts }} />
        </Panel>
      </div>
    </>
  );
}
