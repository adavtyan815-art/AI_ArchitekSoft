import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { liveConfigured, liveLinkFor, listLiveInstances } from "@/lib/live";
import { getSetting } from "@/lib/settings";
import { fmtYerevan } from "@/lib/tz";
import { getAdminDict } from "@/lib/i18n/admin";
import { PageHeader, Panel, SpecStrip, StatCard, StatusBadge } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { CopyButton } from "@/components/admin/copy-button";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/form-buttons";
import { Field, Input } from "@/components/ui";
import { createLiveInstanceForm, stopLiveInstanceForm } from "@/app/admin/actions/live-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function hours(sec: number | undefined) {
  if (!sec) return "0h";
  const h = sec / 3600;
  return h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(sec / 60)}m`;
}

export default async function LivePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const L = t.live;
  const sp = await searchParams;
  const live = getSetting("live");
  const configured = liveConfigured();
  const r = await listLiveInstances();
  const running = r.instances.filter((i) => i.status === "running" || i.status === "starting").length;

  return (
    <>
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        actions={
          <a href={live.backendUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            <ExternalLink size={14} /> {L.openBackend}
          </a>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <SpecStrip cols={3}>
        <StatCard label={L.stats.instances} value={r.instances.length} hint={configured ? L.fromBackend : L.unreachable} />
        <StatCard label={L.stats.running} value={running} tone={running ? "brand" : undefined} />
        <StatCard label={L.stats.backend} value={configured ? L.connected : L.dryRun} tone={configured ? "success" : "warning"} hint={live.backendUrl.replace(/^https?:\/\//, "")} />
      </SpecStrip>

      {!r.ok ? (
        <div className="mt-5">
          <Panel title={L.notConfigured}>
            <p className="text-sm text-fg-2">{r.error}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-fg-2">
              <li>
                <code className="font-mono text-xs">LIVE_BACKEND_URL</code> — {L.envBackend} <b>{live.backendUrl}</b> ({L.envBackend2}{" "}
                <Link href="/admin/settings?tab=live" className="font-medium text-accent hover:underline">{L.settingsLink}</Link>).
              </li>
              <li>
                <code className="font-mono text-xs">LIVE_ADMIN_USERNAME</code> / <code className="font-mono text-xs">LIVE_ADMIN_PASSWORD</code> — {L.envCreds}
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted">{L.notConfiguredNote} <code className="font-mono">{live.backendUrl}/?instanceUuid=…</code></p>
          </Panel>
        </div>
      ) : (
        <div className="mt-5">
          <Panel title={L.panel}>
            {r.instances.length === 0 ? (
              <p className="text-sm text-muted">{L.none}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-admin table-responsive">
                  <thead>
                    <tr>
                      <th>{L.table.assignedTo}</th>
                      <th>{L.table.instance}</th>
                      <th>{L.table.status}</th>
                      <th>{L.table.display}</th>
                      <th>{L.table.real}</th>
                      <th>{L.table.expires}</th>
                      <th className="num">{L.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.instances.map((i) => (
                      <tr key={i.uuid}>
                        <td data-label={L.table.assignedTo} className="font-medium text-fg">{i.assignedTo ?? "—"}</td>
                        <td data-label={L.table.instance} className="font-mono text-[11px] text-fg-2">
                          {i.instanceId}
                          <div className="text-faint">{i.uuid.slice(0, 12)}…</div>
                        </td>
                        <td data-label={L.table.status}><StatusBadge value={i.status} label={L.statuses[i.status as keyof typeof L.statuses] ?? i.status} /></td>
                        <td data-label={L.table.display} className="text-xs tabular-nums">{hours(i.displayTimeUsedSeconds)} / {i.displayLimitHours}h</td>
                        <td data-label={L.table.real} className="text-xs tabular-nums">{hours(i.realTimeUsedSeconds)} / {i.realLimitHours}h</td>
                        <td data-label={L.table.expires} className="text-xs whitespace-nowrap">{fmtYerevan(i.expiresAt)}</td>
                        <td data-label="">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <CopyButton text={liveLinkFor(i.uuid)} label={L.copyLink} />
                            <a href={liveLinkFor(i.uuid)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm" aria-label={L.open}><ExternalLink size={14} /></a>
                            <form action={stopLiveInstanceForm} className="inline">
                              <input type="hidden" name="uuid" value={i.uuid} />
                              <ConfirmSubmit message={L.stopConfirm}>{L.stop}</ConfirmSubmit>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel title={L.createPanel}>
          <form action={createLiveInstanceForm} className="grid gap-4 sm:grid-cols-2">
            <Field label={L.form.assignedTo} required hint={L.form.assignedToHint} className="sm:col-span-2">
              <Input name="assignedTo" required placeholder="Aren · 2026" />
            </Field>
            <Field label={L.form.displayLimit} hint={L.form.displayHint}>
              <Input name="displayLimitHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultDisplayHours} />
            </Field>
            <Field label={L.form.realLimit} hint={L.form.realHint}>
              <Input name="realLimitHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultRealHours} />
            </Field>
            <Field label={L.form.days}><Input name="days" type="number" min={1} defaultValue={live.defaultDays} /></Field>
            <Field label={L.form.instanceId} hint={L.form.instanceIdHint}><Input name="explicitInstanceId" placeholder="i-0abc…" /></Field>
            <div className="sm:col-span-2"><SubmitButton variant="brand" pendingText={L.creating}>{L.create}</SubmitButton></div>
          </form>
        </Panel>

        <Panel title={L.how}>
          <ul className="space-y-2 text-sm text-fg-2">
            <li><b className="text-fg">{L.howItems.backend}:</b> <code className="font-mono text-xs">{live.backendUrl.replace(/^https?:\/\//, "")}</code> — {L.howItems.backendText}</li>
            <li><b className="text-fg">{L.howItems.onDemand}:</b> {L.howItems.onDemandText}</li>
            <li><b className="text-fg">{L.howItems.quotas}:</b> {L.howItems.quotasText}</li>
            <li>
              <b className="text-fg">{L.howItems.link}:</b> <code className="font-mono text-xs">{live.backendUrl}/?instanceUuid=…</code> — {L.howItems.linkText}{" "}
              <Link href="/admin/pages" className="font-medium text-accent hover:underline">{L.howItems.linkPages}</Link>.
            </li>
            <li><b className="text-fg">{L.howItems.cost}:</b> {L.howItems.costText}</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
