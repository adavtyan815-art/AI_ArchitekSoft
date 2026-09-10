import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { FilterBar, PageHeader, PillTabs, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = { tab?: string; q?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const C = t.crm.clients;
  const sp = await searchParams;
  const tab = sp.tab === "contact" ? "contact" : "individual";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const db = getDb();

  const conds: SQL[] = [eq(schema.clients.kind, tab)];
  if (q) {
    const p = `%${q}%`;
    conds.push(or(like(schema.clients.firstName, p), like(schema.clients.lastName, p), like(schema.clients.phone, p), like(schema.clients.email, p), like(schema.clients.telegram, p), like(schema.clients.city, p))!);
  }
  const rows = db.select().from(schema.clients).where(and(...conds)).orderBy(desc(schema.clients.createdAt)).limit(500).all();

  const companies = Object.fromEntries(
    db
      .select({ id: schema.companies.id, name: schema.companies.name })
      .from(schema.companies)
      .all()
      .map((c) => [c.id, c.name])
  );
  const projectCounts = Object.fromEntries(
    db
      .select({ clientId: schema.projects.clientId, c: sql<number>`count(*)` })
      .from(schema.projects)
      .groupBy(schema.projects.clientId)
      .all()
      .map((r) => [r.clientId ?? "", r.c])
  );
  const kindCounts = Object.fromEntries(
    db
      .select({ kind: schema.clients.kind, c: sql<number>`count(*)` })
      .from(schema.clients)
      .groupBy(schema.clients.kind)
      .all()
      .map((r) => [r.kind, r.c])
  );

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { tab, q, ...patch };
    if (next.tab === "contact") p.set("tab", "contact");
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/clients?${s}` : "/admin/clients";
  };

  return (
    <>
      <PageHeader
        title={C.title}
        subtitle={C.subtitle}
        actions={
          <Link href="/admin/clients/new" className="btn-primary btn-sm">
            <Plus size={14} /> {C.new}
          </Link>
        }
      />

      <FilterBar>
        <PillTabs
          current={tab}
          items={[
            { key: "individual", label: C.tabIndividual, href: href({ tab: "individual" }), count: kindCounts.individual ?? 0 },
            { key: "contact", label: C.tabContact, href: href({ tab: "contact" }), count: kindCounts.contact ?? 0 },
          ]}
        />
        <form action="/admin/clients" className="w-full sm:w-auto">
          {tab === "contact" ? <input type="hidden" name="tab" value="contact" /> : null}
          <Input name="q" defaultValue={q} placeholder={C.searchPlaceholder} className="w-full py-1.5 sm:w-56" aria-label={t.common.search} />
        </form>
      </FilterBar>

      {rows.length === 0 ? (
        <Empty
          title={C.emptyTitle}
          text={q ? t.crm.leads.emptyFound(q) : C.emptyText}
          action={
            <Link href="/admin/clients/new" className="btn-primary btn-sm">
              {C.emptyAction}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent max-md:shadow-none">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                {tab === "contact" ? <th>{t.crm.form.company}</th> : null}
                <th>{t.common.phone}</th>
                <th className="max-md:hidden!">{t.common.telegram}</th>
                <th className="max-md:hidden!">{t.common.language}</th>
                <th>{t.common.city}</th>
                <th className="text-right">{C.colProjects}</th>
                <th className="max-md:hidden!">{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td data-label={t.common.name}>
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-fg transition-colors hover:text-accent">
                      {clientLabel(c) || "—"}
                    </Link>
                    {c.position ? <div className="text-xs text-muted">{c.position}</div> : null}
                  </td>
                  {tab === "contact" ? (
                    <td data-label={t.crm.form.company}>
                      {c.companyId ? (
                        <Link href={`/admin/companies/${c.companyId}`} className="transition-colors hover:text-accent">
                          {companies[c.companyId] ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td data-label={t.common.phone}>{c.phone ?? "—"}</td>
                  <td data-label={t.common.telegram} className="max-md:hidden!">{c.telegram ?? "—"}</td>
                  <td data-label={t.common.language} className="uppercase max-md:hidden!">
                    {c.language}
                  </td>
                  <td data-label={t.common.city}>{c.city ?? "—"}</td>
                  <td data-label={C.colProjects} className="text-right tabular-nums">
                    {projectCounts[c.id] ?? 0}
                  </td>
                  <td data-label={t.common.created} className="whitespace-nowrap text-muted max-md:hidden!">
                    {relTime(c.createdAt, locale)}
                  </td>
                  <td data-label={t.common.status}>
                    <StatusBadge value={c.status} label={labelFor(t, "clientStatus", c.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
