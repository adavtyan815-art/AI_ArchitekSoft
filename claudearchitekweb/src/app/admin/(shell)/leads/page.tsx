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
            <div className="flex divide-x divide-line rounded-md border border-line">
              <Link href={href({ view: "table" })} className={cn("flex h-9 w-10 items-center justify-center transition-colors", view === "table" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")} title={L.viewTable} aria-label={L.viewTable}>
                <List size={14} />
              </Link>
              <Link href={href({ view: "board" })} className={cn("flex h-9 w-10 items-center justify-center transition-colors", view === "board" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")} title={L.viewBoard} aria-label={L.viewBoard}>
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
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase">
            {(
              [
                { key: "all", label: t.common.all },
                { key: "b2b", label: t.common.b2b },
                { key: "b2c", label: t.common.b2c },
              ] as const
            ).map((s, i) => (
              <span key={s.key} className="flex items-center gap-2">
                {i ? <span aria-hidden className="text-faint">/</span> : null}
                <Link href={href({ segment: s.key })} className={cn("whitespace-nowrap underline-offset-[5px] transition-colors", segment === s.key ? "text-fg underline decoration-accent decoration-2" : "text-muted hover:text-fg")}>
                  {s.label}
                </Link>
              </span>
            ))}
          </div>
          <form action="/admin/leads" className="min-w-[10rem] flex-1 sm:flex-none">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            {segment !== "all" ? <input type="hidden" name="segment" value={segment} /> : null}
            {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
            <Input name="q" defaultValue={q} placeholder={L.searchPlaceholder} className="h-9 w-full text-[13.5px] sm:w-56" aria-label={t.common.search} />
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
                <th className="num max-md:hidden!">{L.colValue}</th>
                <th>{t.common.created}</th>
                <th>{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td data-label={L.colName}>
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-fg transition-colors hover:text-accent">
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
                  <td data-label={L.colContact} className="font-mono text-[12px]">
                    {l.phone ? <div>{l.phone}</div> : null}
                    {l.telegram ? <div>{l.telegram}</div> : null}
                    {!l.phone && !l.telegram ? (l.email ?? "—") : null}
                  </td>
                  <td data-label={L.colValue} className="num max-md:hidden!">
                    {l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : "—"}
                  </td>
                  <td data-label={t.common.created} className="font-mono text-[12px] whitespace-nowrap text-muted">
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
      <div className="flex min-w-max border-t border-line">
        {LEAD_STATUSES.map((s, i) => {
          const col = rows.filter((r) => r.status === s);
          return (
            <div key={s} className={cn("w-64 flex-none px-3 pb-4", i > 0 && "border-l border-line")}>
              <div className="flex items-center justify-between gap-2 border-b border-line py-2.5">
                <span className="truncate font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">{labelFor(t, "leadStatus", s)}</span>
                <span className="num text-[11px] text-faint">{String(col.length).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-col gap-2 pt-3">
                {col.map((l) => (
                  <div key={l.id} className="rounded-md border border-line bg-surface p-3">
                    <Link href={`/admin/leads/${l.id}`} className="block text-[13.5px] font-semibold text-fg transition-colors hover:text-accent">
                      {l.name}
                    </Link>
                    <div className="caption mt-1 line-clamp-2">
                      {[l.companyName, l.service ? labelFor(t, "services", l.service) : null, l.roomType ? labelFor(t, "rooms", l.roomType) : null].filter(Boolean).join(" · ") || labelFor(t, "leadSources", l.source)}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                      <StatusBadge value={l.segment} label={labelFor(t, "segments", l.segment)} />
                      <span className="num text-[11px] text-muted">{l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : relTime(l.createdAt, locale)}</span>
                    </div>
                    <form action={updateLeadStatusAction} className="mt-2">
                      <input type="hidden" name="id" value={l.id} />
                      <AutoSubmitSelect name="status" defaultValue={l.status} className="h-9 text-[13px]" aria-label={t.common.status}>
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {labelFor(t, "leadStatus", st)}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                  </div>
                ))}
                {col.length === 0 ? <div className="py-6 text-center font-mono text-[10.5px] tracking-[0.08em] text-faint uppercase">{L.columnEmpty}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
