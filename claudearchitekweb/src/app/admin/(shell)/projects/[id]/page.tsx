import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ExternalLink, MessageCircle, RefreshCw, Send, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PROJECT_STAGES, PROJECT_TYPES, shareUrl } from "@/lib/crm";
import { clientLabel, clientOptions, companyOptions } from "@/lib/admin-helpers";
import { liveConfigured } from "@/lib/live";
import { env } from "@/lib/env";
import { formatDate, formatMoney, parseJson, relativeTime } from "@/lib/utils";
import { KV, PageHeader, Panel, StatCard, StatusBadge, Tabs } from "@/components/admin/shell";
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
const TAB_KEYS = ["", "media", "client", "deliverables", "feedback", "timeline"];

type Room = { width?: number | null; depth?: number | null; height?: number | null; notes?: string | null };

export default async function ProjectDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tab = TAB_KEYS.includes(sp.tab ?? "") ? sp.tab ?? "" : "";
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
  if (!project) notFound();

  const client = project.clientId ? db.select().from(schema.clients).where(eq(schema.clients.id, project.clientId)).get() : null;
  const company = project.companyId ? db.select().from(schema.companies).where(eq(schema.companies.id, project.companyId)).get() : null;
  const assets = db.select().from(schema.assets).where(eq(schema.assets.projectId, id)).orderBy(asc(schema.assets.sortOrder), asc(schema.assets.createdAt)).all();
  const links = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.projectId, id)).orderBy(desc(schema.shareLinks.createdAt)).all();
  const feedback = db.select().from(schema.clientFeedback).where(eq(schema.clientFeedback.projectId, id)).orderBy(desc(schema.clientFeedback.createdAt)).all();
  const activities = db.select().from(schema.activities).where(and(eq(schema.activities.entityType, "project"), eq(schema.activities.entityId, id))).orderBy(desc(schema.activities.createdAt)).all();
  const users = Object.fromEntries(db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all().map((u) => [u.id, u.name]));
  const events = links.length ? db.select().from(schema.shareEvents).where(inArray(schema.shareEvents.shareLinkId, links.map((l) => l.id))).orderBy(desc(schema.shareEvents.createdAt)).limit(50).all() : [];
  const linkTitles = Object.fromEntries(links.map((l) => [l.id, l.slug]));
  const room = parseJson<Room>(project.room, {});
  const openFeedback = feedback.filter((f) => !f.resolved).length;

  const tabs = [
    { key: "", label: "Overview" },
    { key: "media", label: "Media", count: assets.length },
    { key: "client", label: "Client page", count: links.length },
    { key: "deliverables", label: "Deliverables" },
    { key: "feedback", label: "Feedback", count: feedback.length },
    { key: "timeline", label: "Timeline", count: activities.length },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Projects", href: "/admin/projects" }, { label: project.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base text-ink-500">{project.code}</span>
            {project.title}
            <StatusBadge value={project.segment} />
            <StatusBadge value={project.status} />
            {project.isPortfolio ? <Badge tone="dark">portfolio</Badge> : null}
          </span>
        }
        subtitle={`${project.type} · ${client ? clientLabel(client) : ""}${client && company ? " · " : ""}${company ? company.name : ""}${!client && !company ? "no client linked" : ""} · updated ${relativeTime(project.updatedAt)}`}
        actions={
          <form action={setProjectStageAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={project.id} />
            <AutoSubmitSelect name="stage" defaultValue={project.stage} className="w-44 py-1.5 text-xs">
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </AutoSubmitSelect>
          </form>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Quote" value={formatMoney(project.quoteAmount, project.currency)} hint={project.depositAmount ? `Deposit ${formatMoney(project.depositAmount, project.currency)}` : undefined} />
        <StatCard label="Paid" value={formatMoney(project.paidAmount, project.currency)} tone={project.paidAmount ? "success" : undefined} />
        <StatCard label="Client page views" value={links.reduce((s, l) => s + l.viewsCount, 0)} hint={`${links.filter((l) => l.isActive).length} active link(s)`} />
        <StatCard label="Open feedback" value={openFeedback} tone={openFeedback ? "warning" : undefined} hint={`${assets.length} files`} />
      </div>

      <Tabs items={tabs} current={tab} base={`/admin/projects/${project.id}`} />

      {tab === "" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Project details" className="lg:col-span-2">
            <form action={updateProjectAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={project.id} />
              <Field label="Title" required className="sm:col-span-2">
                <Input name="title" required defaultValue={project.title} maxLength={160} />
              </Field>
              <Field label="Segment">
                <Select name="segment" defaultValue={project.segment}>
                  <option value="b2c">B2C — individual</option>
                  <option value="b2b">B2B — company</option>
                </Select>
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue={project.type}>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={project.status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Deadline">
                <Input type="date" name="deadline" defaultValue={project.deadline?.slice(0, 10) ?? ""} />
              </Field>
              <Field label="Client">
                <Select name="clientId" defaultValue={project.clientId ?? ""}>
                  <option value="">—</option>
                  {clientOptions().map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientLabel(c)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Company">
                <Select name="companyId" defaultValue={project.companyId ?? ""}>
                  <option value="">—</option>
                  {companyOptions().map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Room width">
                <Input name="roomWidth" inputMode="numeric" defaultValue={room.width ?? ""} />
              </Field>
              <Field label="Room depth">
                <Input name="roomDepth" inputMode="numeric" defaultValue={room.depth ?? ""} />
              </Field>
              <Field label="Room height">
                <Input name="roomHeight" inputMode="numeric" defaultValue={room.height ?? ""} />
              </Field>
              <Field label="Room notes">
                <Input name="roomNotes" defaultValue={room.notes ?? ""} maxLength={500} placeholder="Windows, columns, ventilation…" />
              </Field>
              <Field label="Quote amount">
                <Input name="quoteAmount" inputMode="numeric" defaultValue={project.quoteAmount ?? ""} />
              </Field>
              <Field label="Deposit amount">
                <Input name="depositAmount" inputMode="numeric" defaultValue={project.depositAmount ?? ""} />
              </Field>
              <Field label="Paid amount">
                <Input name="paidAmount" inputMode="numeric" defaultValue={project.paidAmount ?? ""} />
              </Field>
              <Field label="Currency">
                <Select name="currency" defaultValue={project.currency}>
                  <option value="AMD">AMD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                </Select>
              </Field>
              <Field label="Materials" className="sm:col-span-2">
                <Textarea name="materials" defaultValue={project.materials ?? ""} placeholder="Facades, worktop, hardware, finishes…" maxLength={2000} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea name="description" defaultValue={project.description ?? ""} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink-800 sm:col-span-2">
                <input type="checkbox" name="isPortfolio" defaultChecked={project.isPortfolio} className="h-4 w-4 rounded border-ink-300" />
                Show in portfolio
              </label>
              <div className="sm:col-span-2">
                <Button type="submit">Save project</Button>
              </div>
            </form>
          </Panel>

          <div className="space-y-4">
            <Panel title="Summary">
              <KV label="Code">{project.code}</KV>
              <KV label="Client">{client ? <Link href={`/admin/clients/${client.id}`} className="text-brand-600">{clientLabel(client)}</Link> : "—"}</KV>
              <KV label="Company">{company ? <Link href={`/admin/companies/${company.id}`} className="text-brand-600">{company.name}</Link> : "—"}</KV>
              <KV label="Stage">
                <StatusBadge value={project.stage} />
              </KV>
              <KV label="Deadline">{project.deadline ? formatDate(project.deadline) : "—"}</KV>
              <KV label="Created">{formatDate(project.createdAt, true)}</KV>
              <KV label="Updated">{formatDate(project.updatedAt, true)}</KV>
            </Panel>
            <Panel title="Danger zone">
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={project.id} />
                <ConfirmButton message="Delete this project? Client pages and feedback are removed; files stay in the media library." className="btn-ghost btn-sm text-danger-500">
                  Delete project
                </ConfirmButton>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="space-y-4">
          <Panel title="Upload">
            <UploadZone projectId={project.id} />
          </Panel>
          <ProjectMediaGrid project={project} assets={assets} />
        </div>
      ) : null}

      {tab === "client" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel title={`Client pages (${links.length})`}>
              {links.length === 0 ? (
                <div className="text-sm text-ink-500">No client page yet. Create one on the right and send the link.</div>
              ) : (
                <ul className="space-y-4">
                  {links.map((l) => {
                    const url = shareUrl(l, env.appUrl);
                    const wa = `https://wa.me/?text=${encodeURIComponent(`${l.title ?? project.title}\n${url}`)}`;
                    const expired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                    return (
                      <li key={l.id} className="rounded-2xl border border-line p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink-900">{l.title ?? `/p/${l.slug}`}</span>
                              <Badge tone={l.isActive && !expired ? "success" : "neutral"}>{expired ? "expired" : l.isActive ? "active" : "off"}</Badge>
                              <Badge tone="neutral">{l.language}</Badge>
                              {l.passcode ? <Badge tone="warning">code {l.passcode}</Badge> : null}
                            </div>
                            <div className="mt-1 break-all font-mono text-xs text-ink-500">{url}</div>
                          </div>
                          <div className="text-right text-xs text-ink-500">
                            <div>
                              {l.viewsCount} view{l.viewsCount === 1 ? "" : "s"}
                            </div>
                            <div>{l.lastViewedAt ? `last ${relativeTime(l.lastViewedAt)}` : "not opened yet"}</div>
                            {l.expiresAt ? <div>expires {formatDate(l.expiresAt)}</div> : null}
                            {l.sentAt ? <div>sent via {l.sentVia} {relativeTime(l.sentAt)}</div> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CopyButton text={url} label="Copy link" />
                          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                            <ExternalLink size={14} /> Open
                          </a>
                          <form action={sendShareLinkTelegramAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="btn-secondary btn-sm">
                              <Send size={14} /> Send to my Telegram
                            </button>
                          </form>
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                          <form action={regenerateShareTokenAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <ConfirmButton message="Regenerate the secret token? The old link stops working." className="btn-ghost btn-sm">
                              <RefreshCw size={14} /> Regenerate
                            </ConfirmButton>
                          </form>
                          <form action={toggleShareLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="btn-ghost btn-sm">
                              {l.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                          <form action={deleteShareLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <ConfirmButton message="Delete this client page permanently?" className="btn-ghost btn-sm text-danger-500">
                              <Trash2 size={14} />
                            </ConfirmButton>
                          </form>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-ink-500">
                          {[
                            ["Live 3D", l.showLive],
                            ["Viewer", l.showViewer],
                            ["PDF", l.showPdf],
                            ["Download", l.allowDownload],
                            ["Feedback", l.allowFeedback],
                          ].map(([label, on]) => (
                            <span key={String(label)} className={`rounded-full border px-2 py-0.5 ${on ? "border-ink-300 text-ink-700" : "border-ink-100 text-ink-300"}`}>
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

            <Panel title={`Recent events (${events.length})`}>
              {events.length === 0 ? (
                <div className="text-sm text-ink-500">Nothing yet — events appear when the client opens the page.</div>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-ink-800">
                        <span className="mr-2 rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-700">{e.type.replace(/_/g, " ")}</span>
                        <span className="font-mono text-xs text-ink-500">/p/{linkTitles[e.shareLinkId] ?? "—"}</span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-ink-500" title={formatDate(e.createdAt, true)}>
                        {relativeTime(e.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="New client page">
            <form action={createShareLinkAction} className="space-y-3">
              <input type="hidden" name="projectId" value={project.id} />
              <Field label="Title">
                <Input name="title" defaultValue={project.title} maxLength={160} />
              </Field>
              <Field label="Greeting message">
                <Textarea name="message" rows={3} placeholder="Բարև Արեն, ահա ձեր նախագիծը…" maxLength={2000} />
              </Field>
              <Field label="Language">
                <Select name="language" defaultValue={client?.language ?? "hy"}>
                  <option value="hy">Armenian</option>
                  <option value="ru">Russian</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expires in (days)">
                  <Input name="expiresDays" inputMode="numeric" placeholder="30" />
                </Field>
                <Field label="Passcode">
                  <Input name="passcode" maxLength={12} placeholder="optional" />
                </Field>
              </div>
              <div className="space-y-1.5 text-sm text-ink-800">
                {[
                  ["showLive", "Show Live 3D", true],
                  ["showViewer", "Show web viewer", true],
                  ["showPdf", "Show PDF", false],
                  ["allowDownload", "Allow downloads", false],
                  ["allowFeedback", "Allow feedback", true],
                ].map(([name, label, on]) => (
                  <label key={String(name)} className="flex items-center gap-2">
                    <input type="checkbox" name={String(name)} defaultChecked={Boolean(on)} className="h-4 w-4 rounded border-ink-300" />
                    {String(label)}
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full">
                Create client page
              </Button>
            </form>
          </Panel>
        </div>
      ) : null}

      {tab === "deliverables" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Live 3D & viewer links">
            <form action={updateDeliverablesAction} className="space-y-3">
              <input type="hidden" name="id" value={project.id} />
              <Field label="Live 3D URL" hint="Pixel Streaming session link shown on the client page">
                <Input name="liveUrl" defaultValue={project.liveUrl ?? ""} placeholder="https://live.architeksoft.com/?instanceUuid=…" maxLength={500} />
              </Field>
              <Field label="Live instance UUID">
                <Input name="liveInstanceUuid" defaultValue={project.liveInstanceUuid ?? ""} maxLength={120} />
              </Field>
              <Field label="Web 3D viewer URL">
                <Input name="viewerUrl" defaultValue={project.viewerUrl ?? ""} placeholder="https://…" maxLength={500} />
              </Field>
              <Button type="submit">Save links</Button>
            </form>
            <div className="mt-4 border-t border-line pt-4">
              <form action={createLiveLinkAction}>
                <input type="hidden" name="id" value={project.id} />
                <Button type="submit" variant="secondary">
                  Create Live 3D link
                </Button>
              </form>
              {liveConfigured() ? (
                <p className="mt-2 text-xs text-ink-500">Requests a fresh Pixel Streaming instance and stores its UUID and URL.</p>
              ) : (
                <p className="mt-2 text-xs text-amber-600">Live backend is not configured — a dry-run link is generated and logged so the flow can be tested.</p>
              )}
            </div>
          </Panel>

          <Panel title="Current deliverables">
            <KV label="Live 3D">
              {project.liveUrl ? (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600">
                  {project.liveUrl}
                </a>
              ) : (
                "—"
              )}
            </KV>
            <KV label="Instance UUID">{project.liveInstanceUuid}</KV>
            <KV label="Viewer">
              {project.viewerUrl ? (
                <a href={project.viewerUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600">
                  {project.viewerUrl}
                </a>
              ) : (
                "—"
              )}
            </KV>
            <KV label="AR GLB">{project.arGlbAssetId ? <Link href={`/admin/media/${project.arGlbAssetId}`} className="text-brand-600">asset</Link> : "— set in Media tab"}</KV>
            <KV label="AR USDZ">{project.arUsdzAssetId ? <Link href={`/admin/media/${project.arUsdzAssetId}`} className="text-brand-600">asset</Link> : "— set in Media tab"}</KV>
            <KV label="PDF">{project.pdfAssetId ? <Link href={`/admin/media/${project.pdfAssetId}`} className="text-brand-600">asset</Link> : "— set in Media tab"}</KV>
            <KV label="Cover">{project.coverAssetId ? <Link href={`/admin/media/${project.coverAssetId}`} className="text-brand-600">asset</Link> : "— set in Media tab"}</KV>
          </Panel>
        </div>
      ) : null}

      {tab === "feedback" ? (
        <Panel title={`Client feedback (${feedback.length})`}>
          {feedback.length === 0 ? (
            <div className="text-sm text-ink-500">No feedback yet. Clients can approve or request changes from their page.</div>
          ) : (
            <ul className="divide-y divide-line">
              {feedback.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={f.type === "approve" ? "success" : f.type === "change_request" ? "warning" : "neutral"}>{f.type.replace(/_/g, " ")}</Badge>
                      {f.resolved ? <Badge tone="neutral">resolved</Badge> : null}
                      <span className="text-xs text-ink-500">{relativeTime(f.createdAt)}</span>
                    </div>
                    {f.message ? <div className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{f.message}</div> : null}
                    {f.contact ? <div className="mt-0.5 text-xs text-ink-500">{f.contact}</div> : null}
                  </div>
                  <form action={toggleFeedbackResolvedAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="btn-secondary btn-sm">
                      {f.resolved ? "Reopen" : "Resolve"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "timeline" ? (
        <Panel title="Timeline">
          <ActivityTimeline entityType="project" entityId={project.id} items={activities} users={users} />
        </Panel>
      ) : null}
    </>
  );
}
