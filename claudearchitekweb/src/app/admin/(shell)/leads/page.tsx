import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { LayoutGrid, List, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/crm";
import { relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor, type AdminDict, type AdminLocale } from "@/lib/i18n/admin";
import { cn, formatMoney } from "@/lib/utils";
import { FilterBar, PageHeader, PillTabs, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";
import { updateLeadStatusAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type Search = { status?: string; segment?: string; q?: string; view?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.crm.leads;
  const sp = await searchParams;
  const status = LEAD_STATUSES.includes(sp.status as (typeof LEAD_STATUSES)[number]) ? sp.status! : "all";
  const segment = sp.segment === "b2b" || sp.segment === "b2c" ? sp.segment : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const view = sp.view === "board" ? "board" : "table";
  const db = getDb();

  // base filters (segment + search) apply to both views; the status filter only narrows the table
  const baseConds: SQL[] = [];
  if (segment !== "all") baseConds.push(eq(schema.leads.segment, segment));
  if (q) {
    const p = `%${q}%`;
    baseConds.push(or(like(schema.leads.name, p), like(schema.leads.companyName, p), like(schema.leads.phone, p), like(schema.leads.email, p), like(schema.leads.telegram, p))!);
  }
  const tableConds = status !== "all" ? [...baseConds, eq(schema.leads.status, status)] : baseConds;
  const rows = db.select().from(schema.leads).where(tableConds.length ? and(...tableConds) : undefined).orderBy(desc(schema.leads.createdAt)).limit(500).all();
  const countRows = db.select({ status: schema.leads.status, c: sql<number>`count(*)` }).from(schema.leads).where(segment !== "all" ? eq(schema.leads.segment, segment) : undefined).groupBy(schema.leads.status).all();
  const counts = Object.fromEntries(countRows.map((r) => [r.status, r.c])) as Record<string, number>;
  const total = countRows.reduce((s, r) => s + r.c, 0);

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { status, segment, q, view, ...patch };
    if (next.status && next.status !== "all") p.set("status", next.status);
    if (next.segment && next.segment !== "all") p.set("segment", next.segment);
    if (next.q) p.set("q", next.q);
    if (next.view === "board") p.set("view", "board");
    const s = p.toString();
    return s ? `/admin/leads?${s}` : "/admin/leads";
  };

  const boardRows = view === "board" ? db.select().from(schema.leads).where(baseConds.length ? and(...baseConds) : undefined).orderBy(desc(schema.leads.createdAt)).limit(500).all() : [];

  const statusTabs = [{ key: "all", label: t.common.all, href: href({ status: "all" }), count: total }, ...LEAD_STATUSES.map((s) => ({ key: s, label: labelFor(t, "leadStatus", s), href: href({ status: s }), count: counts[s] ?? 0 }))];

  return (
    <>
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        actions={
          <>
            <div className="flex rounded-full border border-line bg-surface p-0.5">
              <Link href={href({ view: "table" })} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", view === "table" ? "bg-fg text-bg" : "text-muted hover:text-fg")} title={L.viewTable} aria-label={L.viewTable}>
                <List size={14} />
              </Link>
              <Link href={href({ view: "board" })} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", view === "board" ? "bg-fg text-bg" : "text-muted hover:text-fg")} title={L.viewBoard} aria-label={L.viewBoard}>
                <LayoutGrid size={14} />
              </Link>
            </div>
            <Link href="/admin/leads/new" className="btn-primary btn-sm">
              <Plus size={14} /> {L.new}
            </Link>
          </>
        }
      />

      <FilterBar>
        <PillTabs items={statusTabs} current={status} />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex rounded-full bg-surface p-0.5 text-xs font-semibold">
            {(
              [
                { key: "all", label: t.common.all },
                { key: "b2b", label: t.common.b2b },
                { key: "b2c", label: t.common.b2c },
              ] as const
            ).map((s) => (
              <Link key={s.key} href={href({ segment: s.key })} className={cn("rounded-full px-3 py-1.5 whitespace-nowrap transition-colors", segment === s.key ? "bg-fg text-bg" : "text-muted hover:text-fg")}>
                {s.label}
              </Link>
            ))}
          </div>
          <form action="/admin/leads" className="min-w-[10rem] flex-1 sm:flex-none">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            {segment !== "all" ? <input type="hidden" name="segment" value={segment} /> : null}
            {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
            <Input name="q" defaultValue={q} placeholder={L.searchPlaceholder} className="w-full py-1.5 sm:w-56" aria-label={t.common.search} />
          </form>
        </div>
      </FilterBar>

      {view === "board" ? (
        <Board rows={boardRows} t={t} locale={locale} />
      ) : rows.length === 0 ? (
        <Empty
          title={L.emptyTitle}
          text={q ? L.emptyFound(q) : L.emptyText}
          action={
            <Link href="/admin/leads/new" className="btn-primary btn-sm">
              {L.emptyAction}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent max-md:shadow-none">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{L.colName}</th>
                <th>{t.common.segment}</th>
                <th className="max-md:hidden!">{L.colService}</th>
                <th className="max-md:hidden!">{L.colRoom}</th>
                <th>{t.common.source}</th>
                <th>{L.colContact}</th>
                <th className="text-right max-md:hidden!">{L.colValue}</th>
                <th>{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td data-label={L.colName}>
                    <Link href={`/admin/leads/${l.id}`} className="font-medium text-fg transition-colors hover:text-accent">
                      {l.name}
                    </Link>
                    {l.companyName ? <div className="text-xs text-muted">{l.companyName}</div> : null}
                  </td>
                  <td data-label={t.common.segment}>
                    <StatusBadge value={l.segment} label={labelFor(t, "segments", l.segment)} />
                  </td>
                  <td data-label={L.colService} className="max-md:hidden!">{l.service ? labelFor(t, "services", l.service) : "—"}</td>
                  <td data-label={L.colRoom} className="max-md:hidden!">{l.roomType ? labelFor(t, "rooms", l.roomType) : "—"}</td>
                  <td data-label={t.common.source}>{labelFor(t, "leadSources", l.source)}</td>
                  <td data-label={L.colContact} className="text-xs">
                    {l.phone ? <div>{l.phone}</div> : null}
                    {l.telegram ? <div>{l.telegram}</div> : null}
                    {!l.phone && !l.telegram ? (l.email ?? "—") : null}
                  </td>
                  <td data-label={L.colValue} className="text-right tabular-nums max-md:hidden!">
                    {l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : "—"}
                  </td>
                  <td data-label={t.common.created} className="whitespace-nowrap text-muted">
                    {relTime(l.createdAt, locale)}
                  </td>
                  <td data-label={t.common.status}>
                    <StatusBadge value={l.status} label={labelFor(t, "leadStatus", l.status)} />
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

function Board({ rows, t, locale }: { rows: (typeof schema.leads.$inferSelect)[]; t: AdminDict; locale: AdminLocale }) {
  const L = t.crm.leads;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-3">
        {LEAD_STATUSES.map((s) => {
          const col = rows.filter((r) => r.status === s);
          return (
            <div key={s} className="card-inset w-64 flex-none p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <StatusBadge value={s} label={labelFor(t, "leadStatus", s)} />
                <span className="text-xs font-medium text-muted">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((l) => (
                  <div key={l.id} className="card p-3 shadow-none">
                    <Link href={`/admin/leads/${l.id}`} className="block text-sm font-medium text-fg transition-colors hover:text-accent">
                      {l.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted">
                      {[l.companyName, l.service ? labelFor(t, "services", l.service) : null, l.roomType ? labelFor(t, "rooms", l.roomType) : null].filter(Boolean).join(" · ") || labelFor(t, "leadSources", l.source)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                      <StatusBadge value={l.segment} label={labelFor(t, "segments", l.segment)} />
                      <span>{l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : relTime(l.createdAt, locale)}</span>
                    </div>
                    <form action={updateLeadStatusAction} className="mt-2">
                      <input type="hidden" name="id" value={l.id} />
                      <AutoSubmitSelect name="status" defaultValue={l.status} className="py-1.5 text-xs" aria-label={t.common.status}>
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {labelFor(t, "leadStatus", st)}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                  </div>
                ))}
                {col.length === 0 ? <div className="px-2 py-4 text-center text-xs text-faint">{L.columnEmpty}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
