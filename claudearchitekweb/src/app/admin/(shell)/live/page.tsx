import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { liveConfigured, liveLinkFor, listLiveInstances } from "@/lib/live";
import { getSetting } from "@/lib/settings";
import { fmtYerevan } from "@/lib/tz";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/shell";
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
  const sp = await searchParams;
  const live = getSetting("live");
  const configured = liveConfigured();
  const r = await listLiveInstances();
  const running = r.instances.filter((i) => i.status === "running" || i.status === "starting").length;

  return (
    <>
      <PageHeader
        title="Live 3D"
        subtitle="Personal pixel-streaming links for clients: the backend starts a GPU instance on demand and enforces the time quotas."
        actions={
          <a href={live.backendUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            <ExternalLink size={14} /> Open backend
          </a>
        }
      />
      <Notice text={sp.notice} tone={sp.tone} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Instances" value={r.instances.length} hint={configured ? "from the backend" : "backend not reachable"} />
        <StatCard label="Running / starting" value={running} tone={running ? "brand" : undefined} />
        <StatCard label="Backend" value={configured ? "connected" : "dry-run"} tone={configured ? "success" : "warning"} hint={live.backendUrl.replace(/^https?:\/\//, "")} />
      </div>

      {!r.ok ? (
        <div className="mt-5">
          <Panel title="Backend not configured">
            <p className="text-sm text-ink-600">{r.error}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
              <li><code className="font-mono text-xs">LIVE_BACKEND_URL</code> — admin API base, currently <b>{live.backendUrl}</b> (change it in <Link href="/admin/settings?tab=live" className="text-brand-600">Settings → Live 3D</Link>).</li>
              <li><code className="font-mono text-xs">LIVE_ADMIN_USERNAME</code> / <code className="font-mono text-xs">LIVE_ADMIN_PASSWORD</code> — the express-session admin login of the streaming backend.</li>
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Without the credentials the form below runs as a <b>dry-run</b>: nothing is created on the backend, but the link shape <code>{live.backendUrl}/?instanceUuid=…</code> is shown so the client-page flow can still be tested.
            </p>
          </Panel>
        </div>
      ) : (
        <div className="mt-5">
          <Panel title="Instances">
            {r.instances.length === 0 ? (
              <p className="text-sm text-ink-500">No instances on the backend yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-admin">
                  <thead>
                    <tr>
                      <th>Assigned to</th>
                      <th>Instance</th>
                      <th>Status</th>
                      <th>Display used / limit</th>
                      <th>Real used / limit</th>
                      <th>Expires</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.instances.map((i) => (
                      <tr key={i.uuid}>
                        <td className="font-medium text-ink-900">{i.assignedTo ?? "—"}</td>
                        <td className="font-mono text-[11px] text-ink-600">{i.instanceId}<div className="text-ink-400">{i.uuid.slice(0, 12)}…</div></td>
                        <td><StatusBadge value={i.status} /></td>
                        <td className="text-xs">{hours(i.displayTimeUsedSeconds)} / {i.displayLimitHours}h</td>
                        <td className="text-xs">{hours(i.realTimeUsedSeconds)} / {i.realLimitHours}h</td>
                        <td className="whitespace-nowrap text-xs">{fmtYerevan(i.expiresAt)}</td>
                        <td>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <CopyButton text={liveLinkFor(i.uuid)} label="Copy link" />
                            <a href={liveLinkFor(i.uuid)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><ExternalLink size={14} /></a>
                            <form action={stopLiveInstanceForm} className="inline">
                              <input type="hidden" name="uuid" value={i.uuid} />
                              <ConfirmSubmit message={`Stop the instance assigned to ${i.assignedTo ?? "this client"}?`}>Stop</ConfirmSubmit>
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
        <Panel title="Create an instance link">
          <form action={createLiveInstanceForm} className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned to" required hint="Client or project name — shown in the backend admin." className="sm:col-span-2">
              <Input name="assignedTo" required placeholder="Aren · kitchen 2026" />
            </Field>
            <Field label="Display limit (hours)" hint="What the client sees as their balance.">
              <Input name="displayLimitHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultDisplayHours} />
            </Field>
            <Field label="Real limit (hours)" hint="Actual GPU time before the instance stops.">
              <Input name="realLimitHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultRealHours} />
            </Field>
            <Field label="Link lifetime (days)"><Input name="days" type="number" min={1} defaultValue={live.defaultDays} /></Field>
            <Field label="Explicit instance id" hint="Optional: bind to an existing AWS instance id."><Input name="explicitInstanceId" placeholder="i-0abc…" /></Field>
            <div className="sm:col-span-2"><SubmitButton pendingText="Creating…">Create link</SubmitButton></div>
          </form>
        </Panel>

        <Panel title="How the streaming works">
          <ul className="space-y-2 text-sm text-ink-600">
            <li><b className="text-ink-900">Backend:</b> the existing <code>live.architeksoft.com</code> service (Node + Pixel Streaming signalling) already runs in production.</li>
            <li><b className="text-ink-900">On demand:</b> when a client opens their link, the backend starts an AWS <code>g4dn</code> GPU instance, waits for the Unreal application, and streams the scene into the browser.</li>
            <li><b className="text-ink-900">Quotas:</b> each link carries a display-time balance (what the client sees), a real-time budget (actual GPU minutes) and an expiry date; when either runs out the session stops.</li>
            <li><b className="text-ink-900">Link:</b> <code>{live.backendUrl}/?instanceUuid=…</code> — share it directly or attach it to a client page in <Link href="/admin/pages" className="text-brand-600">Client pages</Link>.</li>
            <li><b className="text-ink-900">Cost control:</b> stopping an instance here terminates the GPU session immediately; idle instances are stopped by the backend itself.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
