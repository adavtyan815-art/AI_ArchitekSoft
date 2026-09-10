import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { summary } from "@/lib/analytics";
import { adminAnalytics } from "@/lib/analytics-admin";
import { PLATFORM_META } from "@/lib/social";
import { fmtYerevan } from "@/lib/tz";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { PostsChart, RevenueChart, ViewsByDayChart } from "@/components/admin/analytics/charts";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const RANGES = [7, 30, 90];

function Bars({ rows, label }: { rows: { key: string; value: number }[]; label?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-ink-400">No data for this period.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate capitalize text-ink-700">{r.key.replace(/_/g, " ")}</span>
            <span className="ml-3 font-medium text-ink-900">{r.value}{label ?? ""}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const days = RANGES.includes(Number(first(sp.days))) ? Number(first(sp.days)) : 30;
  const site = summary(days);
  const a = adminAnalytics(days);

  const total = (t: string) => site.totals.find((x) => x.type === t)?.count ?? 0;
  const visitors = site.totals.find((x) => x.type === "page_view")?.visitors ?? 0;
  const views = total("page_view");
  const submits = total("form_submit");
  const conversion = views ? Math.round((submits / views) * 1000) / 10 : 0;
  const seg = (s: string) => site.segments.find((x) => x.segment === s)?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="First-party, cookie-free website tracking plus CRM, client pages and SMM output. Times are Asia/Yerevan."
        actions={
          <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
            {RANGES.map((d) => (
              <Link key={d} href={`/admin/analytics?days=${d}`} className={cn("rounded-md px-3 py-1 text-xs font-medium", days === d ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-100")}>
                {d} days
              </Link>
            ))}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Page views" value={views} hint={`${days} days`} />
        <StatCard label="Visitors" value={visitors} hint="daily-rotating hash" tone="brand" />
        <StatCard label="CTA clicks" value={total("cta_click")} />
        <StatCard label="Form starts → submits" value={`${total("form_start")} → ${submits}`} tone={submits ? "success" : undefined} />
        <StatCard label="Conversion" value={`${conversion}%`} hint="submits / page views" tone={conversion >= 1 ? "success" : undefined} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title="Traffic by day">
          <ViewsByDayChart data={site.byDay} />
        </Panel>
        <Panel title="Requests by segment">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">B2B</div>
              <div className="mt-1 text-2xl font-semibold text-ink-950">{seg("b2b")}</div>
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">B2C</div>
              <div className="mt-1 text-2xl font-semibold text-brand-600">{seg("b2c")}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Languages</div>
            <Bars rows={site.locales.map((l) => ({ key: l.locale ?? "unknown", value: l.count }))} />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Top pages">
          {site.topPages.length === 0 ? (
            <p className="text-sm text-ink-400">No page views yet.</p>
          ) : (
            <table className="table-admin">
              <thead><tr><th>Path</th><th className="text-right">Views</th></tr></thead>
              <tbody>
                {site.topPages.map((p) => (
                  <tr key={p.path ?? "?"}>
                    <td className="max-w-[320px] truncate text-ink-800">{p.path ?? "—"}</td>
                    <td className="text-right font-medium">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Sources">
          <Bars rows={site.sources.map((s) => ({ key: (s.source ?? "direct").replace(/^https?:\/\//, "").slice(0, 40), value: s.count }))} />
        </Panel>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">CRM</h2>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Leads (${days}d)`} value={a.crm.leadsTotal} />
        <StatCard label="Won / lost" value={`${a.crm.leadsWon} / ${a.crm.leadsLost}`} tone={a.crm.leadsWon ? "success" : undefined} />
        <StatCard label="Conversion (period)" value={`${a.crm.conversion}%`} hint={`all time ${a.crm.allTime.conversion}% of ${a.crm.allTime.total}`} />
        <StatCard label="Quoted / paid" value={formatMoney(a.crm.revenueTotals.paid)} hint={`quoted ${formatMoney(a.crm.revenueTotals.quoted)}`} tone="brand" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Leads by status">
          <Bars rows={a.crm.leadsByStatus.map((r) => ({ key: r.status, value: r.c }))} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {a.crm.leadsBySegment.map((r) => (
              <div key={r.segment} className="rounded-lg border border-line px-3 py-2">
                <StatusBadge value={r.segment} />
                <div className="mt-1 text-lg font-semibold text-ink-950">{r.c}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lead sources">
          <Bars rows={a.crm.leadSources.map((r) => ({ key: r.source ?? "unknown", value: r.c }))} />
        </Panel>
        <Panel title="Projects">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">By type</div>
          <Bars rows={a.crm.projectsByType.map((r) => ({ key: r.type, value: r.c }))} />
          <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Active by stage</div>
          <Bars rows={a.crm.projectsByStage.map((r) => ({ key: r.stage, value: r.c }))} />
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Revenue by month (last 6 months)">
          <RevenueChart data={a.crm.revenueByMonth} />
        </Panel>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Client pages</h2>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Links" value={a.clientPages.links} />
        <StatCard label={`Views (${days}d)`} value={a.clientPages.views} />
        <StatCard label="Open live 3D" value={a.clientPages.openLive} tone={a.clientPages.openLive ? "brand" : undefined} />
        <StatCard label="Open AR" value={a.clientPages.openAr} />
        <StatCard label="Approvals / changes" value={`${a.clientPages.approvals} / ${a.clientPages.changeRequests}`} />
      </section>
      <div className="mt-3">
        <Panel title="Top client links">
          {a.clientPages.topLinks.length === 0 ? (
            <p className="text-sm text-ink-400">No client pages created yet.</p>
          ) : (
            <table className="table-admin">
              <thead><tr><th>Page</th><th>Project</th><th className="text-right">Views</th><th>Last view</th></tr></thead>
              <tbody>
                {a.clientPages.topLinks.map((l) => (
                  <tr key={l.id}>
                    <td><Link href={`/admin/pages`} className="font-medium text-ink-900 hover:text-brand-600">{l.title ?? l.slug}</Link></td>
                    <td className="text-xs text-ink-600">{l.projectCode} · {l.projectTitle}</td>
                    <td className="text-right font-medium">{l.views}</td>
                    <td className="whitespace-nowrap text-xs text-ink-500">{fmtYerevan(l.lastViewedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">SMM</h2>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Published per platform">
          {a.smm.postsPerPlatform.length === 0 ? (
            <p className="text-sm text-ink-400">No variants yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.smm.postsPerPlatform.map((r) => (
                <li key={r.platform} className="flex items-center gap-2">
                  <PlatformChip platform={r.platform} meta={PLATFORM_META[r.platform]} />
                  <span className="ml-auto text-ink-900"><b>{r.published}</b> published</span>
                  <span className="text-ink-500">· {r.simulated} simulated</span>
                  {r.failed ? <span className="text-red-600">· {r.failed} failed</span> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Posts by status</div>
            <Bars rows={a.smm.postsByStatus.map((r) => ({ key: r.status, value: r.c }))} />
          </div>
        </Panel>
        <Panel title="Posts per month">
          <PostsChart data={a.smm.postsPerMonth} />
        </Panel>
      </div>
    </>
  );
}
