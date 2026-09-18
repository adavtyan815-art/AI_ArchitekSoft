import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, companyOptions, fmtAdminDate, formatMoneyTotals, relTime, sumByCurrency } from "@/lib/admin-helpers";
import { RelTime } from "@/components/admin/rel-time";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatMoney, parseJson } from "@/lib/utils";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Badge } from "@/components/ui";
import { Notice, noticeFrom } from "@/components/admin/notice";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ContactLinks } from "@/components/admin/crm/contact-links";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { ClientForm } from "@/components/admin/crm/client-form";
import { OpenTasksPanel, openTasksFor } from "@/app/admin/(shell)/tasks/open-tasks-panel";
import { deleteClientAction, updateClientAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function ClientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const C = t.crm.clients;
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const client = db.select().from(schema.clients).where(eq(schema.clients.id, id)).get();
  if (!client) notFound();
  const company = client.companyId ? db.select({ id: schema.companies.id, name: schema.companies.name, type: schema.companies.type }).from(schema.companies).where(eq(schema.companies.id, client.companyId)).get() : null;
  const projects = db.select().from(schema.projects).where(eq(schema.projects.clientId, id)).orderBy(desc(schema.projects.createdAt)).all();
  const leads = db.select().from(schema.leads).where(eq(schema.leads.clientId, id)).orderBy(desc(schema.leads.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "client"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .all()
      .map((u) => [u.id, u.name])
  );
  // Tasks linked to this client are otherwise visible only on /admin/tasks.
  const openTasks = openTasksFor("client", id);
  const tags = parseJson<string[]>(client.tags, []);
  const name = clientLabel(client);
  // One figure per currency: a USD quote is never added to an AMD one.
  const quoted = formatMoneyTotals(sumByCurrency(projects, (p) => p.quoteAmount, (p) => p.currency));
  const paid = formatMoneyTotals(sumByCurrency(projects, (p) => p.paidAmount, (p) => p.currency));

  const subtitle = [company?.name ?? null, client.position ?? null, t.crm.leads.createdAgo(relTime(client.createdAt, locale))].filter(Boolean).join(" · ");

  return (
    <>
      <Notice {...noticeFrom(sp)} />
      <PageHeader
        crumbs={[{ label: C.title, href: "/admin/clients" }, { label: name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name}
            <StatusBadge value={client.status} label={labelFor(t, "clientStatus", client.status)} />
            {client.kind === "contact" ? <Badge tone="neutral">{C.contactBadge}</Badge> : null}
          </span>
        }
        subtitle={subtitle}
        actions={
          <Link href={`/admin/projects/new?clientId=${client.id}${client.companyId ? `&companyId=${client.companyId}` : ""}`} className="btn-primary btn-sm">
            <Plus size={14} /> {C.newProject}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-0">
        <div className="space-y-4 lg:col-span-2 lg:pr-6">
          <Panel title={C.profile}>
            <ClientForm client={client} action={updateClientAction} companies={companyOptions()} />
          </Panel>

          <Panel title={C.projects(projects.length)} bodyClassName={projects.length ? "p-0 sm:p-0" : undefined}>
            {projects.length === 0 ? (
              <div className="text-sm text-muted">{C.noProjects}</div>
            ) : (
              <div className="overflow-x-auto max-md:p-3">
                <table className="table-admin table-responsive">
                  <thead>
                    <tr>
                      <th>{t.projects.colCode}</th>
                      <th>{t.projects.colTitle}</th>
                      <th>{t.common.stage}</th>
                      <th className="num">{t.projects.quote}</th>
                      <th>{t.common.updated}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td data-label={t.projects.colCode} className="font-mono text-xs whitespace-nowrap text-muted">
                          {p.code}
                        </td>
                        <td data-label={t.projects.colTitle}>
                          <Link href={`/admin/projects/${p.id}`} className="font-semibold text-fg transition-colors hover:text-accent">
                            {p.title}
                          </Link>
                        </td>
                        <td data-label={t.common.stage}>
                          <StatusBadge value={p.stage} label={labelFor(t, "projectStage", p.stage)} />
                        </td>
                        <td data-label={t.projects.quote} className="num">
                          {formatMoney(p.quoteAmount, p.currency)}
                        </td>
                        <td data-label={t.common.updated} className="font-mono text-[12px] whitespace-nowrap text-muted">
                          <RelTime iso={p.updatedAt} locale={locale} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={C.leads(leads.length)}>
            {leads.length === 0 ? (
              <div className="text-sm text-muted">{C.noLeads}</div>
            ) : (
              <ul className="divide-y divide-line">
                {leads.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <Link href={`/admin/leads/${l.id}`} className="flex min-h-10 min-w-0 flex-wrap items-center gap-x-2 text-sm font-medium [overflow-wrap:anywhere] text-fg transition-colors hover:text-accent sm:min-h-0">
                      {l.name}
                      <span className="text-xs font-normal text-muted">
                        {labelFor(t, "leadSources", l.source)} · <RelTime iso={l.createdAt} locale={locale} />
                      </span>
                    </Link>
                    <StatusBadge value={l.status} label={labelFor(t, "leadStatus", l.status)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t.crm.activity.title}>
            <ActivityTimeline entityType="client" entityId={client.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4 lg:border-l lg:border-line lg:pl-6">
          <Panel title={t.crm.contact.title}>
            <div className="space-y-1 text-sm break-all text-fg-2">
              {client.phone ? <div>{client.phone}</div> : null}
              {client.telegram ? <div>{client.telegram}</div> : null}
              {client.whatsapp ? <div>{client.whatsapp}</div> : null}
              {client.email ? <div>{client.email}</div> : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={client.phone} telegram={client.telegram} whatsapp={client.whatsapp} email={client.email} />
            </div>
          </Panel>

          <OpenTasksPanel tasks={openTasks} t={t} locale={locale} />

          <Panel title={C.summary}>
            <KV label={t.crm.form.company}>
              {company ? (
                <Link href={`/admin/companies/${company.id}`} className="text-accent">
                  {company.name}
                </Link>
              ) : (
                "—"
              )}
            </KV>
            <KV label={t.common.city}>{client.city ?? "—"}</KV>
            <KV label={t.common.address}>{client.address ?? "—"}</KV>
            <KV label={t.common.source}>{client.source ? labelFor(t, "leadSources", client.source) : "—"}</KV>
            <KV label={C.quotedTotal}>{quoted}</KV>
            <KV label={C.paidTotal}>{paid}</KV>
            <KV label={t.common.tags}>
              {tags.length ? (
                <span className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ) : (
                "—"
              )}
            </KV>
            <KV label={t.common.created}>{fmtAdminDate(client.createdAt, locale, true)}</KV>
            <KV label={t.common.updated}>{fmtAdminDate(client.updatedAt, locale, true)}</KV>
          </Panel>

          {client.notes ? (
            <Panel title={t.common.notes}>
              <div className="text-sm whitespace-pre-wrap text-fg-2">{client.notes}</div>
            </Panel>
          ) : null}

          <Panel title={t.crm.leads.danger}>
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <ConfirmButton message={C.deleteConfirm} className="btn-ghost btn-sm text-danger">
                {C.delete}
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
