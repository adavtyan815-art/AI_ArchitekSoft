import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { LayoutGrid, List, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/crm";
import { cn, formatMoney, relativeTime } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";
import { updateLeadStatusAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type Search = { status?: string; segment?: string; q?: string; view?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
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

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Every request from the website, social channels and phone calls."
        actions={
          <>
            <div className="flex rounded-full border border-ink-200 bg-white p-0.5">
              <Link href={href({ view: "table" })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", view === "table" ? "bg-ink-950 text-white" : "text-ink-600")} title="Table">
                <List size={14} />
              </Link>
              <Link href={href({ view: "board" })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", view === "board" ? "bg-ink-950 text-white" : "text-ink-600")} title="Kanban">
                <LayoutGrid size={14} />
              </Link>
            </div>
            <Link href="/admin/leads/new" className="btn-primary btn-sm">
              <Plus size={14} /> New lead
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-line lg:border-0">
          {[{ key: "all", label: "All", count: total }, ...LEAD_STATUSES.map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1), count: counts[s] ?? 0 }))].map((t) => (
            <Link key={t.key} href={href({ status: t.key })} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", status === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-ink-200 bg-white p-0.5 text-xs font-semibold">
            {(["all", "b2b", "b2c"] as const).map((s) => (
              <Link key={s} href={href({ segment: s })} className={cn("rounded-full px-3 py-1 uppercase", segment === s ? "bg-ink-950 text-white" : "text-ink-600")}>
                {s}
              </Link>
            ))}
          </div>
          <form action="/admin/leads" className="flex items-center gap-2">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            {segment !== "all" ? <input type="hidden" name="segment" value={segment} /> : null}
            {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
            <Input name="q" defaultValue={q} placeholder="Search name, phone, company…" className="w-56 py-1.5" />
          </form>
        </div>
      </div>

      {view === "board" ? (
        <Board rows={boardRows} />
      ) : rows.length === 0 ? (
        <Empty title="No leads match" text={q ? `Nothing found for “${q}”.` : "New website and social requests will appear here."} action={<Link href="/admin/leads/new" className="btn-primary btn-sm">Add a lead manually</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Name / company</th>
                <th>Segment</th>
                <th>Service</th>
                <th>Room</th>
                <th>Source</th>
                <th>Contact</th>
                <th className="text-right">Value</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/admin/leads/${l.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {l.name}
                    </Link>
                    {l.companyName ? <div className="text-xs text-ink-500">{l.companyName}</div> : null}
                  </td>
                  <td>
                    <StatusBadge value={l.segment} />
                  </td>
                  <td className="text-ink-600">{l.service?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="text-ink-600">{l.roomType ?? "—"}</td>
                  <td className="text-ink-600">{l.source}</td>
                  <td className="text-xs text-ink-600">
                    {l.phone ? <div>{l.phone}</div> : null}
                    {l.telegram ? <div>{l.telegram}</div> : null}
                    {!l.phone && !l.telegram ? l.email ?? "—" : null}
                  </td>
                  <td className="text-right tabular-nums">{l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : "—"}</td>
                  <td className="whitespace-nowrap text-ink-500">{relativeTime(l.createdAt)}</td>
                  <td>
                    <StatusBadge value={l.status} />
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

function Board({ rows }: { rows: (typeof schema.leads.$inferSelect)[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-3">
        {LEAD_STATUSES.map((s) => {
          const col = rows.filter((r) => r.status === s);
          return (
            <div key={s} className="w-64 flex-none rounded-2xl border border-line bg-ink-50/60 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <StatusBadge value={s} />
                <span className="text-xs font-medium text-ink-500">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((l) => (
                  <div key={l.id} className="card p-3 shadow-none">
                    <Link href={`/admin/leads/${l.id}`} className="block text-sm font-medium text-ink-900 hover:text-brand-600">
                      {l.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-ink-500">{[l.companyName, l.service?.replace(/_/g, " "), l.roomType].filter(Boolean).join(" · ") || l.source}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                      <StatusBadge value={l.segment} />
                      <span>{l.estimatedValue ? formatMoney(l.estimatedValue, l.currency ?? "AMD") : relativeTime(l.createdAt)}</span>
                    </div>
                    <form action={updateLeadStatusAction} className="mt-2">
                      <input type="hidden" name="id" value={l.id} />
                      <AutoSubmitSelect name="status" defaultValue={l.status} className="py-1.5 text-xs">
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                  </div>
                ))}
                {col.length === 0 ? <div className="px-2 py-4 text-center text-xs text-ink-400">Empty</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
