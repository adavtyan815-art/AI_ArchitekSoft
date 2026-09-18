import Link from "next/link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES } from "@/lib/crm";
import { clientLabel, first, searchWhere } from "@/lib/admin-helpers";
import { RelTime } from "@/components/admin/rel-time";
import { getAdminDict, labelFor, local } from "@/lib/i18n/admin";
import { formatDate, formatMoney } from "@/lib/utils";
import { CompactList, CompactRow, FilterBar, PageHeader, PillTabs, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { Empty, Input, Select } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "cancelled"] as const;
/** Rows rendered at once; the figures above the table are counted in SQL over every matching row. */
const LIMIT = 500;

/** Next gives a repeated parameter (?q=a&q=b) as an array, so every field has to allow one. */
type SPValue = string | string[] | undefined;
type Search = { stage?: SPValue; status?: SPValue; segment?: SPValue; type?: SPValue; q?: SPValue; notice?: SPValue; tone?: SPValue };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const P = t.projects;
  const X = local(
    {
      hy: { clearFilters: "Մաքրել զտիչները", showingOf: (n: number, total: number) => `Ցուցադրված է ${n}-ը ${total}-ից`, noMoney: "—" },
      en: { clearFilters: "Clear filters", showingOf: (n: number, total: number) => `Showing ${n} of ${total}`, noMoney: "—" },
    },
    locale
  );
  const sp = await searchParams;
  const stage = PROJECT_STAGES.includes(first(sp.stage) as (typeof PROJECT_STAGES)[number]) ? first(sp.stage) : "all";
  const status = STATUSES.includes(first(sp.status) as (typeof STATUSES)[number]) ? first(sp.status) : "all";
  const segment = first(sp.segment) === "b2b" || first(sp.segment) === "b2c" ? first(sp.segment) : "all";
  const type = PROJECT_TYPES.includes(first(sp.type) as (typeof PROJECT_TYPES)[number]) ? first(sp.type) : "all";
  const q = first(sp.q).trim().slice(0, 80);
  const db = getDb();

  const conds: SQL[] = [];
  if (stage !== "all") conds.push(eq(schema.projects.stage, stage));
  if (status !== "all") conds.push(eq(schema.projects.status, status));
  if (segment !== "all") conds.push(eq(schema.projects.segment, segment));
  if (type !== "all") conds.push(eq(schema.projects.type, type));
  if (q) {
    // searchWhere escapes % and _ (a lone "%" used to list every project) and requires every word to
    // match, so "kitchen aren" finds the project whose code and title carry one word each.
    const byText = searchWhere({ text: [schema.projects.code, schema.projects.title, schema.projects.description] }, q);
    if (byText) conds.push(byText);
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = db.select().from(schema.projects).where(where).orderBy(desc(schema.projects.updatedAt)).limit(LIMIT).all();

  // Money is stored per project in the project's own currency, so a plain sum would add AMD to USD and
  // print the result as AMD. Sum in SQL over every matching row (not only the rendered page) and keep
  // one figure per currency.
  const totals = db
    .select({
      currency: schema.projects.currency,
      rows: sql<number>`count(*)`,
      quote: sql<number>`coalesce(sum(${schema.projects.quoteAmount}), 0)`,
      paid: sql<number>`coalesce(sum(${schema.projects.paidAmount}), 0)`,
    })
    .from(schema.projects)
    .where(where)
    .groupBy(schema.projects.currency)
    .all();
  const matched = totals.reduce((s, r) => s + r.rows, 0);
  /** Biggest currency first: the largest figure becomes the value, the rest the hint under it. */
  const byCurrency = (pick: (r: (typeof totals)[number]) => number) => {
    const parts = totals.filter((r) => pick(r) > 0).sort((a, b) => pick(b) - pick(a)).map((r) => formatMoney(pick(r), r.currency || "AMD"));
    return { value: parts[0] ?? X.noMoney, rest: parts.slice(1).join(" · ") || undefined };
  };
  const quoted = byCurrency((r) => r.quote);
  const paidSum = byCurrency((r) => r.paid);

  const clients = Object.fromEntries(
    db
      .select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName })
      .from(schema.clients)
      .all()
      .map((c) => [c.id, clientLabel(c)])
  );
  const companies = Object.fromEntries(
    db
      .select({ id: schema.companies.id, name: schema.companies.name })
      .from(schema.companies)
      .all()
      .map((c) => [c.id, c.name])
  );
  const stageCounts = Object.fromEntries(
    db
      .select({ stage: schema.projects.stage, c: sql<number>`count(*)` })
      .from(schema.projects)
      .groupBy(schema.projects.stage)
      .all()
      .map((r) => [r.stage, r.c])
  );
  const totalAll = Object.values(stageCounts).reduce((s: number, n) => s + (n as number), 0);
  const filtered = stage !== "all" || status !== "all" || segment !== "all" || type !== "all" || !!q;

  const href = (patch: Partial<Record<"stage" | "status" | "segment" | "type" | "q", string>>) => {
    const p = new URLSearchParams();
    const next: Record<string, string | undefined> = { stage, status, segment, type, q, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && v !== "all") p.set(k, v);
    const s = p.toString();
    return s ? `/admin/projects?${s}` : "/admin/projects";
  };

  const stageTabs = [{ key: "all", label: t.common.all, href: href({ stage: "all" }), count: totalAll }, ...PROJECT_STAGES.map((s) => ({ key: s, label: labelFor(t, "projectStage", s), href: href({ stage: s }), count: stageCounts[s] ?? 0 }))];

  return (
    <>
      <PageHeader
        title={P.title}
        subtitle={P.subtitle}
        actions={
          <Link href="/admin/projects/new" className="btn-primary btn-sm">
            <Plus size={14} /> {P.new}
          </Link>
        }
      />

      <Notice text={sp.notice} tone={sp.tone} />

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={P.shown} value={rows.length} hint={matched > rows.length ? X.showingOf(rows.length, matched) : P.totalHint(totalAll)} />
        <StatCard label={P.quotedFiltered} value={quoted.value} hint={quoted.rest} />
        <StatCard label={P.paidFiltered} value={paidSum.value} hint={paidSum.rest} tone={paidSum.rest || paidSum.value !== X.noMoney ? "success" : undefined} />
      </SpecStrip>

      <FilterBar className="flex-col items-stretch">
        <PillTabs items={stageTabs} current={stage} />
        <form action="/admin/projects" className="flex w-full flex-wrap items-center gap-2">
          {stage !== "all" ? <input type="hidden" name="stage" value={stage} /> : null}
          <Select name="status" defaultValue={status} className="h-9 w-full text-[13.5px] sm:w-44" aria-label={t.common.status}>
            <option value="all">{P.anyStatus}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelFor(t, "projectStatus", s)}
              </option>
            ))}
          </Select>
          <Select name="segment" defaultValue={segment} className="h-9 w-full text-[13.5px] sm:w-40" aria-label={t.common.segment}>
            <option value="all">{P.anySegment}</option>
            <option value="b2b">{t.segments.b2b}</option>
            <option value="b2c">{t.segments.b2c}</option>
          </Select>
          <Select name="type" defaultValue={type} className="h-9 w-full text-[13.5px] sm:w-40" aria-label={t.common.type}>
            <option value="all">{P.anyType}</option>
            {PROJECT_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {labelFor(t, "rooms", ty)}
              </option>
            ))}
          </Select>
          <Input name="q" defaultValue={q} placeholder={P.searchPlaceholder} className="h-9 w-full text-[13.5px] sm:w-56" aria-label={t.common.search} />
          <button type="submit" className="btn-secondary btn-sm">
            {t.common.apply}
          </button>
          <Link href="/admin/projects" className="btn-ghost btn-sm">
            {t.common.reset}
          </Link>
        </form>
      </FilterBar>

      {rows.length === 0 ? (
        <Empty
          title={P.emptyTitle}
          text={q ? P.emptyFound(q) : P.emptyText}
          action={
            // With a filter on, clearing it is the useful next step; the header already carries "New project",
            // and offering it twice invites an accidental record.
            filtered ? (
              <Link href="/admin/projects" className="btn-secondary btn-sm">
                {X.clearFilters}
              </Link>
            ) : (
              <Link href="/admin/projects/new" className="btn-primary btn-sm">
                {P.new}
              </Link>
            )
          }
        />
      ) : (
        <>
        {/* Phone: one tappable row per project instead of a ten-field key/value card. The table
            below is untouched from md up. */}
        <CompactList>
          {rows.map((p) => (
            <CompactRow
              key={p.id}
              href={`/admin/projects/${p.id}`}
              title={p.title}
              meta={
                <>
                  {p.code} · {(p.clientId ? clients[p.clientId] : null) ?? (p.companyId ? companies[p.companyId] : null) ?? "—"} · <RelTime iso={p.updatedAt} locale={locale} />
                </>
              }
              badge={<StatusBadge value={p.stage} label={labelFor(t, "projectStage", p.stage)} />}
            />
          ))}
        </CompactList>
        <div className="card overflow-x-auto max-md:hidden">
          <table className="table-admin">
            <thead>
              <tr>
                <th>{P.colCode}</th>
                {/* The title carries the most meaning, so it gets the width; segment and type shrink to their content. */}
                <th className="md:min-w-[16rem]">{P.colTitle}</th>
                <th>{P.colClient}</th>
                <th className="w-px whitespace-nowrap max-md:hidden!">{t.common.segment}</th>
                <th className="w-px whitespace-nowrap max-md:hidden!">{t.common.type}</th>
                <th>{t.common.stage}</th>
                <th className="num">{P.colQuote}</th>
                <th className="max-md:hidden!">{P.colDeadline}</th>
                <th className="max-md:hidden!">{t.common.updated}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label={P.colCode} className="font-mono text-xs whitespace-nowrap text-muted">
                    {p.code}
                  </td>
                  <td data-label={P.colTitle} className="md:min-w-[16rem]">
                    <Link href={`/admin/projects/${p.id}`} className="line-clamp-2 font-semibold text-fg transition-colors hover:text-accent" title={p.title}>
                      {p.title}
                    </Link>
                  </td>
                  <td data-label={P.colClient} className="text-xs">
                    {p.clientId ? (
                      <Link href={`/admin/clients/${p.clientId}`} className="block transition-colors hover:text-accent">
                        {clients[p.clientId] ?? "—"}
                      </Link>
                    ) : null}
                    {p.companyId ? (
                      <Link href={`/admin/companies/${p.companyId}`} className="block transition-colors hover:text-accent">
                        {companies[p.companyId] ?? "—"}
                      </Link>
                    ) : null}
                    {!p.clientId && !p.companyId ? "—" : null}
                  </td>
                  <td data-label={t.common.segment} className="w-px whitespace-nowrap max-md:hidden!">
                    <StatusBadge value={p.segment} label={labelFor(t, "segments", p.segment)} />
                  </td>
                  <td data-label={t.common.type} className="w-px whitespace-nowrap max-md:hidden!">{labelFor(t, "rooms", p.type)}</td>
                  <td data-label={t.common.stage}>
                    <StatusBadge value={p.stage} label={labelFor(t, "projectStage", p.stage)} />
                  </td>
                  <td data-label={P.colQuote} className="num whitespace-nowrap">
                    <div>{formatMoney(p.quoteAmount, p.currency)}</div>
                    {p.paidAmount ? <div className="text-xs text-success">{formatMoney(p.paidAmount, p.currency)}</div> : null}
                  </td>
                  <td data-label={P.colDeadline} className="font-mono text-[12px] whitespace-nowrap max-md:hidden!">
                    {p.deadline ? formatDate(p.deadline) : "—"}
                  </td>
                  {/* "2 min ago" is computed from the clock, so the server string and the one the browser
                      computes a moment later can differ — that is a hydration mismatch, not a data change. */}
                  <td data-label={t.common.updated} suppressHydrationWarning className="font-mono text-[12px] whitespace-nowrap text-muted max-md:hidden!">
                    <RelTime iso={p.updatedAt} locale={locale} />
                  </td>
                  <td data-label={t.common.status}>
                    <StatusBadge value={p.status} label={labelFor(t, "projectStatus", p.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
