import Link from "next/link";
import { and, desc, eq, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { shareUrl } from "@/lib/crm";
import { env } from "@/lib/env";
import { first, relTime } from "@/lib/admin-helpers";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { formatDate, nowIso } from "@/lib/utils";
import { CompactList, CompactRow, FilterBar, PageHeader, PillTabs, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { Badge, Empty, Input, Select } from "@/components/ui";
import { RelTime } from "@/components/admin/rel-time";
import { CopyButton } from "@/components/admin/copy-button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { toggleShareLinkAction } from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

/** Next gives a repeated parameter (?q=a&q=b) as an array, so every field has to allow one. */
type SPValue = string | string[] | undefined;
type SP = { state?: SPValue; project?: SPValue; q?: SPValue; notice?: SPValue; tone?: SPValue };

const STATES = ["all", "active", "off", "expired"] as const;
type State = (typeof STATES)[number];

/** `%` and `_` are LIKE wildcards; a slug search must match them literally. */
const likeEscape = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function ClientPagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const G = t.pages;
  const sp = await searchParams;
  const X = local(
    {
      hy: {
        state: "Վիճակ",
        anyState: "Ցանկացած վիճակ",
        stateActive: "Ակտիվ",
        stateOff: "Անջատված",
        stateExpired: "Ժամկետանց",
        anyProject: "Բոլոր նախագծերը",
        searchPlaceholder: "Հասցե, վերնագիր կամ նախագիծ…",
        emptyFound: "Այս զտիչով հղում չկա։",
        clearFilters: "Մաքրել զտիչները",
        open: "Բացել",
        copyLink: "Պատճենել հղումը",
        deactivate: "Անջատել",
        activate: "Միացնել",
        showingOf: (n: number, total: number) => `Ցուցադրված է ${n}-ը ${total}-ից`,
      },
      en: {
        state: "State",
        anyState: "Any state",
        stateActive: "Active",
        stateOff: "Off",
        stateExpired: "Expired",
        anyProject: "All projects",
        searchPlaceholder: "Link, title or project…",
        emptyFound: "No client page matches this filter.",
        clearFilters: "Clear filters",
        open: "Open",
        copyLink: "Copy link",
        deactivate: "Deactivate",
        activate: "Activate",
        showingOf: (n: number, total: number) => `Showing ${n} of ${total}`,
      },
    },
    locale
  );

  const state: State = (STATES as readonly string[]).includes(first(sp.state)) ? (first(sp.state) as State) : "all";
  const projectFilter = first(sp.project).trim().slice(0, 40) || "all";
  const q = first(sp.q).trim().slice(0, 80);
  const db = getDb();
  const now = nowIso();

  const expiredCond = and(isNotNull(schema.shareLinks.expiresAt), lt(schema.shareLinks.expiresAt, now))!;
  const conds: SQL[] = [];
  if (state === "active") conds.push(and(eq(schema.shareLinks.isActive, true), or(sql`${schema.shareLinks.expiresAt} is null`, sql`${schema.shareLinks.expiresAt} >= ${now}`))!);
  if (state === "off") conds.push(eq(schema.shareLinks.isActive, false));
  if (state === "expired") conds.push(expiredCond);
  if (projectFilter !== "all") conds.push(eq(schema.shareLinks.projectId, projectFilter));
  if (q) {
    const p = `%${likeEscape(q)}%`;
    conds.push(
      or(
        sql`${schema.shareLinks.slug} like ${p} escape '\\'`,
        sql`${schema.shareLinks.title} like ${p} escape '\\'`,
        sql`${schema.projects.code} like ${p} escape '\\'`,
        sql`${schema.projects.title} like ${p} escape '\\'`
      )!
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const rows = db
    .select({
      link: schema.shareLinks,
      projectId: schema.projects.id,
      code: schema.projects.code,
      title: schema.projects.title,
    })
    .from(schema.shareLinks)
    .leftJoin(schema.projects, eq(schema.shareLinks.projectId, schema.projects.id))
    .where(where)
    .orderBy(desc(schema.shareLinks.createdAt))
    .limit(500)
    .all();

  // Counted over every link, not only the 500 rendered rows.
  const totals = db
    .select({
      links: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${schema.shareLinks.isActive} = 1 and (${schema.shareLinks.expiresAt} is null or ${schema.shareLinks.expiresAt} >= ${now}) then 1 else 0 end)`,
      views: sql<number>`coalesce(sum(${schema.shareLinks.viewsCount}), 0)`,
    })
    .from(schema.shareLinks)
    .get();
  const matched = db.select({ c: sql<number>`count(*)` }).from(schema.shareLinks).leftJoin(schema.projects, eq(schema.shareLinks.projectId, schema.projects.id)).where(where).get()?.c ?? 0;

  const views30 =
    db
      .select({ c: sql<number>`count(*)` })
      .from(schema.shareEvents)
      .where(sql`${schema.shareEvents.type} = 'view' and ${schema.shareEvents.createdAt} >= ${new Date(Date.now() - 30 * 86400_000).toISOString()}`)
      .get()?.c ?? 0;

  const projects = db
    .select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title })
    .from(schema.projects)
    .where(sql`exists (select 1 from share_links sl where sl.project_id = ${schema.projects.id})`)
    .orderBy(desc(schema.projects.createdAt))
    .all();

  const sentViaNames: Record<string, string> = local(
    {
      hy: { copy: "պատճենում", telegram: "Telegram", whatsapp: "WhatsApp", email: "էլ. փոստ" },
      en: { copy: "copy", telegram: "Telegram", whatsapp: "WhatsApp", email: "email" },
    },
    locale
  );

  const href = (patch: Partial<Record<"state" | "project" | "q", string>>) => {
    const p = new URLSearchParams();
    const next: Record<string, string | undefined> = { state, project: projectFilter, q, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && v !== "all") p.set(k, v);
    const s = p.toString();
    return s ? `/admin/pages?${s}` : "/admin/pages";
  };

  const stateTabs = [
    { key: "all", label: t.common.all, href: href({ state: "all" }) },
    { key: "active", label: X.stateActive, href: href({ state: "active" }) },
    { key: "off", label: X.stateOff, href: href({ state: "off" }) },
    { key: "expired", label: X.stateExpired, href: href({ state: "expired" }) },
  ];
  const filtered = state !== "all" || projectFilter !== "all" || !!q;

  return (
    <>
      <PageHeader title={G.title} subtitle={G.subtitle} />
      <Notice text={sp.notice} tone={sp.tone} />

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={G.links} value={totals?.links ?? 0} hint={G.activeHint(totals?.active ?? 0)} />
        <StatCard label={G.totalViews} value={totals?.views ?? 0} />
        <StatCard label={G.views30} value={views30} tone={views30 ? "brand" : undefined} />
      </SpecStrip>

      <FilterBar className="flex-col items-stretch">
        <PillTabs items={stateTabs} current={state} />
        <form action="/admin/pages" className="flex w-full flex-wrap items-center gap-2">
          {state !== "all" ? <input type="hidden" name="state" value={state} /> : null}
          <Select name="project" defaultValue={projectFilter} className="h-9 w-full text-[13.5px] sm:w-64" aria-label={G.colProject}>
            <option value="all">{X.anyProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.title}
              </option>
            ))}
          </Select>
          <Input name="q" defaultValue={q} placeholder={X.searchPlaceholder} className="h-9 w-full text-[13.5px] sm:w-56" aria-label={t.common.search} />
          <button type="submit" className="btn-secondary btn-sm">
            {t.common.apply}
          </button>
          <Link href="/admin/pages" className="btn-ghost btn-sm">
            {t.common.reset}
          </Link>
        </form>
      </FilterBar>

      {rows.length === 0 ? (
        <Empty
          title={G.emptyTitle}
          text={filtered ? X.emptyFound : G.emptyText}
          action={
            filtered ? (
              <Link href="/admin/pages" className="btn-secondary btn-sm">
                {X.clearFilters}
              </Link>
            ) : (
              <Link href="/admin/projects" className="btn-primary btn-sm">
                {G.emptyAction}
              </Link>
            )
          }
        />
      ) : (
        <>
          {matched > rows.length ? <p className="caption mb-2">{X.showingOf(rows.length, matched)}</p> : null}
          {/* Phone: one tappable row per link instead of a nine-field key/value dump. Every action the
              table offers (open, copy, switch off) lives on the project's client tab, which is where
              the row goes. From md up the real table below is unchanged. */}
          <CompactList>
            {rows.map(({ link: l, projectId, code, title }) => {
              const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
              const stateLabels = [!l.isActive ? G.off : null, expired ? G.expired : null].filter(Boolean) as string[];
              return (
                <CompactRow
                  key={l.id}
                  href={projectId ? `/admin/projects/${projectId}?tab=client` : undefined}
                  title={title ?? G.deletedProject}
                  meta={
                    <>
                      {code ? `${code} · ` : ""}
                      /p/{l.slug} · <RelTime iso={l.lastViewedAt} locale={locale} />
                    </>
                  }
                  badge={<StatusBadge value={!l.isActive || expired ? "inactive" : "active"} label={stateLabels.join(" · ") || G.activeState} />}
                />
              );
            })}
          </CompactList>
          <div className="card overflow-x-auto max-md:hidden">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>{G.colProject}</th>
                  <th>{G.colUrl}</th>
                  <th className="max-xl:hidden!">{t.common.language}</th>
                  <th className="num">{G.colViews}</th>
                  <th>{G.colLastViewed}</th>
                  <th className="max-xl:hidden!">{G.colExpires}</th>
                  <th className="max-xl:hidden!">{G.colSent}</th>
                  <th>{G.colState}</th>
                  <th className="num">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ link: l, projectId, code, title }) => {
                  const url = shareUrl(l, env.appUrl);
                  const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                  // Off and expired are two different reasons a link does not open: show both, never only one.
                  const stateLabels = [!l.isActive ? G.off : null, expired ? G.expired : null].filter(Boolean) as string[];
                  return (
                    <tr key={l.id}>
                      {/* No nowrap on a phone: the stacked card is ~330px wide and "AT-2026-0001" plus a long
                          title on one line widened the whole page and pushed the fixed tab bar off screen. */}
                      <td data-label={G.colProject} className="md:max-w-[15rem] md:whitespace-nowrap">
                        {projectId ? (
                          <Link href={`/admin/projects/${projectId}?tab=client`} title={title ?? undefined} className="block font-semibold [overflow-wrap:anywhere] text-fg transition-colors hover:text-accent md:truncate">
                            {title}
                          </Link>
                        ) : (
                          <span className="text-muted">{G.deletedProject}</span>
                        )}
                        <div className="font-mono text-xs text-muted">{code ?? ""}</div>
                      </td>
                      <td data-label={G.colUrl}>
                        {/* Only the slug: the full URL is one copy button away and it was what pushed the
                            State and Actions columns past the card edge at 1440. */}
                        <div className="font-mono text-xs [overflow-wrap:anywhere] text-fg" title={url}>
                          /p/{l.slug}
                        </div>
                        {l.title ? <div className="truncate text-[11px] text-faint">{l.title}</div> : null}
                      </td>
                      <td data-label={t.common.language} className="font-mono text-[11px] tracking-[0.08em] uppercase max-xl:hidden!">
                        {l.language}
                      </td>
                      <td data-label={G.colViews} className="num">
                        {l.viewsCount}
                      </td>
                      <td data-label={G.colLastViewed} suppressHydrationWarning className="font-mono text-[12px] whitespace-nowrap text-muted">
                        <span suppressHydrationWarning>{l.lastViewedAt ? relTime(l.lastViewedAt, locale) : "—"}</span>
                      </td>
                      <td data-label={G.colExpires} className="font-mono text-[12px] whitespace-nowrap max-xl:hidden!">
                        {l.expiresAt ? formatDate(l.expiresAt) : "—"}
                      </td>
                      <td data-label={G.colSent} suppressHydrationWarning className="font-mono text-[11px] whitespace-nowrap text-muted max-xl:hidden!">
                        <span suppressHydrationWarning>{l.sentAt ? `${sentViaNames[l.sentVia ?? ""] ?? l.sentVia} · ${relTime(l.sentAt, locale)}` : "—"}</span>
                      </td>
                      <td data-label={G.colState}>
                        {stateLabels.length ? (
                          <span className="flex flex-wrap gap-1">
                            {stateLabels.map((s) => (
                              <Badge key={s} tone={s === G.expired ? "warning" : "neutral"}>
                                {s}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          <Badge tone="success">{G.activeState}</Badge>
                        )}
                        {l.passcode ? <div className="mt-0.5 text-[11px] text-muted">{G.codeHint(l.passcode)}</div> : null}
                      </td>
                      <td data-label="">
                        {/* Labelled on the phone (an icon-only "Off" reads as a state, not an action) and
                            icon-sized from md up, where the header row already names the column. */}
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm min-h-10 md:min-h-0" title={url}>
                            <ExternalLink size={14} /> {X.open}
                          </a>
                          <CopyButton text={url} label={X.copyLink} copiedLabel={t.common.copied} className="btn-ghost btn-sm min-h-10 md:min-h-0" />
                          <form action={toggleShareLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            {/* Honoured once the action supports it; without it the admin lands on the project page. */}
                            <input type="hidden" name="returnTo" value="/admin/pages" />
                            <ConfirmButton message={l.isActive ? G.deactivateConfirm : G.activateConfirm} className="btn-ghost btn-sm min-h-10 md:min-h-0">
                              {l.isActive ? X.deactivate : X.activate}
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
        </>
      )}
    </>
  );
}
