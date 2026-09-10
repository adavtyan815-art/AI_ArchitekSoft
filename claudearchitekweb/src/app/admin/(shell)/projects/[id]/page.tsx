import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ExternalLink, MessageCircle, RefreshCw, Send, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES, shareUrl } from "@/lib/crm";
import { clientLabel, clientOptions, companyOptions, relTime } from "@/lib/admin-helpers";
import { liveConfigured } from "@/lib/live";
import { env } from "@/lib/env";
import { getAdminDict, labelFor, local } from "@/lib/i18n/admin";
import { formatDate, formatMoney, parseJson } from "@/lib/utils";
import { FormActions, KV, PageHeader, Panel, SpecStrip, StatCard, StatusBadge, Tabs } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/admin/auto-submit-select";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CopyButton } from "@/components/admin/copy-button";
import { ActivityTimeline } from "@/components/admin/crm/activity-timeline";
import { UploadZone } from "@/components/admin/media/upload-zone";
import { ProjectMediaGrid } from "@/components/admin/projects/project-media-grid";
import {
  createLiveLinkAction,
  createShareLinkAction,
  deleteProjectAction,
  deleteShareLinkAction,
  regenerateShareTokenAction,
  setProjectStageAction,
  toggleFeedbackResolvedAction,
  toggleShareLinkAction,
  updateDeliverablesAction,
  updateProjectAction,
  sendShareLinkTelegramAction,
} from "@/app/admin/actions/project-actions";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "cancelled"];
const CURRENCIES = ["AMD", "USD", "EUR", "RUB"];
const TAB_KEYS = ["", "media", "client", "deliverables", "feedback", "timeline"];

type Room = { width?: number | null; depth?: number | null; height?: number | null; notes?: string | null };

