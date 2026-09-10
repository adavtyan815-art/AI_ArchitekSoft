import Link from "next/link";
import { and, desc, like, or, sql, eq, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { COMPANY_TYPES } from "@/lib/crm";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatMoney } from "@/lib/utils";
import { FilterBar, PageHeader, PillTabs, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = { type?: string; q?: string };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const K = t.crm.companies;
  const sp = await searchParams;
  const type = COMPANY_TYPES.includes(sp.type as (typeof COMPANY_TYPES)[number]) ? sp.type! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const db = getDb();

  const conds: SQL[] = [];
  if (type !== "all") conds.push(eq(schema.companies.type, type));
  if (q) {
    const p = `%${q}%`;
    conds.push(or(like(schema.companies.name, p), like(schema.companies.city, p), like(schema.companies.phone, p), like(schema.companies.email, p), like(schema.companies.website, p))!);
  }
  const rows = db.select().from(schema.companies).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.companies.createdAt)).limit(500).all();

  const contactCounts = Object.fromEntries(
    db
      .select({ companyId: schema.clients.companyId, c: sql<number>`count(*)` })
      .from(schema.clients)
      .groupBy(schema.clients.companyId)
      .all()
      .map((r) => [r.companyId ?? "", r.c])
  );
  const projectAgg = Object.fromEntries(
    db
      .select({ companyId: schema.projects.companyId, c: sql<number>`count(*)`, v: sql<number>`coalesce(sum(quote_amount),0)` })
      .from(schema.projects)
      .groupBy(schema.projects.companyId)
      .all()
      .map((r) => [r.companyId ?? "", { c: r.c, v: r.v }])
  );
  const typeCounts = Object.fromEntries(
    db
      .select({ type: schema.companies.type, c: sql<number>`count(*)` })
      .from(schema.companies)
      .groupBy(schema.companies.type)
      .all()
      .map((r) => [r.type, r.c])
  );
  const total = rows.length;

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { type, q, ...patch };
    if (next.type && next.type !== "all") p.set("type", next.type);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/companies?${s}` : "/admin/companies";
  };

  const tabs = [
    { key: "all", label: t.common.all, href: href({ type: "all" }), count: Object.values(typeCounts).reduce((s: number, n) => s + (n as number), 0) },
    ...COMPANY_TYPES.map((ty) => ({ key: ty, label: labelFor(t, "companyTypes", ty), href: href({ type: ty }), count: typeCounts[ty] ?? 0 })),
  ];

  return (
    <>
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
          <Input name="q" defaultValue={q} placeholder={K.searchPlaceholder} className="w-full py-1.5 sm:w-56" aria-label={t.common.search} />
        </form>
      </FilterBar>

      {total === 0 ? (
        <Empty
          title={K.emptyTitle}
          text={q ? t.crm.leads.emptyFound(q) : K.emptyText}
          action={
            <Link href="/admin/companies/new" className="btn-primary btn-sm">
              {K.emptyAction}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent max-md:shadow-none">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                <th>{t.common.type}</th>
                <th>{t.common.city}</th>
                <th>{t.crm.contact.title}</th>
                <th className="text-right max-md:hidden!">{K.colContacts}</th>
                <th className="text-right max-md:hidden!">{K.colProjects}</th>
                <th className="text-right">{K.colPipeline}</th>
                <th className="max-md:hidden!">{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const agg = projectAgg[c.id] as { c: number; v: number } | undefined;
                return (
                  <tr key={c.id}>
                    <td data-label={t.common.name}>
                      <Link href={`/admin/companies/${c.id}`} className="font-medium text-fg transition-colors hover:text-accent">
                        {c.name}
                      </Link>
                      {c.website ? <div className="truncate text-xs text-muted">{c.website.replace(/^https?:\/\//, "")}</div> : null}
                    </td>
                    <td data-label={t.common.type}>{labelFor(t, "companyTypes", c.type)}</td>
                    <td data-label={t.common.city}>{c.city ?? "—"}</td>
                    <td data-label={t.crm.contact.title} className="text-xs">
                      {c.phone ? <div>{c.phone}</div> : null}
                      {c.email ? <div className="break-all">{c.email}</div> : null}
                      {!c.phone && !c.email ? "—" : null}
                    </td>
                    <td data-label={K.colContacts} className="text-right tabular-nums max-md:hidden!">
                      {contactCounts[c.id] ?? 0}
                    </td>
                    <td data-label={K.colProjects} className="text-right tabular-nums max-md:hidden!">
                      {agg?.c ?? 0}
                    </td>
                    <td data-label={K.colPipeline} className="text-right tabular-nums">
                      {agg?.v ? formatMoney(agg.v) : "—"}
                    </td>
                    <td data-label={t.common.created} className="whitespace-nowrap text-muted max-md:hidden!">
                      {relTime(c.createdAt, locale)}
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
      )}
    </>
  );
}
