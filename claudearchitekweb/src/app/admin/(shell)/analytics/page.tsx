import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { summary } from "@/lib/analytics";
import { adminAnalytics } from "@/lib/analytics-admin";
import { first, fmtAdminDate, formatMoneyTotals } from "@/lib/admin-helpers";
import { PLATFORM_META } from "@/lib/social";
import { cn } from "@/lib/utils";
import { getAdminDict, labelFor, local, type AdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { PostsChart, RevenueChart, ViewsByDayChart } from "@/components/admin/analytics/charts";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const RANGES = [7, 30, 90];

function Bars({ rows, empty }: { rows: { key: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line border-t border-line">
      {rows.map((r) => (
        <li key={r.key} className="py-2">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="min-w-0 truncate text-fg-2">{r.key}</span>
            <span className="num ml-3 flex-none text-fg">{r.value}</span>
          </div>
          <div className="mt-1.5 h-1 bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-4 border-t border-line pt-4 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{children}</h2>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.analytics;
  // Page-local strings (hy + en) for figures this page did not show before.
  const X = local(
    {
      hy: {
        range: "Ժամանակահատված",
        openViewer: "Web Viewer-ի բացումներ",
        downloads: "Ներբեռնումներ",
        questions: "Հարցեր",
        revenue: "Առաջարկված և վճարված՝ ըստ նախագծի մեկնարկի ամսի (վերջին 6)",
        otherCurrencies: (list: string) => `Գծապատկերում ներառված չեն՝ ${list}`,
        noLinksInRange: "Այս ժամանակահատվածում հաճախորդի էջերի դիտում չկա։",
      },
      en: {
        range: "Range",
        openViewer: "Web Viewer opens",
        downloads: "Downloads",
        questions: "Questions",
        revenue: "Quoted and paid by project start month (last 6)",
        otherCurrencies: (list: string) => `Not in the chart: ${list}`,
        noLinksInRange: "No client page views in this range.",
      },
    },
    locale
  );
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

  const inRange = `(${days} ${L.days})`;
  const allTime = `· ${L.crm.allTime}`;
  // one figure per currency — amounts in different currencies are never added together
  const paidTotals = formatMoneyTotals(a.crm.revenueTotals.map((r) => ({ currency: r.currency, amount: r.paid })));
  const quotedTotals = formatMoneyTotals(a.crm.revenueTotals.map((r) => ({ currency: r.currency, amount: r.quoted })));
  const moneyMark = a.crm.revenueCurrency === "AMD" ? "֏" : a.crm.revenueCurrency;

  return (
    <>
      <PageHeader title={L.title} subtitle={L.subtitle} />

      <nav aria-label={X.range} className="mb-5 flex flex-wrap items-center gap-2 border-y border-line py-1">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={`/admin/analytics?days=${d}`}
            aria-current={days === d ? "page" : undefined}
            className={cn("inline-flex min-h-10 min-w-12 items-center justify-center border-b-2 px-2 font-mono text-[12px] tracking-[0.02em] whitespace-nowrap transition-colors", days === d ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {d} {L.days}
          </Link>
        ))}
      </nav>

      <SpecStrip cols={5}>
        <StatCard label={L.kpi.views} value={views} hint={`${days} ${L.days}`} />
        <StatCard label={L.kpi.visitors} value={visitors} hint={L.kpi.visitorsHint} tone="brand" />
        <StatCard label={L.kpi.cta} value={total("cta_click")} />
        <StatCard label={L.kpi.forms} value={`${total("form_start")} → ${submits}`} tone={submits ? "success" : undefined} />
        {/* SpecStrip makes the odd last figure span two columns, so a 2- or 3-column strip has no empty grey cell */}
        <StatCard label={L.kpi.conversion} value={`${conversion}%`} hint={L.kpi.conversionHint} tone={conversion >= 1 ? "success" : undefined} />
      </SpecStrip>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title={L.panels.traffic} className="min-w-0">
          <ViewsByDayChart data={site.byDay} labels={{ views: L.chart.views, visitors: L.chart.visitors, submits: L.chart.submits, empty: L.noTraffic }} />
        </Panel>
        <Panel title={L.panels.segments} className="min-w-0">
          <div className="grid grid-cols-2 gap-px border-y border-line bg-line">
            <div className="bg-surface px-3 py-3">
              <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{t.common.b2b}</div>
              <div className="mt-1.5 font-display text-[1.6rem] leading-none font-medium tabular-nums text-fg">{seg("b2b")}</div>
            </div>
            <div className="bg-surface px-3 py-3">
              <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{t.common.b2c}</div>
              <div className="mt-1.5 font-display text-[1.6rem] leading-none font-medium tabular-nums text-accent">{seg("b2c")}</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.panels.languages}</div>
            <Bars rows={site.locales.map((l) => ({ key: l.locale ?? t.common.unknown, value: l.count }))} empty={L.noData} />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={L.panels.topPages} className="min-w-0">
          {site.topPages.length === 0 ? (
            <p className="text-sm text-muted">{L.noViews}</p>
          ) : (
            // Two plain columns on every screen: the stacked-card phone table cost about 130px per row.
            <table className="table-admin">
              <thead>
                <tr>
                  <th>{L.table.path}</th>
                  <th className="num">{L.table.views}</th>
                </tr>
              </thead>
              <tbody>
                {site.topPages.map((p) => (
                  <tr key={p.path ?? "?"}>
                    <td className="w-full max-w-0 truncate text-fg-2" title={p.path ?? undefined}>
                      {p.path ?? "—"}
                    </td>
                    <td className="num">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title={L.panels.sources} className="min-w-0">
          <Bars rows={site.sources.map((s) => ({ key: (s.source ?? "direct").replace(/^https?:\/\//, "").slice(0, 40), value: s.count }))} empty={L.noData} />
        </Panel>
      </div>

      <SectionHead>{L.sections.crm}</SectionHead>
      <SpecStrip>
        <StatCard label={`${L.crm.leads} ${inRange}`} value={a.crm.leadsTotal} />
        <StatCard label={L.crm.wonLost} value={`${a.crm.leadsWon} / ${a.crm.leadsLost}`} tone={a.crm.leadsWon ? "success" : undefined} />
        <StatCard label={L.crm.conversion} value={`${a.crm.conversion}%`} hint={`${L.crm.allTime} ${a.crm.allTime.conversion}% / ${a.crm.allTime.total}`} />
        {/* the value is what was paid, so the label says so; the quoted sum is the hint; both are all-time */}
        <StatCard label={`${L.chart.paid} ${allTime}`} value={<span className="block text-[1.15rem] leading-tight break-words sm:text-[1.3rem]">{paidTotals}</span>} hint={`${L.crm.quoted} ${quotedTotals}`} tone="brand" />
      </SpecStrip>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title={L.panels.leadsByStatus} className="min-w-0">
          <Bars rows={a.crm.leadsByStatus.map((r) => ({ key: g("leadStatus", r.status), value: r.c }))} empty={L.noData} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {a.crm.leadsBySegment.map((r) => (
              <div key={r.segment} className="border-t border-line-strong pt-2">
                <StatusBadge value={r.segment} label={g("segments", r.segment)} />
                <div className="num mt-1.5 text-[1.1rem] text-fg">{r.c}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={L.panels.leadSources} className="min-w-0">
          <Bars rows={a.crm.leadSources.map((r) => ({ key: g("leadSources", r.source ?? undefined), value: r.c }))} empty={L.noData} />
        </Panel>
        <Panel title={`${L.panels.projects} ${allTime}`} className="min-w-0">
          <div className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.panels.byType}</div>
          <Bars rows={a.crm.projectsByType.map((r) => ({ key: g("rooms", r.type), value: r.c }))} empty={L.noData} />
          <div className="mt-5 mb-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.panels.byStage}</div>
          <Bars rows={a.crm.projectsByStage.map((r) => ({ key: g("projectStage", r.stage), value: r.c }))} empty={L.noData} />
        </Panel>
      </div>

      <div className="mt-5">
        {/* no payment dates are stored, so the title says what the months really are */}
        <Panel title={`${X.revenue} · ${moneyMark}`}>
          <RevenueChart data={a.crm.revenueByMonth} labels={{ quoted: L.chart.quoted, paid: L.chart.paid, empty: L.noRevenue }} />
          {a.crm.otherCurrencies.length ? <p className="caption mt-2">{X.otherCurrencies(a.crm.otherCurrencies.join(", "))}</p> : null}
        </Panel>
      </div>

      <SectionHead>{L.sections.clientPages}</SectionHead>
      {/* 8 figures fill whole rows at 2 and at 4 columns; all but the link count follow the selected range */}
      <SpecStrip>
        <StatCard label={`${L.pages.links} ${allTime}`} value={a.clientPages.links} />
        <StatCard label={`${L.pages.views} ${inRange}`} value={a.clientPages.views} />
        <StatCard label={X.openViewer} value={a.clientPages.openViewer} tone={a.clientPages.openViewer ? "brand" : undefined} />
        <StatCard label={L.pages.openLive} value={a.clientPages.openLive} />
        <StatCard label={L.pages.openAr} value={a.clientPages.openAr} />
        <StatCard label={X.downloads} value={a.clientPages.downloads} />
        <StatCard label={X.questions} value={a.clientPages.questions} tone={a.clientPages.questions ? "warning" : undefined} />
        <StatCard label={L.pages.approvals} value={`${a.clientPages.approvals} / ${a.clientPages.changeRequests}`} />
      </SpecStrip>
      <div className="mt-3">
        <Panel title={`${L.panels.topLinks} ${inRange}`}>
          {a.clientPages.topLinks.length === 0 ? (
            <p className="text-sm text-muted">{a.clientPages.links === 0 ? L.pages.none : X.noLinksInRange}</p>
          ) : (
            // On a phone the project and the last view move under the title, so a row stays two columns wide.
            <table className="table-admin">
              <thead>
                <tr>
                  <th>{L.pages.page}</th>
                  <th className="max-md:hidden!">{L.pages.project}</th>
                  <th className="num">{L.table.views}</th>
                  <th className="max-md:hidden!">{L.pages.lastView}</th>
                </tr>
              </thead>
              <tbody>
                {a.clientPages.topLinks.map((l) => (
                  <tr key={l.id}>
                    <td className="w-full max-w-0 md:w-auto md:max-w-[22rem]">
                      <Link href={`/admin/projects/${l.projectId}?tab=client`} className="flex min-h-10 min-w-0 items-center font-semibold text-fg hover:text-accent">
                        <span className="min-w-0 truncate">{l.title ?? l.slug}</span>
                      </Link>
                      <div className="caption truncate md:hidden">
                        {l.projectCode} · {l.projectTitle}
                      </div>
                      <div className="caption truncate md:hidden">
                        {L.pages.lastView}: {fmtAdminDate(l.lastViewedAt, locale, true)}
                      </div>
                    </td>
                    <td className="max-w-[22rem] truncate text-xs text-fg-2 max-md:hidden!">
                      {l.projectCode} · {l.projectTitle}
                    </td>
                    <td className="num">{l.views}</td>
                    <td className="font-mono text-[12px] whitespace-nowrap text-muted max-md:hidden!">{fmtAdminDate(l.lastViewedAt, locale, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <SectionHead>{L.sections.smm}</SectionHead>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={`${L.panels.perPlatform} ${allTime}`} className="min-w-0">
          {a.smm.postsPerPlatform.length === 0 ? (
            <p className="text-sm text-muted">{L.noVariants}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.smm.postsPerPlatform.map((r) => (
                <li key={r.platform} className="flex flex-wrap items-center gap-2">
                  <PlatformChip platform={r.platform} meta={PLATFORM_META[r.platform]} />
                  <span className="ml-auto text-fg">
                    <b className="tabular-nums">{r.published}</b> {L.publishedShort}
                  </span>
                  <span className="text-muted">
                    · {r.simulated} {L.simulatedShort}
                  </span>
                  {r.failed ? (
                    <span className="text-danger">
                      · {r.failed} {L.failedShort}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <div className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              {L.panels.postsByStatus} {allTime}
            </div>
            <Bars rows={a.smm.postsByStatus.map((r) => ({ key: g("postStatus", r.status), value: r.c }))} empty={L.noData} />
          </div>
        </Panel>
        <Panel title={L.panels.postsPerMonth} className="min-w-0">
          <PostsChart data={a.smm.postsPerMonth} labels={{ created: L.chart.created, published: L.chart.published, empty: L.noPosts }} />
        </Panel>
      </div>
    </>
  );
}
