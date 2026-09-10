import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, companyOptions } from "@/lib/admin-helpers";
import { formatDate, formatMoney, parseJson, relativeTime } from "@/lib/utils";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ContactLinks } from "@/components/admin/crm/contact-links";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { ClientForm } from "@/components/admin/crm/client-form";
import { deleteClientAction, updateClientAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const client = db.select().from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (!client) notFound();
  const company = client.companyId ? db.select({ id: schema.companies.id, name: schema.companies.name, type: schema.companies.type }).from(schema.companies).where(eq(schema.companies.id, client.companyId)).get() : null;
  const projects = db.select().from(schema.projects).where(eq(schema.projects.clientId, id)).orderBy(desc(schema.projects.createdAt)).all();
  const leads = db.select().from(schema.leads).where(eq(schema.leads.clientId, id)).orderBy(desc(schema.leads.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "client"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all().map((u) => [u.id, u.name]));
  const tags = parseJson<string[]>(client.tags, []);
  const name = clientLabel(client);
  const quoted = projects.reduce((s, p) => s + (p.quoteAmount ?? 0), 0);
  const paid = projects.reduce((s, p) => s + (p.paidAmount ?? 0), 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Clients", href: "/admin/clients" }, { label: name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name}
            <StatusBadge value={client.status} />
            {client.kind === "contact" ? <Badge tone="neutral">contact</Badge> : null}
          </span>
        }
        subtitle={`${company ? `${company.name} · ` : ""}${client.position ? `${client.position} · ` : ""}created ${relativeTime(client.createdAt)}`}
        actions={
          <Link href={`/admin/projects/new?clientId=${client.id}${client.companyId ? `&companyId=${client.companyId}` : ""}`} className="btn-primary btn-sm">
            <Plus size={14} /> New project
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profile">
            <ClientForm client={client} action={updateClientAction} companies={companyOptions()} />
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
                        <td className="whitespace-nowrap text-ink-500">{relativeTime(p.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={`Leads (${leads.length})`}>
            {leads.length === 0 ? (
              <div className="text-sm text-ink-500">No leads linked to this client.</div>
            ) : (
              <ul className="divide-y divide-line">
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/leads/${l.id}`} className="min-w-0 text-sm font-medium text-ink-900 hover:text-brand-600">
                      {l.name}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        {l.source} · {relativeTime(l.createdAt)}
                      </span>
                    </Link>
                    <StatusBadge value={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Timeline">
            <ActivityTimeline entityType="client" entityId={client.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Contact">
            <div className="space-y-1 text-sm">
              {client.phone ? <div>{client.phone}</div> : null}
              {client.telegram ? <div>{client.telegram}</div> : null}
              {client.whatsapp ? <div>{client.whatsapp}</div> : null}
              {client.email ? <div>{client.email}</div> : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={client.phone} telegram={client.telegram} whatsapp={client.whatsapp} email={client.email} />
            </div>
          </Panel>

          <Panel title="Summary">
            <KV label="Company">{company ? <Link href={`/admin/companies/${company.id}`} className="text-brand-600">{company.name}</Link> : "—"}</KV>
            <KV label="City">{client.city}</KV>
            <KV label="Address">{client.address}</KV>
            <KV label="Source">{client.source}</KV>
            <KV label="Quoted total">{formatMoney(quoted)}</KV>
            <KV label="Paid total">{formatMoney(paid)}</KV>
            <KV label="Tags">{tags.length ? <span className="flex flex-wrap gap-1">{tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}</span> : "—"}</KV>
            <KV label="Created">{formatDate(client.createdAt, true)}</KV>
            <KV label="Updated">{formatDate(client.updatedAt, true)}</KV>
          </Panel>

          {client.notes ? (
            <Panel title="Notes">
              <div className="whitespace-pre-wrap text-sm text-ink-800">{client.notes}</div>
            </Panel>
          ) : null}

          <Panel title="Danger zone">
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <ConfirmButton message="Delete this client? Projects stay but lose the link." className="btn-ghost btn-sm text-danger-500">
                Delete client
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
