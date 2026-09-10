import Link from "next/link";
import { and, desc, like, or, sql, eq, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { COMPANY_TYPES } from "@/lib/crm";
import { cn, formatMoney, relativeTime } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = { type?: string; q?: string };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
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

  const contactCounts = Object.fromEntries(db.select({ companyId: schema.clients.companyId, c: sql<number>`count(*)` }).from(schema.clients).groupBy(schema.clients.companyId).all().map((r) => [r.companyId ?? "", r.c]));
  const projectAgg = Object.fromEntries(
    db.select({ companyId: schema.projects.companyId, c: sql<number>`count(*)`, v: sql<number>`coalesce(sum(quote_amount),0)` }).from(schema.projects).groupBy(schema.projects.companyId).all().map((r) => [r.companyId ?? "", { c: r.c, v: r.v }])
  );
  const typeCounts = Object.fromEntries(db.select({ type: schema.companies.type, c: sql<number>`count(*)` }).from(schema.companies).groupBy(schema.companies.type).all().map((r) => [r.type, r.c]));
  const total = rows.length;

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { type, q, ...patch };
    if (next.type && next.type !== "all") p.set("type", next.type);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/companies?${s}` : "/admin/companies";
  };

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Manufacturers, studios, developers and retailers you work with."
        actions={
          <Link href="/admin/companies/new" className="btn-primary btn-sm">
            <Plus size={14} /> New company
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-line lg:border-0">
          {[{ key: "all", label: "All", count: Object.values(typeCounts).reduce((s: number, n) => s + (n as number), 0) }, ...COMPANY_TYPES.map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1), count: typeCounts[t] ?? 0 }))].map((t) => (
            <Link key={t.key} href={href({ type: t.key })} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", type === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span>
            </Link>
          ))}
        </div>
        <form action="/admin/companies" className="flex items-center gap-2">
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <Input name="q" defaultValue={q} placeholder="Search name, city, site…" className="w-56 py-1.5" />
        </form>
      </div>

      {total === 0 ? (
        <Empty title="No companies match" text={q ? `Nothing found for “${q}”.` : "B2B leads create companies automatically when converted."} action={<Link href="/admin/companies/new" className="btn-primary btn-sm">Add a company</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>City</th>
                <th>Contact</th>
                <th className="text-right">Contacts</th>
                <th className="text-right">Projects</th>
                <th className="text-right">Pipeline</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const agg = projectAgg[c.id] as { c: number; v: number } | undefined;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/companies/${c.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                        {c.name}
                      </Link>
                      {c.website ? <div className="truncate text-xs text-ink-500">{c.website.replace(/^https?:\/\//, "")}</div> : null}
                    </td>
                    <td className="text-ink-600">{c.type}</td>
                    <td className="text-ink-600">{c.city ?? "—"}</td>
                    <td className="text-xs text-ink-600">
                      {c.phone ? <div>{c.phone}</div> : null}
                      {c.email ? <div>{c.email}</div> : null}
                      {!c.phone && !c.email ? "—" : null}
                    </td>
                    <td className="text-right tabular-nums text-ink-600">{contactCounts[c.id] ?? 0}</td>
                    <td className="text-right tabular-nums text-ink-600">{agg?.c ?? 0}</td>
                    <td className="text-right tabular-nums">{agg?.v ? formatMoney(agg.v) : "—"}</td>
                    <td className="whitespace-nowrap text-ink-500">{relativeTime(c.createdAt)}</td>
                    <td>
                      <StatusBadge value={c.status} />
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
