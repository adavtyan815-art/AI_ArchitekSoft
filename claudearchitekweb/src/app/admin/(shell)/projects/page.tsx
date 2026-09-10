import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES } from "@/lib/crm";
import { clientLabel } from "@/lib/admin-helpers";
import { cn, formatDate, formatMoney, relativeTime } from "@/lib/utils";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/shell";
import { Empty, Input, Select } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "cancelled"] as const;

type Search = { stage?: string; status?: string; segment?: string; type?: string; q?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
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

  const clients = Object.fromEntries(db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).all().map((c) => [c.id, clientLabel(c)]));
  const companies = Object.fromEntries(db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all().map((c) => [c.id, c.name]));
  const stageCounts = Object.fromEntries(db.select({ stage: schema.projects.stage, c: sql<number>`count(*)` }).from(schema.projects).groupBy(schema.projects.stage).all().map((r) => [r.stage, r.c]));
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

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every kitchen, wardrobe and interior job from request to handover."
        actions={
          <Link href="/admin/projects/new" className="btn-primary btn-sm">
            <Plus size={14} /> New project
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Shown" value={rows.length} hint={`${totalAll} total`} />
        <StatCard label="Quoted (filtered)" value={formatMoney(pipeline)} />
        <StatCard label="Paid (filtered)" value={formatMoney(paid)} tone={paid ? "success" : undefined} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {[{ key: "all", label: "All", count: totalAll }, ...PROJECT_STAGES.map((s) => ({ key: s, label: s.replace(/_/g, " "), count: stageCounts[s] ?? 0 }))].map((t) => (
          <Link key={t.key} href={href({ stage: t.key })} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium capitalize", stage === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
            {t.label}
            <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span>
          </Link>
        ))}
      </div>

      <form action="/admin/projects" className="mb-4 flex flex-wrap items-center gap-2">
        {stage !== "all" ? <input type="hidden" name="stage" value={stage} /> : null}
        <Select name="status" defaultValue={status} className="w-36 py-1.5 text-sm">
          <option value="all">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <Select name="segment" defaultValue={segment} className="w-32 py-1.5 text-sm">
          <option value="all">Any segment</option>
          <option value="b2b">B2B</option>
          <option value="b2c">B2C</option>
        </Select>
        <Select name="type" defaultValue={type} className="w-36 py-1.5 text-sm">
          <option value="all">Any type</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Input name="q" defaultValue={q} placeholder="Search code or title…" className="w-56 py-1.5" />
        <button type="submit" className="btn-secondary btn-sm">
          Apply
        </button>
        <Link href="/admin/projects" className="btn-ghost btn-sm">
          Reset
        </Link>
      </form>

      {rows.length === 0 ? (
        <Empty title="No projects match" text={q ? `Nothing found for “${q}”.` : "Convert a lead or create a project manually."} action={<Link href="/admin/projects/new" className="btn-primary btn-sm">New project</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Client / company</th>
                <th>Segment</th>
                <th>Type</th>
                <th>Stage</th>
                <th className="text-right">Quote / paid</th>
                <th>Deadline</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap font-mono text-xs text-ink-600">{p.code}</td>
                  <td>
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {p.title}
                    </Link>
                  </td>
                  <td className="text-xs text-ink-600">
                    {p.clientId ? (
                      <Link href={`/admin/clients/${p.clientId}`} className="block hover:text-brand-600">
                        {clients[p.clientId] ?? "—"}
                      </Link>
                    ) : null}
                    {p.companyId ? (
                      <Link href={`/admin/companies/${p.companyId}`} className="block hover:text-brand-600">
                        {companies[p.companyId] ?? "—"}
                      </Link>
                    ) : null}
                    {!p.clientId && !p.companyId ? "—" : null}
                  </td>
                  <td>
                    <StatusBadge value={p.segment} />
                  </td>
                  <td className="text-ink-600">{p.type}</td>
                  <td>
                    <StatusBadge value={p.stage} />
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    <div>{formatMoney(p.quoteAmount, p.currency)}</div>
                    {p.paidAmount ? <div className="text-xs text-success-500">{formatMoney(p.paidAmount, p.currency)}</div> : null}
                  </td>
                  <td className="whitespace-nowrap text-ink-600">{p.deadline ? formatDate(p.deadline) : "—"}</td>
                  <td className="whitespace-nowrap text-ink-500">{relativeTime(p.updatedAt)}</td>
                  <td>
                    <StatusBadge value={p.status} />
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
