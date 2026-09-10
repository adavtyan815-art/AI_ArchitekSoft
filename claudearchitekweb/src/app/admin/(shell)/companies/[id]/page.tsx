import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { clientLabel, relTime } from "@/lib/admin-helpers";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatDate, formatMoney, parseJson } from "@/lib/utils";
import { KV, PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
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
  const { t, locale } = await getAdminDict();
  const K = t.crm.companies;
  const { id } = await params;
  const db = getDb();
  const company = db.select().from(schema.companies).where(eq(schema.companies.id, id)).get();
  if (!company) notFound();
  const contacts = db.select().from(schema.clients).where(eq(schema.clients.companyId, id)).orderBy(desc(schema.clients.createdAt)).all();
  const projects = db.select().from(schema.projects).where(eq(schema.projects.companyId, id)).orderBy(desc(schema.projects.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "company"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .all()
      .map((u) => [u.id, u.name])
  );
  const tags = parseJson<string[]>(company.tags, []);
  const quoted = projects.reduce((s, p) => s + (p.quoteAmount ?? 0), 0);
  const paid = projects.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  const active = projects.filter((p) => p.status === "active").length;

  const subtitle = [[company.city, company.country].filter(Boolean).join(", ") || null, company.website ? company.website.replace(/^https?:\/\//, "") : null, t.crm.leads.createdAgo(relTime(company.createdAt, locale))].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        crumbs={[{ label: K.title, href: "/admin/companies" }, { label: company.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {company.name}
            <StatusBadge value={company.status} label={labelFor(t, "companyStatus", company.status)} />
            <Badge tone="neutral">{labelFor(t, "companyTypes", company.type)}</Badge>
          </span>
        }
        subtitle={subtitle}
        actions={
          <Link href={`/admin/projects/new?companyId=${company.id}`} className="btn-primary btn-sm">
            <Plus size={14} /> {t.crm.clients.newProject}
          </Link>
        }
      />

      <SpecStrip className="mb-5">
        <StatCard label={K.colContacts} value={contacts.length} />
        <StatCard label={K.colProjects} value={projects.length} hint={`${active} ${t.common.active.toLowerCase()}`} />
        <StatCard label={K.quotedTotal} value={formatMoney(quoted)} />
        <StatCard label={K.paidTotal} value={formatMoney(paid)} tone={paid ? "success" : undefined} />
      </SpecStrip>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-0">
        <div className="space-y-4 lg:col-span-2 lg:pr-6">
          <Panel title={t.crm.clients.profile}>
            <CompanyForm company={company} action={updateCompanyAction} />
          </Panel>

          <Panel title={K.contacts(contacts.length)}>
            {contacts.length === 0 ? (
              <div className="text-sm text-muted">{K.noContacts}</div>
            ) : (
              <ul className="divide-y divide-line">
                {contacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/clients/${c.id}`} className="text-sm font-medium text-fg transition-colors hover:text-accent">
                        {clientLabel(c)}
                      </Link>
                      <div className="text-xs text-muted">{[c.position, c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={c.status} label={labelFor(t, "clientStatus", c.status)} />
                      <ContactLinks phone={c.phone} telegram={c.telegram} whatsapp={c.whatsapp} email={c.email} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-4 rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold text-fg">{K.addContact}</summary>
              <div className="mt-4">
                <ClientForm action={createClientAction} companies={[]} defaultCompanyId={company.id} lockCompany returnTo={`/admin/companies/${company.id}`} submitLabel={K.addContactSubmit} compact />
              </div>
            </details>
          </Panel>

          <Panel title={K.projects(projects.length)} bodyClassName={projects.length ? "p-0 sm:p-0" : undefined}>
            {projects.length === 0 ? (
              <div className="text-sm text-muted">{K.noProjects}</div>
            ) : (
              <div className="overflow-x-auto max-md:p-3">
                <table className="table-admin table-responsive">
                  <thead>
                    <tr>
                      <th>{t.projects.colCode}</th>
                      <th>{t.projects.colTitle}</th>
                      <th>{t.common.stage}</th>
                      <th className="num">{t.projects.quote}</th>
                      <th className="num">{t.projects.paid}</th>
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
                        <td data-label={t.projects.paid} className="num">
                          {formatMoney(p.paidAmount, p.currency)}
                        </td>
                        <td data-label={t.common.updated} className="font-mono text-[12px] whitespace-nowrap text-muted">
                          {relTime(p.updatedAt, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={t.crm.activity.title}>
            <ActivityTimeline entityType="company" entityId={company.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4 lg:border-l lg:border-line lg:pl-6">
          <Panel title={t.crm.contact.title}>
            <div className="space-y-1 text-sm break-all text-fg-2">
              {company.phone ? <div>{company.phone}</div> : null}
              {company.email ? <div>{company.email}</div> : null}
              {company.website ? (
                <div>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent">
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              ) : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={company.phone} email={company.email} />
            </div>
          </Panel>

          <Panel title={K.details}>
            <KV label={t.common.address}>{company.address ?? "—"}</KV>
            <KV label={t.crm.form.taxId}>{company.taxId ?? "—"}</KV>
            <KV label={t.common.source}>{company.source ? labelFor(t, "leadSources", company.source) : "—"}</KV>
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
            <KV label={t.common.created}>{formatDate(company.createdAt, true)}</KV>
            <KV label={t.common.updated}>{formatDate(company.updatedAt, true)}</KV>
          </Panel>

          {company.notes ? (
            <Panel title={t.common.notes}>
              <div className="text-sm whitespace-pre-wrap text-fg-2">{company.notes}</div>
            </Panel>
          ) : null}

          <Panel title={t.crm.leads.danger}>
            <form action={deleteCompanyAction}>
              <input type="hidden" name="id" value={company.id} />
              <ConfirmButton message={K.deleteConfirm} className="btn-ghost btn-sm text-danger">
                {K.delete}
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
