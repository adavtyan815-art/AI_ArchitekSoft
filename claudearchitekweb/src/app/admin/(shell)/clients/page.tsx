import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel } from "@/lib/admin-helpers";
import { cn, relativeTime } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/admin/shell";
import { Empty, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = { tab?: string; q?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
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

  const companies = Object.fromEntries(db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).all().map((c) => [c.id, c.name]));
  const projectCounts = Object.fromEntries(
    db.select({ clientId: schema.projects.clientId, c: sql<number>`count(*)` }).from(schema.projects).groupBy(schema.projects.clientId).all().map((r) => [r.clientId ?? "", r.c])
  );
  const kindCounts = Object.fromEntries(db.select({ kind: schema.clients.kind, c: sql<number>`count(*)` }).from(schema.clients).groupBy(schema.clients.kind).all().map((r) => [r.kind, r.c]));

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
        title="Clients"
        subtitle="Individual customers and the people you talk to inside partner companies."
        actions={
          <Link href="/admin/clients/new" className="btn-primary btn-sm">
            <Plus size={14} /> New client
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-line lg:border-0">
          {[
            { key: "individual", label: "Individuals", count: kindCounts.individual ?? 0 },
            { key: "contact", label: "Contacts", count: kindCounts.contact ?? 0 },
          ].map((t) => (
            <Link key={t.key} href={href({ tab: t.key })} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span>
            </Link>
          ))}
        </div>
        <form action="/admin/clients" className="flex items-center gap-2">
          {tab === "contact" ? <input type="hidden" name="tab" value="contact" /> : null}
          <Input name="q" defaultValue={q} placeholder="Search name, phone, city…" className="w-56 py-1.5" />
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty title="No clients match" text={q ? `Nothing found for “${q}”.` : "Clients are created automatically when a lead is converted."} action={<Link href="/admin/clients/new" className="btn-primary btn-sm">Add a client</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Name</th>
                {tab === "contact" ? <th>Company</th> : null}
                <th>Phone</th>
                <th>Telegram</th>
                <th>Lang</th>
                <th>City</th>
                <th className="text-right">Projects</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {clientLabel(c) || "—"}
                    </Link>
                    {c.position ? <div className="text-xs text-ink-500">{c.position}</div> : null}
                  </td>
                  {tab === "contact" ? (
                    <td>
                      {c.companyId ? (
                        <Link href={`/admin/companies/${c.companyId}`} className="text-ink-600 hover:text-brand-600">
                          {companies[c.companyId] ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td className="text-ink-600">{c.phone ?? "—"}</td>
                  <td className="text-ink-600">{c.telegram ?? "—"}</td>
                  <td className="uppercase text-ink-600">{c.language}</td>
                  <td className="text-ink-600">{c.city ?? "—"}</td>
                  <td className="text-right tabular-nums text-ink-600">{projectCounts[c.id] ?? 0}</td>
                  <td className="whitespace-nowrap text-ink-500">{relativeTime(c.createdAt)}</td>
                  <td>
                    <StatusBadge value={c.status} />
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
