import Link from "next/link";
import { and, desc, sql, eq, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { COMPANY_TYPES } from "@/lib/crm";
import { first, formatMoneyTotals, searchWhere, type MoneyTotal } from "@/lib/admin-helpers";
import { RelTime } from "@/components/admin/rel-time";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { CompactList, CompactRow, FilterBar, PageHeader, PillTabs, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";
import { Notice, noticeFrom } from "@/components/admin/notice";

export const dynamic = "force-dynamic";

/** A repeated key (`?q=a&q=b`) arrives as an array, so every parameter is read through `first()`. */
type Search = Record<string, string | string[] | undefined>;

const LIST_LIMIT = 500;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const K = t.crm.companies;
  const sp = await searchParams;
  const typeParam = first(sp.type);
  const type = COMPANY_TYPES.includes(typeParam as (typeof COMPANY_TYPES)[number]) ? typeParam : "all";
  const q = first(sp.q).trim().slice(0, 80);
  const db = getDb();

  // Every word of the query must match one of the columns; `%` and `_` are matched literally.
  const search = q
    ? searchWhere({ text: [schema.companies.name, schema.companies.city, schema.companies.phone, schema.companies.email, schema.companies.website], phones: [schema.companies.phone] }, q)
    : undefined;
  const conds: SQL[] = [];
  if (type !== "all") conds.push(eq(schema.companies.type, type));
  if (search) conds.push(search);
  const rows = db.select().from(schema.companies).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.companies.createdAt)).limit(LIST_LIMIT).all();

  const contactCounts = Object.fromEntries(
    db
      .select({ companyId: schema.clients.companyId, c: sql<number>`count(*)` })
      .from(schema.clients)
      .groupBy(schema.clients.companyId)
      .all()
      .map((r) => [r.companyId ?? "", r.c])
  );
  // Quoted money is summed per currency: a USD quote is never added to an AMD one.
  const projectAgg = new Map<string, { c: number; totals: MoneyTotal[] }>();
  for (const r of db
    .select({ companyId: schema.projects.companyId, currency: schema.projects.currency, c: sql<number>`count(*)`, v: sql<number>`coalesce(sum(${schema.projects.quoteAmount}),0)` })
    .from(schema.projects)
    .groupBy(schema.projects.companyId, schema.projects.currency)
    .all()) {
    const key = r.companyId ?? "";
    const entry = projectAgg.get(key) ?? { c: 0, totals: [] };
    entry.c += r.c;
    if (r.v) entry.totals.push({ currency: r.currency || "AMD", amount: r.v });
    projectAgg.set(key, entry);
  }
  // Tab counts follow the search, and they are the totals the 500-row list is measured against.
  const typeCounts = Object.fromEntries(
    db
      .select({ type: schema.companies.type, c: sql<number>`count(*)` })
      .from(schema.companies)
      .where(search)
      .groupBy(schema.companies.type)
      .all()
      .map((r) => [r.type, r.c])
  ) as Record<string, number>;
  const allCount = Object.values(typeCounts).reduce((s, n) => s + n, 0);
  const total = type === "all" ? allCount : (typeCounts[type] ?? 0);

  const href = (patch: Partial<Record<"type" | "q", string>>) => {
    const p = new URLSearchParams();
    const next = { type, q, ...patch };
    if (next.type && next.type !== "all") p.set("type", next.type);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/companies?${s}` : "/admin/companies";
  };

  const tabs = [{ key: "all", label: t.common.all, href: href({ type: "all" }), count: allCount }, ...COMPANY_TYPES.map((ty) => ({ key: ty, label: labelFor(t, "companyTypes", ty), href: href({ type: ty }), count: typeCounts[ty] ?? 0 }))];

  return (
    <>
      <Notice {...noticeFrom(sp)} />
      <PageHeader
        title={K.title}
        subtitle={K.subtitle}
        actions={
          <Link href="/admin/companies/new" className="btn-primary btn-sm">
            <Plus size={14} /> {K.new}
          </Link>
        }
      />

      <FilterBar>
        <PillTabs items={tabs} current={type} />
        <form action="/admin/companies" className="w-full sm:w-auto">
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <Input name="q" defaultValue={q} placeholder={K.searchPlaceholder} className="h-10 w-full text-[13.5px] sm:w-56" aria-label={t.common.search} />
        </form>
      </FilterBar>

      {rows.length < total ? <p className="caption -mt-3 mb-4">{t.common.showingOf(rows.length, total)}</p> : null}

      {rows.length === 0 ? (
        <Empty
          title={K.emptyTitle}
          text={q ? t.crm.leads.emptyFound(q) : K.emptyText}
          action={
            // With a filter on, clearing it is the useful next step; creating a record is not.
            q || type !== "all" ? (
              <Link href="/admin/companies" className="btn-secondary btn-sm">
                {t.common.clearFilters}
              </Link>
            ) : (
              <Link href="/admin/companies/new" className="btn-primary btn-sm">
                {K.emptyAction}
              </Link>
            )
          }
        />
      ) : (
        <>
        {/* Phone: one tappable row per company instead of a nine-field key/value card; md and up
            keeps the table below. */}
        <CompactList>
          {rows.map((c) => (
            <CompactRow
              key={c.id}
              href={`/admin/companies/${c.id}`}
              title={c.name}
              meta={
                <>
                  {labelFor(t, "companyTypes", c.type)} · {c.city ?? "—"} · <RelTime iso={c.createdAt} locale={locale} />
                </>
              }
              badge={<StatusBadge value={c.status} label={labelFor(t, "companyStatus", c.status)} />}
            />
          ))}
        </CompactList>
        <div className="card overflow-x-auto max-md:hidden">
          <table className="table-admin">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                <th>{t.common.type}</th>
                <th>{t.common.city}</th>
                <th>{t.crm.contact.title}</th>
                <th className="num max-md:hidden!">{K.colContacts}</th>
                <th className="num max-md:hidden!">{K.colProjects}</th>
                <th className="num">{K.colPipeline}</th>
                <th className="max-md:hidden!">{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const agg = projectAgg.get(c.id);
                return (
                  <tr key={c.id}>
                    <td data-label={t.common.name} className="min-w-0">
                      <div className="min-w-0">
                        {/* 40px tap target on a phone; a long unbroken name wraps instead of widening the page */}
                        <Link href={`/admin/companies/${c.id}`} className="flex min-h-10 items-center font-semibold [overflow-wrap:anywhere] text-fg transition-colors hover:text-accent md:min-h-0">
                          {c.name}
                        </Link>
                        {c.website ? <div className="truncate text-xs text-muted">{c.website.replace(/^https?:\/\//, "")}</div> : null}
                      </div>
                    </td>
                    <td data-label={t.common.type}>{labelFor(t, "companyTypes", c.type)}</td>
                    <td data-label={t.common.city} className="[overflow-wrap:anywhere]">{c.city ?? "—"}</td>
                    <td data-label={t.crm.contact.title} className="font-mono text-[12px]">
                      {c.phone ? <div>{c.phone}</div> : null}
                      {c.email ? <div className="break-all">{c.email}</div> : null}
                      {!c.phone && !c.email ? "—" : null}
                    </td>
                    <td data-label={K.colContacts} className="num max-md:hidden!">
                      {contactCounts[c.id] ?? 0}
                    </td>
                    <td data-label={K.colProjects} className="num max-md:hidden!">
                      {agg?.c ?? 0}
                    </td>
                    <td data-label={K.colPipeline} className="num">
                      {agg?.totals.length ? formatMoneyTotals(agg.totals) : "—"}
                    </td>
                    <td data-label={t.common.created} className="font-mono text-[12px] whitespace-nowrap text-muted max-md:hidden!">
                      <RelTime iso={c.createdAt} locale={locale} />
                    </td>
                    <td data-label={t.common.status}>
                      <StatusBadge value={c.status} label={labelFor(t, "companyStatus", c.status)} />
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