export default async function ProjectDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireUser();
  const { t, locale } = await getAdminDict();
  const P = t.projects;
  const f = t.crm.form;
  const { id } = await params;
  const sp = await searchParams;
  const tab = TAB_KEYS.includes(sp.tab ?? "") ? (sp.tab ?? "") : "";
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!project) notFound();

  const client = project.clientId ? db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() : null;
  const company = project.companyId ? db.select().from(schema.companies).where(eq(schema.companies.id, project.companyId)).get() : null;
  const assets = db.select().from(schema.assets).where(eq(schema.assets.projectId, id)).orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt)).all();
  const links = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.projectId, id)).orderBy(desc(schema.shareLinks.createdAt)).all();
  const feedback = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.projectId, id)).orderBy(desc(schema.clientFeedback.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "project"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .all()
      .map((u) => [u.id, u.name])
  );
  const events = links.length
    ? db
        .select()
        .from(schema.shareEvents)
        .where(
          inArray(
            schema.shareEvents.shareLinkId,
            links.map((l) => l.id)
          )
        )
        .orderBy(desc(schema.shareEvents.createdAt))
        .limit(50)
        .all()
    : [];
  const linkTitles = Object.fromEntries(links.map((l) => [l.id, l.slug]));
  const room = parseJson<Room>(project.room, {});
  const openFeedback = feedback.filter((fb) => !fb.resolved).length;

  const tabs = [
    { key: "", label: P.tabs.overview },
    { key: "media", label: P.tabs.media, count: assets.length },
    { key: "client", label: P.tabs.client, count: links.length },
    { key: "deliverables", label: P.tabs.deliverables },
    { key: "feedback", label: P.tabs.feedback, count: feedback.length },
    { key: "timeline", label: P.tabs.timeline, count: activities.length },
  ];

  const subtitle = [labelFor(t, "rooms", project.type), client ? clientLabel(client) : null, company ? company.name : null, !client && !company ? P.noClient : null, P.updatedAgo(relTime(project.updatedAt, locale))].filter(Boolean).join(" · ");

  const uploadLabels = { label: t.media.uploadLabel, hint: t.media.uploadHint, busy: t.media.uploading, uploaded: t.media.uploaded, failed: t.media.uploadFailed };

  /** What the client did on their page — only these few event kinds are recorded. */
  const eventNames: Record<string, string> = local(
    {
      hy: { view: "Բացել է էջը", open_viewer: "Բացել է Web Viewer-ը", web_viewer: "Web Viewer", approve: "Հաստատել է", change_request: "Փոփոխություն է ուզում", question: "Հարց է տվել" },
      en: { view: "Opened the page", open_viewer: "Opened the Web Viewer", web_viewer: "Web Viewer", approve: "Approved", change_request: "Asked for a change", question: "Asked a question" },
    },
    locale
  );

  /** How a client page link was handed over. */
  const sentViaNames: Record<string, string> = local(
    {
      hy: { copy: "պատճենում", telegram: "Telegram", whatsapp: "WhatsApp", email: "էլ. փոստ" },
      en: { copy: "copy", telegram: "Telegram", whatsapp: "WhatsApp", email: "email" },
    },
    locale
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: P.title, href: "/admin/projects" }, { label: project.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base text-muted">{project.code}</span>
            {project.title}
            <StatusBadge value={project.segment} label={labelFor(t, "segments", project.segment)} />
            <StatusBadge value={project.status} label={labelFor(t, "projectStatus", project.status)} />
            {project.isPortfolio ? <Badge tone="dark">{P.portfolioBadge}</Badge> : null}
          </span>
        }
        subtitle={subtitle}
        actions={
          <form action={setProjectStageAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={project.id} />
            <AutoSubmitSelect name="stage" defaultValue={project.stage} className="w-56 py-1.5 text-xs" aria-label={t.common.stage}>
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {labelFor(t, "projectStage", s)}
                </option>
              ))}
            </AutoSubmitSelect>
          </form>
        }
      />

      <SpecStrip className="mb-5">
        <StatCard label={P.quote} value={formatMoney(project.quoteAmount, project.currency)} hint={project.depositAmount ? P.depositHint(formatMoney(project.depositAmount, project.currency)) : undefined} />
        <StatCard label={P.paid} value={formatMoney(project.paidAmount, project.currency)} tone={project.paidAmount ? "success" : undefined} />
        <StatCard label={P.pageViews} value={links.reduce((s, l) => s + l.viewsCount, 0)} hint={P.activeLinks(links.filter((l) => l.isActive).length)} />
        <StatCard label={P.openFeedback} value={openFeedback} tone={openFeedback ? "warning" : undefined} hint={P.filesHint(assets.length)} />
      </SpecStrip>

      <Tabs items={tabs} current={tab} base={`/admin/projects/${project.id}`} />

      {tab === "" ? (
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-0">
          <Panel title={P.details} className="lg:col-span-2 lg:mr-6">
            <form action={updateProjectAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={project.id} />
              <Field label={P.fTitle} required className="sm:col-span-2">
                <Input name="title" required defaultValue={project.title} maxLength={160} />
              </Field>
              <Field label={f.segment}>
                <Select name="segment" defaultValue={project.segment}>
                  <option value="b2c">{f.b2cOption}</option>
                  <option value="b2b">{f.b2bOption}</option>
                </Select>
              </Field>
              <Field label={f.type}>
                <Select name="type" defaultValue={project.type}>
                  {PROJECT_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {labelFor(t, "rooms", ty)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={f.status}>
                <Select name="status" defaultValue={project.status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelFor(t, "projectStatus", s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={P.fDeadline}>
                <Input type="date" name="deadline" defaultValue={project.deadline?.slice(0, 10) ?? ""} />
              </Field>
              <Field label={t.crm.leads.client}>
                <Select name="clientId" defaultValue={project.clientId ?? ""}>
                  <option value="">{f.none}</option>
                  {clientOptions().map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientLabel(c)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={f.company}>
                <Select name="companyId" defaultValue={project.companyId ?? ""}>
                  <option value="">{f.none}</option>
                  {companyOptions().map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={P.fRoomWidth}>
                <Input name="roomWidth" inputMode="numeric" defaultValue={room.width ?? ""} />
              </Field>
              <Field label={P.fRoomDepth}>
                <Input name="roomDepth" inputMode="numeric" defaultValue={room.depth ?? ""} />
              </Field>
              <Field label={P.fRoomHeight}>
                <Input name="roomHeight" inputMode="numeric" defaultValue={room.height ?? ""} />
              </Field>
              <Field label={P.fRoomNotes}>
                <Input name="roomNotes" defaultValue={room.notes ?? ""} maxLength={500} placeholder={P.roomNotesPlaceholder} />
              </Field>
              <Field label={P.fQuote}>
                <Input name="quoteAmount" inputMode="numeric" defaultValue={project.quoteAmount ?? ""} />
              </Field>
              <Field label={P.fDeposit}>
                <Input name="depositAmount" inputMode="numeric" defaultValue={project.depositAmount ?? ""} />
              </Field>
              <Field label={P.fPaid}>
                <Input name="paidAmount" inputMode="numeric" defaultValue={project.paidAmount ?? ""} />
              </Field>
              <Field label={f.currency}>
                <Select name="currency" defaultValue={project.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={P.fMaterials} className="sm:col-span-2">
                <Textarea name="materials" defaultValue={project.materials ?? ""} placeholder={P.materialsPlaceholder} maxLength={2000} />
              </Field>
              <Field label={t.common.description} className="sm:col-span-2">
                <Textarea name="description" defaultValue={project.description ?? ""} placeholder={P.descriptionPlaceholder} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-fg-2 sm:col-span-2">
                <input type="checkbox" name="isPortfolio" defaultChecked={project.isPortfolio} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
                {P.showInPortfolio}
              </label>
              <FormActions className="sm:col-span-2">
                <Button type="submit">{P.save}</Button>
              </FormActions>
            </form>
          </Panel>

          <div className="space-y-4 lg:border-l lg:border-line lg:pl-6">
            <Panel title={P.summary}>
              <KV label={P.colCode}>{project.code}</KV>
              <KV label={t.crm.leads.client}>
                {client ? (
                  <Link href={`/admin/clients/${client.id}`} className="text-accent">
                    {clientLabel(client)}
                  </Link>
                ) : (
                  "—"
                )}
              </KV>
              <KV label={f.company}>
                {company ? (
                  <Link href={`/admin/companies/${company.id}`} className="text-accent">
                    {company.name}
                  </Link>
                ) : (
                  "—"
                )}
              </KV>
              <KV label={t.common.stage}>
                <StatusBadge value={project.stage} label={labelFor(t, "projectStage", project.stage)} />
              </KV>
              <KV label={P.colDeadline}>{project.deadline ? formatDate(project.deadline) : "—"}</KV>
              <KV label={t.common.created}>{formatDate(project.createdAt, true)}</KV>
              <KV label={t.common.updated}>{formatDate(project.updatedAt, true)}</KV>
            </Panel>
            <Panel title={P.danger}>
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={project.id} />
                <ConfirmButton message={P.deleteConfirm} className="btn-ghost btn-sm text-danger">
                  {P.delete}
                </ConfirmButton>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="space-y-4">
          <Panel title={P.upload}>
            <UploadZone projectId={project.id} labels={uploadLabels} />
          </Panel>
          <ProjectMediaGrid project={project} assets={assets} />
        </div>
      ) : null}

      {tab === "client" ? (
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-0">
          <div className="space-y-4 lg:col-span-2 lg:pr-6">
            <Panel title={P.clientPages(links.length)}>
              {links.length === 0 ? (
                <div className="text-sm text-muted">{P.noClientPage}</div>
              ) : (
                <ul className="space-y-4">
                  {links.map((l) => {
                    const url = shareUrl(l, env.appUrl);
                    const wa = `https://wa.me/?text=${encodeURIComponent(`${l.title ?? project.title}\n${url}`)}`;
                    const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                    return (
                      <li key={l.id} className="rounded-md border border-line p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-fg">{l.title ?? `/p/${l.slug}`}</span>
                              <Badge tone={l.isActive && !expired ? "success" : "neutral"}>{expired ? P.expired : l.isActive ? t.common.active : P.off}</Badge>
                              <Badge tone="neutral">{l.language}</Badge>
                              {l.passcode ? <Badge tone="warning">{t.pages.codeHint(l.passcode)}</Badge> : null}
                            </div>
                            <div className="mt-1 font-mono text-xs break-all text-muted">{url}</div>
                          </div>
                          <div className="text-xs text-muted sm:text-right">
                            <div>{P.viewsCount(l.viewsCount)}</div>
                            <div>{l.lastViewedAt ? P.lastView(relTime(l.lastViewedAt, locale)) : P.notOpened}</div>
                            {l.expiresAt ? <div>{P.expiresOn(formatDate(l.expiresAt))}</div> : null}
                            {l.sentAt ? <div>{P.sentVia(sentViaNames[l.sentVia ?? ""] ?? l.sentVia ?? "—", relTime(l.sentAt, locale))}</div> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CopyButton text={url} label={P.copyLink} copiedLabel={t.common.copied} />
                          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                            <ExternalLink size={14} /> {P.open}
                          </a>
                          <form action={sendShareLinkTelegramAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="btn-secondary btn-sm">
                              <Send size={14} /> {P.sendTelegram}
                            </button>
                          </form>
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                            <MessageCircle size={14} /> {t.common.whatsapp}
                          </a>
                          <form action={regenerateShareTokenAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <ConfirmButton message={P.regenerateConfirm} className="btn-ghost btn-sm">
                              <RefreshCw size={14} /> {P.regenerate}
                            </ConfirmButton>
                          </form>
                          <form action={toggleShareLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="btn-ghost btn-sm">
                              {l.isActive ? P.deactivate : P.activate}
                            </button>
                          </form>
                          <form action={deleteShareLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <ConfirmButton message={P.deleteLinkConfirm} className="btn-ghost btn-sm text-danger" title={t.common.delete} aria-label={t.common.delete}>
                              <Trash2 size={14} />
                            </ConfirmButton>
                          </form>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                          {(
                            [
                              [P.toggles.live, l.showLive],
                              [P.toggles.viewer, l.showViewer],
                              [P.toggles.pdf, l.showPdf],
                              [P.toggles.download, l.allowDownload],
                              [P.toggles.feedback, l.allowFeedback],
                            ] as const
                          ).map(([label, on]) => (
                            <span key={String(label)} className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] uppercase ${on ? "border-line-strong text-fg-2" : "border-line text-faint"}`}>
                              {String(label)}
                            </span>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title={P.events(events.length)}>
              {events.length === 0 ? (
                <div className="text-sm text-muted">{P.noEvents}</div>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 text-fg-2">
                        <span className="tag mr-2">{eventNames[e.type] ?? e.type.replace(/_/g, " ")}</span>
                        <span className="font-mono text-xs text-muted">/p/{linkTitles[e.shareLinkId] ?? "—"}</span>
                      </span>
                      <span className="num text-[11px] whitespace-nowrap text-muted" title={formatDate(e.createdAt, true)}>
                        {relTime(e.createdAt, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="lg:border-l lg:border-line lg:pl-6">
          <Panel title={P.newPage}>
            <form action={createShareLinkAction} className="space-y-3">
              <input type="hidden" name="projectId" value={project.id} />
              <Field label={t.common.title}>
                <Input name="title" defaultValue={project.title} maxLength={160} />
              </Field>
              <Field label={P.greeting}>
                <Textarea name="message" rows={3} placeholder={P.greetingPlaceholder} maxLength={2000} />
              </Field>
              <Field label={t.common.language}>
                <Select name="language" defaultValue={client?.language ?? "hy"}>
                  <option value="hy">{f.langHy}</option>
                  <option value="ru">{f.langRu}</option>
                  <option value="en">{f.langEn}</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={P.expiresDays}>
                  <Input name="expiresDays" inputMode="numeric" placeholder="30" />
                </Field>
                <Field label={P.passcode}>
                  <Input name="passcode" maxLength={12} placeholder={P.passcodePlaceholder} />
                </Field>
              </div>
              <div className="space-y-1.5 text-sm text-fg-2">
                {(
                  [
                    ["showViewer", P.showViewer, true],
                    ["showLive", P.showLive, true],
                    ["showPdf", P.showPdf, false],
                    ["allowDownload", P.allowDownload, false],
                    ["allowFeedback", P.allowFeedback, true],
                  ] as const
                ).map(([name, label, on]) => (
                  <label key={name} className="flex items-center gap-2">
                    <input type="checkbox" name={name} defaultChecked={on} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full">
                {P.createPage}
              </Button>
            </form>
          </Panel>
          </div>
        </div>
      ) : null}

      {tab === "deliverables" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={P.deliverablesLinks}>
            <form action={updateDeliverablesAction} className="space-y-3">
              <input type="hidden" name="id" value={project.id} />
              <Field label={P.viewerUrl} hint={P.viewerUrlHint}>
                <Input name="viewerUrl" defaultValue={project.viewerUrl ?? ""} placeholder="https://…" maxLength={500} />
              </Field>
              <Field label={P.liveUrl} hint={P.liveUrlHint}>
                <Input name="liveUrl" defaultValue={project.liveUrl ?? ""} placeholder="https://live.architeksoft.com/?instanceUuid=…" maxLength={500} />
              </Field>
              <Field label={P.liveUuid}>
                <Input name="liveInstanceUuid" defaultValue={project.liveInstanceUuid ?? ""} maxLength={120} />
              </Field>
              <Button type="submit">{P.saveLinks}</Button>
            </form>
            <div className="mt-4 border-t border-line pt-4">
              <form action={createLiveLinkAction}>
                <input type="hidden" name="id" value={project.id} />
                <Button type="submit" variant="secondary">
                  {P.createLive}
                </Button>
              </form>
              {liveConfigured() ? <p className="mt-2 text-xs text-muted">{P.liveConfigured}</p> : <p className="mt-2 text-xs text-warning">{P.liveNotConfigured}</p>}
            </div>
          </Panel>

          <Panel title={P.current}>
            <KV label={P.toggles.viewer}>
              {project.viewerUrl ? (
                <a href={project.viewerUrl} target="_blank" rel="noopener noreferrer" className="break-all text-accent">
                  {project.viewerUrl}
                </a>
              ) : (
                "—"
              )}
            </KV>
            <KV label={P.toggles.live}>
              {project.liveUrl ? (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="break-all text-accent">
                  {project.liveUrl}
                </a>
              ) : (
                "—"
              )}
            </KV>
            <KV label={P.liveUuid}>{project.liveInstanceUuid ?? "—"}</KV>
            <KV label={t.media.roleLabels.ar_glb}>
              {project.arGlbAssetId ? (
                <Link href={`/admin/media/${project.arGlbAssetId}`} className="text-accent">
                  {P.asset}
                </Link>
              ) : (
                P.setInMedia
              )}
            </KV>
            <KV label={t.media.roleLabels.ar_usdz}>
              {project.arUsdzAssetId ? (
                <Link href={`/admin/media/${project.arUsdzAssetId}`} className="text-accent">
                  {P.asset}
                </Link>
              ) : (
                P.setInMedia
              )}
            </KV>
            <KV label={t.media.roleLabels.pdf}>
              {project.pdfAssetId ? (
                <Link href={`/admin/media/${project.pdfAssetId}`} className="text-accent">
                  {P.asset}
                </Link>
              ) : (
                P.setInMedia
              )}
            </KV>
            <KV label={P.cover}>
              {project.coverAssetId ? (
                <Link href={`/admin/media/${project.coverAssetId}`} className="text-accent">
                  {P.asset}
                </Link>
              ) : (
                P.setInMedia
              )}
            </KV>
          </Panel>
        </div>
      ) : null}

      {tab === "feedback" ? (
        <Panel title={P.feedbackTitle(feedback.length)}>
          {feedback.length === 0 ? (
            <div className="text-sm text-muted">{P.noFeedbackYet}</div>
          ) : (
            <ul className="divide-y divide-line">
              {feedback.map((fb) => (
                <li key={fb.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={fb.type === "approve" ? "success" : fb.type === "change_request" ? "warning" : "neutral"}>{labelFor(t, "feedbackType", fb.type)}</Badge>
                      {fb.resolved ? <Badge tone="neutral">{P.resolved}</Badge> : null}
                      <span className="text-xs text-muted">{relTime(fb.createdAt, locale)}</span>
                    </div>
                    {fb.message ? <div className="mt-1 text-sm whitespace-pre-wrap text-fg-2">{fb.message}</div> : null}
                    {fb.contact ? <div className="mt-0.5 text-xs text-muted">{fb.contact}</div> : null}
                  </div>
                  <form action={toggleFeedbackResolvedAction}>
                    <input type="hidden" name="id" value={fb.id} />
                    <button type="submit" className="btn-secondary btn-sm">
                      {fb.resolved ? P.reopen : P.resolve}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "timeline" ? (
        <Panel title={P.tabs.timeline}>
          <ActivityTimeline entityType="project" entityId={project.id} items={activities} users={users} />
        </Panel>
      ) : null}
    </>
  );
}
