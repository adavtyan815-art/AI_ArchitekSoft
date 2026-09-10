import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES } from "@/lib/crm";
import { clientLabel, relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatDate, formatMoney } from "@/lib/utils";
import { FilterBar, PageHeader, PillTabs, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { Empty, Input, Select } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "cancelled"] as const;

type Search = { stage?: string; status?: string; segment?: string; type?: string; q?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const P = t.projects;
  const sp = await searchParams;
  const stage = PROJECT_STAGES.includes(sp.stage as (typeof PROJECT_STAGES)[number]) ? sp.stage! : "all";
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "all";
  const segment = sp.segment === "b2b" || sp.segment === "b2c" ? sp.segment : "all";
  const type = PROJECT_TYPES.includes(sp.type as (typeof PROJECT_TYPES)[number]) ? sp.type! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const db = getDb();

  const conds: SQL[] = [];
  if (stage !== "all") conds.push(eq(schema.projects.stage, stage));
  if (status !== "all") conds.push(eq(schema.projects.status, status));
  if (segment !== "all") conds.push(eq(schema.projects.segment, segment));
  if (type !== "all") conds.push(eq(schema.projects.type, type));
  if (q) {
    const p = `%${q}%`;
    conds.push(or(like(schema.projects.code, p), like(schema.projects.title, p), like(schema.projects.description, p))!);
  }
  const rows = db.select().from(schema.projects).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.projects.updatedAt)).limit(500).all();

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
  const pipeline = rows.reduce((s, p) => s + (p.quoteAmount ?? 0), 0);
  const paid = rows.reduce((s, p) => s + (p.paidAmount ?? 0), 0);

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { stage, status, segment, type, q, ...patch };
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

      <SpecStrip cols={3} className="mb-5">
        <StatCard label={P.shown} value={rows.length} hint={P.totalHint(totalAll)} />
        <StatCard label={P.quotedFiltered} value={formatMoney(pipeline)} />
        <StatCard label={P.paidFiltered} value={formatMoney(paid)} tone={paid ? "success" : undefined} />
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
            <Link href="/admin/projects/new" className="btn-primary btn-sm">
              {P.new}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto max-md:overflow-visible max-md:border-none max-md:bg-transparent max-md:shadow-none">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{P.colCode}</th>
                <th>{P.colTitle}</th>
                <th>{P.colClient}</th>
                <th className="max-md:hidden!">{t.common.segment}</th>
                <th className="max-md:hidden!">{t.common.type}</th>
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
                  <td data-label={P.colTitle}>
                    <Link href={`/admin/projects/${p.id}`} className="font-semibold text-fg transition-colors hover:text-accent">
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
                  <td data-label={t.common.segment} className="max-md:hidden!">
                    <StatusBadge value={p.segment} label={labelFor(t, "segments", p.segment)} />
                  </td>
                  <td data-label={t.common.type} className="max-md:hidden!">{labelFor(t, "rooms", p.type)}</td>
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
                  <td data-label={t.common.updated} className="font-mono text-[12px] whitespace-nowrap text-muted max-md:hidden!">
                    {relTime(p.updatedAt, locale)}
                  </td>
                  <td data-label={t.common.status}>
                    <StatusBadge value={p.status} label={labelFor(t, "projectStatus", p.status)} />
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
