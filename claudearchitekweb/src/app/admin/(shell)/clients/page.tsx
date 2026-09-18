import Link from "next/link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, first, searchWhere } from "@/lib/admin-helpers";
import { RelTime } from "@/components/admin/rel-time";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { CompactList, CompactRow, FilterBar, PageHeader, PillTabs, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";
import { Notice, noticeFrom } from "@/components/admin/notice";

export const dynamic = "force-dynamic";

/** A repeated key (`?q=a&q=b`) arrives as an array, so every parameter is read through `first()`. */
type Search = Record<string, string | string[] | undefined>;

const LIST_LIMIT = 500;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const C = t.crm.clients;
  const sp = await searchParams;
  const tab = first(sp.tab) === "contact" ? "contact" : "individual";
  const q = first(sp.q).trim().slice(0, 80);
  const db = getDb();

  // "First Last" must find a person whose names live in two columns; `%` and `_` are matched literally.
  const search = q
    ? searchWhere(
        {
          text: [schema.clients.firstName, schema.clients.lastName, schema.clients.phone, schema.clients.whatsapp, schema.clients.email, schema.clients.telegram, schema.clients.city, schema.clients.position],
          phones: [schema.clients.phone, schema.clients.whatsapp, schema.clients.telegram],
        },
        q
      )
    : undefined;
  const conds: SQL[] = [eq(schema.clients.kind, tab)];
  if (search) conds.push(search);
  const rows = db.select().from(schema.clients).where(and(...conds)).orderBy(desc(schema.clients.createdAt)).limit(LIST_LIMIT).all();

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
  // Tab counts follow the search, and they are the totals the 500-row list is measured against.
  const kindCounts = Object.fromEntries(
    db
      .select({ kind: schema.clients.kind, c: sql<number>`count(*)` })
      .from(schema.clients)
      .where(search)
      .groupBy(schema.clients.kind)
      .all()
      .map((r) => [r.kind, r.c])
  ) as Record<string, number>;
  const total = kindCounts[tab] ?? 0;

  const href = (patch: Partial<Record<"tab" | "q", string>>) => {
    const p = new URLSearchParams();
    const next = { tab, q, ...patch };
    if (next.tab === "contact") p.set("tab", "contact");
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/clients?${s}` : "/admin/clients";
  };

  return (
    <>
      <Notice {...noticeFrom(sp)} />
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
          <Input name="q" defaultValue={q} placeholder={C.searchPlaceholder} className="h-10 w-full text-[13.5px] sm:w-56" aria-label={t.common.search} />
        </form>
      </FilterBar>

      {rows.length < total ? <p className="caption -mt-3 mb-4">{t.common.showingOf(rows.length, total)}</p> : null}

      {rows.length === 0 ? (
        <Empty
          title={C.emptyTitle}
          text={q ? t.crm.leads.emptyFound(q) : C.emptyText}
          action={
            // With a search on, clearing it is the useful next step; creating a record is not.
            q ? (
              <Link href={href({ q: "" })} className="btn-secondary btn-sm">
                {t.common.clearFilters}
              </Link>
            ) : (
              <Link href="/admin/clients/new" className="btn-primary btn-sm">
                {C.emptyAction}
              </Link>
            )
          }
        />
      ) : (
        <>
        {/* Phone: one tappable row per client instead of a nine-field key/value card; md and up
            keeps the table below. */}
        <CompactList>
          {rows.map((c) => (
            <CompactRow
              key={c.id}
              href={`/admin/clients/${c.id}`}
              title={clientLabel(c) || "—"}
              meta={
                <>
                  {(c.companyId ? companies[c.companyId] : null) ?? "—"} · {c.city ?? "—"} · <RelTime iso={c.createdAt} locale={locale} />
                </>
              }
              badge={<StatusBadge value={c.status} label={labelFor(t, "clientStatus", c.status)} />}
            />
          ))}
        </CompactList>
        <div className="card overflow-x-auto max-md:hidden">
          <table className="table-admin">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                {tab === "contact" ? <th>{t.crm.form.company}</th> : null}
                <th>{t.common.phone}</th>
                <th className="max-md:hidden!">{t.common.telegram}</th>
                <th className="max-md:hidden!">{t.common.language}</th>
                <th>{t.common.city}</th>
                <th className="num">{C.colProjects}</th>
                <th className="max-md:hidden!">{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td data-label={t.common.name} className="min-w-0">
                    <div className="min-w-0">
                      {/* 40px tap target on a phone; a long unbroken name wraps instead of widening the page */}
                      <Link href={`/admin/clients/${c.id}`} className="flex min-h-10 items-center font-semibold [overflow-wrap:anywhere] text-fg transition-colors hover:text-accent md:min-h-0">
                        {clientLabel(c) || "—"}
                      </Link>
                      {c.position ? <div className="text-xs [overflow-wrap:anywhere] text-muted">{c.position}</div> : null}
                    </div>
                  </td>
                  {tab === "contact" ? (
                    <td data-label={t.crm.form.company}>
                      {c.companyId ? (
                        <Link href={`/admin/companies/${c.companyId}`} className="inline-flex min-h-10 items-center [overflow-wrap:anywhere] transition-colors hover:text-accent md:min-h-0">
                          {companies[c.companyId] ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td data-label={t.common.phone} className="font-mono text-[12.5px] [overflow-wrap:anywhere]">{c.phone ?? "—"}</td>
                  <td data-label={t.common.telegram} className="font-mono text-[12.5px] [overflow-wrap:anywhere] max-md:hidden!">{c.telegram ?? "—"}</td>
                  <td data-label={t.common.language} className="font-mono text-[11px] tracking-[0.08em] uppercase max-md:hidden!">
                    {c.language}
                  </td>
                  <td data-label={t.common.city} className="[overflow-wrap:anywhere]">{c.city ?? "—"}</td>
                  <td data-label={C.colProjects} className="num">
                    {projectCounts[c.id] ?? 0}
                  </td>
                  <td data-label={t.common.created} className="font-mono text-[12px] whitespace-nowrap text-muted max-md:hidden!">
                    <RelTime iso={c.createdAt} locale={locale} />
                  </td>
                  <td data-label={t.common.status}>
                    <StatusBadge value={c.status} label={labelFor(t, "clientStatus", c.status)} />
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
