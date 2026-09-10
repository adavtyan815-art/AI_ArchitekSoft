import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRightCircle, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { LEAD_STATUSES, PROJECT_TYPES } from "@/lib/crm";
import { assetsByIds, relTime, thumbSrcSetFor, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatDate, formatMoney, parseJson } from "@/lib/utils";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Button, Input, Select } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ContactLinks } from "@/components/admin/crm/contact-links";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { LeadForm } from "@/components/admin/crm/lead-form";
import { convertLeadAction, deleteLeadAction, markLeadLostAction, updateLeadAction, updateLeadStatusAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.crm.leads;
  const { id } = await params;
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) notFound();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "lead"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .all()
      .map((u) => [u.id, u.name])
  );
  const details = parseJson<Record<string, unknown>>(lead.details, {});
  const utm = parseJson<Record<string, string>>(lead.utm, {});
  const files = assetsByIds(parseJson<string[]>(lead.files, []));
  const project = lead.projectId ? db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, stage: schema.projects.stage }).from(schema.projects).where(eq(schema.projects.id, lead.projectId)).get() : null;
  const client = lead.clientId ? db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).where(eq(schema.clients.id, lead.clientId)).get() : null;
  const company = lead.companyId ? db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, lead.companyId)).get() : null;

  const subtitle = [lead.companyName || null, labelFor(t, "leadSources", lead.source), L.createdAgo(relTime(lead.createdAt, locale)), lead.pagePath ? L.fromPage(lead.pagePath) : null].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        crumbs={[{ label: L.title, href: "/admin/leads" }, { label: lead.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {lead.name}
            <StatusBadge value={lead.segment} label={labelFor(t, "segments", lead.segment)} />
            <StatusBadge value={lead.status} label={labelFor(t, "leadStatus", lead.status)} />
          </span>
        }
        subtitle={subtitle}
        actions={
          <>
            <form action={updateLeadStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <AutoSubmitSelect name="status" defaultValue={lead.status} className="w-44 py-1.5 text-xs" aria-label={t.common.status}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelFor(t, "leadStatus", s)}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
            {project ? (
              <Link href={`/admin/projects/${project.id}`} className="btn-secondary btn-sm" title={L.openProject}>
                <ExternalLink size={14} /> {project.code}
              </Link>
            ) : (
              <form action={convertLeadAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={lead.id} />
                <Select name="projectType" defaultValue={PROJECT_TYPES.includes(lead.roomType as (typeof PROJECT_TYPES)[number]) ? lead.roomType! : "kitchen"} className="w-36 py-1.5 text-xs" aria-label={L.colRoom}>
                  {PROJECT_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {labelFor(t, "rooms", ty)}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm">
                  <ArrowRightCircle size={14} /> {L.convert}
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title={L.request}>
            <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              <KV label={t.crm.form.service}>{lead.service ? labelFor(t, "services", lead.service) : "—"}</KV>
              <KV label={L.colRoom}>{lead.roomType ? labelFor(t, "rooms", lead.roomType) : "—"}</KV>
              <KV label={L.budget}>{lead.budget ?? "—"}</KV>
              <KV label={L.estimatedValue}>{lead.estimatedValue ? formatMoney(lead.estimatedValue, lead.currency ?? "AMD") : "—"}</KV>
              <KV label={t.common.language}>{lead.language}</KV>
              <KV label={L.preferredChannel}>{lead.preferredChannel ?? "—"}</KV>
              <KV label={L.assignedTo}>{lead.assignedTo ?? "—"}</KV>
              <KV label={L.client}>{client ? <Link href={`/admin/clients/${client.id}`} className="text-accent">{`${client.firstName} ${client.lastName ?? ""}`.trim()}</Link> : "—"}</KV>
              <KV label={L.company}>
                {company ? (
                  <Link href={`/admin/companies/${company.id}`} className="text-accent">
                    {company.name}
                  </Link>
                ) : (
                  (lead.companyName ?? "—")
                )}
              </KV>
              {lead.lostReason ? <KV label={L.lostReason}>{lead.lostReason}</KV> : null}
            </div>
            {lead.message ? <div className="card-inset mt-3 p-4 text-sm whitespace-pre-wrap text-fg-2">{lead.message}</div> : null}
            {Object.keys(details).length ? (
              <div className="mt-4">
                <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{L.details}</div>
                <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(details).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5 text-sm">
                      <dt className="text-muted">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right text-fg">{renderValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {Object.keys(utm).length ? (
              <div className="mt-3 text-xs break-all text-muted">
                UTM:{" "}
                {Object.entries(utm)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(" · ")}
              </div>
            ) : null}
          </Panel>

          {files.length ? (
            <Panel title={L.files(files.length)}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {files.map((a) => {
                  const thumb = thumbUrlFor(a, 320);
                  return (
                    <a key={a.id} href={mediaUrl(a.relPath)} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-line bg-surface-2" title={a.originalName}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} srcSet={thumbSrcSetFor(a, 160)} sizes="120px" loading="lazy" alt={a.originalName} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-xs font-semibold text-muted uppercase">{a.originalName.split(".").pop()}</div>
                      )}
                      <div className="truncate px-2 py-1 text-[11px] text-muted">{a.originalName}</div>
                    </a>
                  );
                })}
              </div>
            </Panel>
          ) : null}

          <Panel title={L.edit}>
            <LeadForm lead={lead} action={updateLeadAction} />
          </Panel>

          <Panel title={t.crm.activity.title}>
            <ActivityTimeline entityType="lead" entityId={lead.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t.crm.contact.title}>
            <div className="space-y-1 text-sm break-all text-fg-2">
              {lead.phone ? <div>{lead.phone}</div> : null}
              {lead.telegram ? <div>{lead.telegram}</div> : null}
              {lead.email ? <div>{lead.email}</div> : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={lead.phone} telegram={lead.telegram} email={lead.email} />
            </div>
          </Panel>

          <Panel title={L.dates}>
            <KV label={t.common.created}>{formatDate(lead.createdAt, true)}</KV>
            <KV label={t.common.updated}>{formatDate(lead.updatedAt, true)}</KV>
          </Panel>

          {lead.status !== "lost" ? (
            <Panel title={L.markLost}>
              <form action={markLeadLostAction} className="space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <Input name="reason" placeholder={L.lostPlaceholder} maxLength={500} aria-label={L.lostReason} />
                <ConfirmButton message={L.markLostConfirm} className="btn-secondary btn-sm w-full">
                  {L.markLost}
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}

          <Panel title={L.danger}>
            <form action={deleteLeadAction}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmButton message={L.deleteConfirm} className="btn-ghost btn-sm text-danger">
                {L.delete}
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
