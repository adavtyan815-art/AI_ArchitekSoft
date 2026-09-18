import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRightCircle, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { LEAD_STATUSES, PROJECT_TYPES } from "@/lib/crm";
import { assetsByIds, fmtAdminDate, leadCode, relTime, thumbSrcSetFor, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { getAdminDict, labelFor, local, type AdminDict } from "@/lib/i18n/admin";
import { formatMoney, parseJson } from "@/lib/utils";
import { KV, PageHeader, Panel, StatusBadge } from "@/components/admin/shell";
import { Button, Input, Select } from "@/components/ui";
import { Notice, noticeFrom } from "@/components/admin/notice";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ContactLinks } from "@/components/admin/crm/contact-links";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { LeadForm } from "@/components/admin/crm/lead-form";
import { OpenTasksPanel, openTasksFor } from "@/app/admin/(shell)/tasks/open-tasks-panel";
import { convertLeadAction, deleteLeadAction, markLeadLostAction, updateLeadAction, updateLeadStatusAction } from "@/app/admin/actions/crm-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

/** Label for a wizard answer key: the dictionary name, else the raw key split into words. */
function detailLabel(t: AdminDict, key: string): string {
  const g = t.leadDetailKeys as Record<string, string | undefined>;
  return g[key] ?? key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/**
 * The site wizard stores its answers as codes ("b2", "v2", "studio") and dimensions as an object.
 * Show the same wording the visitor saw; an empty answer returns "" so the row can be dropped.
 */
function detailValue(t: AdminDict, key: string, v: unknown, unit: string): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (key === "dims") {
      const parts = [o.width, o.depth, o.height].map((x) => (x === null || x === undefined || x === "" ? null : String(x))).filter(Boolean) as string[];
      return parts.length ? `${parts.join(" × ")} ${unit}` : "";
    }
    return Object.entries(o)
      .map(([k, val]) => {
        const s = detailValue(t, k, val, unit);
        return s ? `${detailLabel(t, k)}: ${s}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }
  const s = String(v);
  if (key === "volume") return labelFor(t, "leadVolumes", s);
  if (key === "companyType") return labelFor(t, "companyTypes", s);
  if (key === "budget") return labelFor(t, "leadBudgets", s);
  if (key === "service") return labelFor(t, "services", s);
  return s;
}

export default async function LeadDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const L = t.crm.leads;
  const X = local({ hy: { unit: "մ" }, en: { unit: "m" } }, locale);
  const { id } = await params;
  const sp = await searchParams;
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
  const detailRows = Object.entries(details)
    .map(([k, v]) => ({ key: k, label: detailLabel(t, k), value: detailValue(t, k, v, X.unit) }))
    .filter((r) => r.value);
  const utm = parseJson<Record<string, string>>(lead.utm, {});
  const files = assetsByIds(parseJson<string[]>(lead.files, []));
  const project = lead.projectId ? db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, stage: schema.projects.stage }).from(schema.projects).where(eq(schema.projects.id, lead.projectId)).get() : null;
  const client = lead.clientId ? db.select({ id: schema.clients.id, firstName: schema.clients.firstName, lastName: schema.clients.lastName }).from(schema.clients).where(eq(schema.clients.id, lead.clientId)).get() : null;
  const company = lead.companyId ? db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, lead.companyId)).get() : null;
  // Tasks linked to this lead are otherwise visible only on /admin/tasks.
  const openTasks = openTasksFor("lead", id);

  const subtitle = [lead.companyName || null, labelFor(t, "leadSources", lead.source), L.createdAgo(relTime(lead.createdAt, locale)), lead.pagePath ? L.fromPage(lead.pagePath) : null].filter(Boolean).join(" · ");

  return (
    <>
      <Notice {...noticeFrom(sp)} />
      <PageHeader
        crumbs={[{ label: L.title, href: "/admin/leads" }, { label: lead.name }]}
        title={
          // [overflow-wrap:anywhere] on the name: a 120-character word must wrap, not widen the page
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="[overflow-wrap:anywhere]">{lead.name}</span>
            <StatusBadge value={lead.segment} label={labelFor(t, "segments", lead.segment)} />
            <StatusBadge value={lead.status} label={labelFor(t, "leadStatus", lead.status)} />
          </span>
        }
        subtitle={<span className="block [overflow-wrap:anywhere]">{subtitle}</span>}
        actions={
          <>
            <form action={updateLeadStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <AutoSubmitSelect name="status" defaultValue={lead.status} className="h-10 w-44 text-[13px]" aria-label={t.common.status}>
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
                <Select name="projectType" defaultValue={PROJECT_TYPES.includes(lead.roomType as (typeof PROJECT_TYPES)[number]) ? lead.roomType! : "kitchen"} className="h-10 w-36 text-[13px]" aria-label={L.colRoom}>
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

      {/* On a phone the Contact panel is at the very bottom of a long page; calling is the first thing staff do. */}
      <div className="mb-5 lg:hidden">
        <ContactLinks phone={lead.phone} telegram={lead.telegram} email={lead.email} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-0">
        <div className="min-w-0 space-y-4 lg:col-span-2 lg:pr-6">
          <Panel title={L.request}>
            <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              <KV label={t.crm.form.service}>{lead.service ? labelFor(t, "services", lead.service) : "—"}</KV>
              <KV label={L.colRoom}>{lead.roomType ? labelFor(t, "rooms", lead.roomType) : "—"}</KV>
              <KV label={L.budget}>{lead.budget ? labelFor(t, "leadBudgets", lead.budget) : "—"}</KV>
              <KV label={L.estimatedValue}>{lead.estimatedValue ? formatMoney(lead.estimatedValue, lead.currency ?? "AMD") : "—"}</KV>
              <KV label={t.common.language}>{labelFor(t, "languages", lead.language)}</KV>
              <KV label={L.preferredChannel}>{lead.preferredChannel ? labelFor(t, "channels", lead.preferredChannel) : "—"}</KV>
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
              {/* the number the visitor was given on the site — staff can also search for it */}
              <KV label={L.requestNo}>
                <span className="font-mono tracking-[0.08em]" title={L.requestNoHint}>
                  #{leadCode(lead.id)}
                </span>
              </KV>
              {lead.lostReason ? <KV label={L.lostReason}>{lead.lostReason}</KV> : null}
            </div>
            {lead.message ? <div className="mt-3 rounded-md border border-line bg-surface-2 p-4 text-[13.5px] [overflow-wrap:anywhere] whitespace-pre-wrap text-fg-2">{lead.message}</div> : null}
            {detailRows.length ? (
              <div className="mt-4">
                <div className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.details}</div>
                <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {detailRows.map((r) => (
                    <div key={r.key} className="flex justify-between gap-3 border-b border-line py-1.5 text-sm">
                      <dt className="text-muted">{r.label}</dt>
                      <dd className="min-w-0 text-right [overflow-wrap:anywhere] text-fg">{r.value}</dd>
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

        <div className="min-w-0 space-y-4 lg:border-l lg:border-line lg:pl-6">
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

          <OpenTasksPanel tasks={openTasks} t={t} locale={locale} />

          <Panel title={L.dates}>
            <KV label={t.common.created}>{fmtAdminDate(lead.createdAt, locale, true)}</KV>
            <KV label={t.common.updated}>{fmtAdminDate(lead.updatedAt, locale, true)}</KV>
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
