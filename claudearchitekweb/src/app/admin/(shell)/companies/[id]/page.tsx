import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel } from "@/lib/admin-helpers";
import { formatDate, formatMoney, parseJson, relativeTime } from "@/lib/utils";
import { KV, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
import { Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ContactLinks } from "@/components/admin/crm/contact-links";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { ClientForm } from "@/components/admin/crm/client-form";
import { CompanyForm } from "@/components/admin/crm/company-form";
import { createClientAction, deleteCompanyAction, updateCompanyAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const company = db.select().from(schema.companies).where(eq(schema.companies.id, id)).get();
  if (!company) notFound();
  const contacts = db.select().from(schema.clients).where(eq(schema.clients.companyId, id)).orderBy(desc(schema.clients.createdAt)).all();
  const projects = db.select().from(schema.projects).where(eq(schema.projects.companyId, id)).orderBy(desc(schema.projects.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "company"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all().map((u) => [u.id, u.name]));
  const tags = parseJson<string[]>(company.tags, []);
  const quoted = projects.reduce((s, p) => s + (p.quoteAmount ?? 0), 0);
  const paid = projects.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  const active = projects.filter((p) => p.status === "active").length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Companies", href: "/admin/companies" }, { label: company.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {company.name}
            <StatusBadge value={company.status} />
            <Badge tone="neutral">{company.type}</Badge>
          </span>
        }
        subtitle={`${[company.city, company.country].filter(Boolean).join(", ")}${company.website ? ` · ${company.website.replace(/^https?:\/\//, "")}` : ""} · created ${relativeTime(company.createdAt)}`}
        actions={
          <Link href={`/admin/projects/new?companyId=${company.id}`} className="btn-primary btn-sm">
            <Plus size={14} /> New project
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={contacts.length} />
        <StatCard label="Projects" value={projects.length} hint={`${active} active`} />
        <StatCard label="Quoted total" value={formatMoney(quoted)} />
        <StatCard label="Paid total" value={formatMoney(paid)} tone={paid ? "success" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profile">
            <CompanyForm company={company} action={updateCompanyAction} />
          </Panel>

          <Panel title={`Contacts (${contacts.length})`}>
            {contacts.length === 0 ? (
              <div className="text-sm text-ink-500">No contact people yet.</div>
            ) : (
              <ul className="divide-y divide-line">
                {contacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/clients/${c.id}`} className="text-sm font-medium text-ink-900 hover:text-brand-600">
                        {clientLabel(c)}
                      </Link>
                      <div className="text-xs text-ink-500">{[c.position, c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={c.status} />
                      <ContactLinks phone={c.phone} telegram={c.telegram} whatsapp={c.whatsapp} email={c.email} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-4 rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink-900">Add a contact person</summary>
              <div className="mt-4">
                <ClientForm action={createClientAction} companies={[]} defaultCompanyId={company.id} lockCompany returnTo={`/admin/companies/${company.id}`} submitLabel="Add contact" compact />
              </div>
            </details>
          </Panel>

          <Panel title={`Projects (${projects.length})`}>
            {projects.length === 0 ? (
              <div className="text-sm text-ink-500">No projects yet.</div>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="table-admin">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Stage</th>
                      <th className="text-right">Quote</th>
                      <th className="text-right">Paid</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap font-mono text-xs text-ink-600">{p.code}</td>
                        <td>
                          <Link href={`/admin/projects/${p.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                            {p.title}
                          </Link>
                        </td>
                        <td>
                          <StatusBadge value={p.stage} />
                        </td>
                        <td className="text-right tabular-nums">{formatMoney(p.quoteAmount, p.currency)}</td>
                        <td className="text-right tabular-nums">{formatMoney(p.paidAmount, p.currency)}</td>
                        <td className="whitespace-nowrap text-ink-500">{relativeTime(p.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Timeline">
            <ActivityTimeline entityType="company" entityId={company.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Contact">
            <div className="space-y-1 text-sm">
              {company.phone ? <div>{company.phone}</div> : null}
              {company.email ? <div>{company.email}</div> : null}
              {company.website ? (
                <div>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-brand-600">
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              ) : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={company.phone} email={company.email} />
            </div>
          </Panel>

          <Panel title="Details">
            <KV label="Address">{company.address}</KV>
            <KV label="Tax ID">{company.taxId}</KV>
            <KV label="Source">{company.source}</KV>
            <KV label="Tags">{tags.length ? <span className="flex flex-wrap gap-1">{tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}</span> : "—"}</KV>
            <KV label="Created">{formatDate(company.createdAt, true)}</KV>
            <KV label="Updated">{formatDate(company.updatedAt, true)}</KV>
          </Panel>

          {company.notes ? (
            <Panel title="Notes">
              <div className="whitespace-pre-wrap text-sm text-ink-800">{company.notes}</div>
            </Panel>
          ) : null}

          <Panel title="Danger zone">
            <form action={deleteCompanyAction}>
              <input type="hidden" name="id" value={company.id} />
              <ConfirmButton message="Delete this company? Contacts and projects stay but lose the link." className="btn-ghost btn-sm text-danger-500">
                Delete company
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
