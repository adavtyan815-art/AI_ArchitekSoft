import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRightCircle, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { LEAD_STATUSES, PROJECT_TYPES } from "@/lib/crm";
import { assetsByIds, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatMoney, parseJson, relativeTime } from "@/lib/utils";
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
  const { id } = await params;
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) notFound();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "lead"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all().map((u) => [u.id, u.name]));
  const details = parseJson<Record<string, unknown>>(lead.details, {});
  const utm = parseJson<Record<string, string>>(lead.utm, {});
  const files = assetsByIds(parseJson<string[]>(lead.files, []));
  const project = lead.projectId ? db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, stage: schema.projects.stage }).from(schema.projects).where(eq(schema.projects.id, lead.projectId)).get() : null;
  const client = lead.clientId ? db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).where(eq(schema.clients.id, lead.clientId)).get() : null;
  const company = lead.companyId ? db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, lead.companyId)).get() : null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Leads", href: "/admin/leads" }, { label: lead.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {lead.name}
            <StatusBadge value={lead.segment} />
            <StatusBadge value={lead.status} />
          </span>
        }
        subtitle={`${lead.companyName ? `${lead.companyName} · ` : ""}${lead.source} · created ${relativeTime(lead.createdAt)}${lead.pagePath ? ` · from ${lead.pagePath}` : ""}`}
        actions={
          <>
            <form action={updateLeadStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <AutoSubmitSelect name="status" defaultValue={lead.status} className="w-40 py-1.5 text-xs">
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
            {project ? (
              <Link href={`/admin/projects/${project.id}`} className="btn-secondary btn-sm">
                <ExternalLink size={14} /> {project.code}
              </Link>
            ) : (
              <form action={convertLeadAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={lead.id} />
                <Select name="projectType" defaultValue={PROJECT_TYPES.includes(lead.roomType as (typeof PROJECT_TYPES)[number]) ? lead.roomType! : "kitchen"} className="w-32 py-1.5 text-xs">
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm">
                  <ArrowRightCircle size={14} /> Convert to project
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Request">
            <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              <KV label="Service">{lead.service?.replace(/_/g, " ")}</KV>
              <KV label="Room">{lead.roomType}</KV>
              <KV label="Budget">{lead.budget}</KV>
              <KV label="Estimated value">{lead.estimatedValue ? formatMoney(lead.estimatedValue, lead.currency ?? "AMD") : "—"}</KV>
              <KV label="Language">{lead.language}</KV>
              <KV label="Preferred channel">{lead.preferredChannel}</KV>
              <KV label="Assigned to">{lead.assignedTo}</KV>
              <KV label="Client">{client ? <Link href={`/admin/clients/${client.id}`} className="text-brand-600">{`${client.firstName} ${client.lastName ?? ""}`.trim()}</Link> : "—"}</KV>
              <KV label="Company">{company ? <Link href={`/admin/companies/${company.id}`} className="text-brand-600">{company.name}</Link> : lead.companyName}</KV>
              {lead.lostReason ? <KV label="Lost reason">{lead.lostReason}</KV> : null}
            </div>
            {lead.message ? <div className="mt-3 whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm text-ink-800">{lead.message}</div> : null}
            {Object.keys(details).length ? (
              <div className="mt-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Details</div>
                <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(details).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5 text-sm">
                      <dt className="text-ink-500">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right text-ink-900">{renderValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {Object.keys(utm).length ? (
              <div className="mt-3 text-xs text-ink-500">
                UTM: {Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(" · ")}
              </div>
            ) : null}
          </Panel>

          {files.length ? (
            <Panel title={`Attached files (${files.length})`}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {files.map((a) => {
                  const thumb = thumbUrlFor(a);
                  return (
                    <a key={a.id} href={mediaUrl(a.relPath)} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-line bg-ink-50" title={a.originalName}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={a.originalName} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-xs font-semibold uppercase text-ink-500">{a.originalName.split(".").pop()}</div>
                      )}
                      <div className="truncate px-2 py-1 text-[11px] text-ink-600">{a.originalName}</div>
                    </a>
                  );
                })}
              </div>
            </Panel>
          ) : null}

          <Panel title="Edit lead">
            <LeadForm lead={lead} action={updateLeadAction} />
          </Panel>

          <Panel title="Timeline">
            <ActivityTimeline entityType="lead" entityId={lead.id} items={activities} users={users} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Contact">
            <div className="space-y-1 text-sm">
              {lead.phone ? <div>{lead.phone}</div> : null}
              {lead.telegram ? <div>{lead.telegram}</div> : null}
              {lead.email ? <div>{lead.email}</div> : null}
            </div>
            <div className="mt-3">
              <ContactLinks phone={lead.phone} telegram={lead.telegram} email={lead.email} />
            </div>
          </Panel>

          <Panel title="Dates">
            <KV label="Created">{formatDate(lead.createdAt, true)}</KV>
            <KV label="Updated">{formatDate(lead.updatedAt, true)}</KV>
          </Panel>

          {lead.status !== "lost" ? (
            <Panel title="Mark lost">
              <form action={markLeadLostAction} className="space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <Input name="reason" placeholder="Reason (price, timing, competitor…)" maxLength={500} />
                <ConfirmButton message="Mark this lead as lost?" className="btn-secondary btn-sm w-full">
                  Mark lost
                </ConfirmButton>
              </form>
            </Panel>
          ) : null}

          <Panel title="Danger zone">
            <form action={deleteLeadAction}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmButton message="Delete this lead permanently? Activities are kept in the log." className="btn-ghost btn-sm text-danger-500">
                Delete lead
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
