import Link from "next/link";
import { and, eq, gt, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { getSetting, type TelegramSettings } from "@/lib/settings";
import { PLATFORMS, aiStatus } from "@/lib/ai";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { getMe, telegramEnabled } from "@/lib/telegram";
import { liveConfigured } from "@/lib/live";
import { nowIso } from "@/lib/utils";
import { PageHeader, Panel, StatusBadge, Tabs } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { SubmitButton } from "@/components/admin/form-buttons";
import { CopyButton } from "@/components/admin/copy-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import {
  changePasswordAction,
  saveBrandAction,
  saveLiveAction,
  saveSmmAction,
  saveTelegramAction,
  sendTelegramTestAction,
  testLiveConnectionAction,
} from "@/app/admin/actions/settings-actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const TABS = [
  { key: "brand", label: "Brand" },
  { key: "smm", label: "SMM" },
  { key: "telegram", label: "Telegram" },
  { key: "integrations", label: "Integrations" },
  { key: "live", label: "Live 3D" },
  { key: "security", label: "Security" },
];

const DAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

const DEFAULT_SECRET = "dev-secret-change-me-please-32-chars-min";

const INTEGRATION_NOTES: Record<string, { envs: string[]; note: string }> = {
  facebook: { envs: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"], note: "Your own Page works with Standard Access — no App Review. Create a Meta app, add the Page, generate a long-lived Page token (the token owner must be an app admin)." },
  instagram: { envs: ["META_IG_USER_ID", "META_PAGE_ACCESS_TOKEN"], note: "Instagram Business/Creator account linked to the Page. Publishing requires the image on a PUBLIC https URL, so APP_URL must be reachable from the internet." },
  linkedin: { envs: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORG_URN"], note: "Company-page posting needs the Community Management API (LinkedIn vetting). A personal profile can post with w_member_social." },
  youtube: { envs: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"], note: "OAuth refresh token via the Data API. Until Google's compliance audit passes, every upload from an unverified project stays PRIVATE." },
  telegram: { envs: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"], note: "Free and instant. The bot must be an administrator of the channel to post; the admin chat id is used for approvals." },
  tiktok: { envs: ["—"], note: "No automated posting: unaudited apps can only create private drafts. The caption is prepared here for a manual upload." },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === first(sp.tab)) ? first(sp.tab) : "brand";
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const tg = getSetting("telegram");
  const live = getSetting("live");
  const ai = aiStatus();

  return (
    <>
      <PageHeader title="Settings" subtitle="Brand data, SMM automation, Telegram approvals, integrations and security. Stored in the database — environment variables act as defaults." />
      <Notice text={sp.notice} tone={sp.tone} />
      <Tabs items={TABS} current={tab} base="/admin/settings" />

      {tab === "brand" ? (
        <Panel title="Brand & contacts">
          <form action={saveBrandAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required><Input name="name" defaultValue={brand.name} required /></Field>
            <Field label="Tagline"><Input name="tagline" defaultValue={brand.tagline} /></Field>
            <Field label="Phone"><Input name="phone" defaultValue={brand.phone} /></Field>
            <Field label="Phone (second)"><Input name="phone2" defaultValue={brand.phone2} /></Field>
            <Field label="Email"><Input name="email" defaultValue={brand.email} /></Field>
            <Field label="Telegram handle"><Input name="telegram" defaultValue={brand.telegram} placeholder="@ArchiTek_Soft" /></Field>
            <Field label="WhatsApp"><Input name="whatsapp" defaultValue={brand.whatsapp} placeholder="+374…" /></Field>
            <Field label="Address"><Input name="address" defaultValue={brand.address} /></Field>
            <Field label="Website"><Input name="website" defaultValue={brand.website} /></Field>
            <Field label="Working hours"><Input name="workingHours" defaultValue={brand.workingHours} /></Field>
            <Field label="Instagram URL"><Input name="instagram" defaultValue={brand.instagram} /></Field>
            <Field label="Facebook URL"><Input name="facebook" defaultValue={brand.facebook} /></Field>
            <Field label="LinkedIn URL"><Input name="linkedin" defaultValue={brand.linkedin} /></Field>
            <Field label="YouTube URL"><Input name="youtube" defaultValue={brand.youtube} /></Field>
            <Field label="TikTok URL"><Input name="tiktok" defaultValue={brand.tiktok} /></Field>
            <Field label="Default language" hint="Used for the composer and public site defaults.">
              <Select name="defaultLanguage" defaultValue={brand.defaultLanguage}>
                <option value="hy">Հայերեն</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save brand settings</SubmitButton></div>
          </form>
        </Panel>
      ) : null}

      {tab === "smm" ? (
        <Panel title="SMM automation">
          <form action={saveSmmAction} className="space-y-5">
            <div>
              <span className="label">Default platforms for a new post</span>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <label key={p} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                    <input type="checkbox" name="defaultPlatforms" value={p} defaultChecked={smm.defaultPlatforms.includes(p)} className="h-4 w-4 rounded border-ink-300" />
                    <PlatformChip platform={p} meta={PLATFORM_META[p]} />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Approval lead time (minutes)" hint="How long before the scheduled time the Telegram approval is sent.">
                <Input name="approvalLeadMinutes" type="number" min={0} max={10080} defaultValue={smm.approvalLeadMinutes} />
              </Field>
              <Field label="Posting time (Yerevan)"><Input name="postingTime" type="time" defaultValue={smm.postingTime} /></Field>
              <Field label="Auto-publish after approval" hint="When off, an approved post waits for a manual Publish.">
                <label className="mt-2 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="autoPublishAfterApproval" defaultChecked={smm.autoPublishAfterApproval} className="h-4 w-4 rounded border-ink-300" />
                  Publish automatically
                </label>
              </Field>
            </div>

            <div>
              <span className="label">Posting days</span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <label key={d.n} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
                    <input type="checkbox" name="postingDays" value={d.n} defaultChecked={smm.postingDays.includes(d.n)} className="h-4 w-4 rounded border-ink-300" />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Hashtags — Armenian" hint="One per line."><Textarea name="hashtagsHy" defaultValue={smm.hashtagsHy.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label="Hashtags — Russian" hint="One per line."><Textarea name="hashtagsRu" defaultValue={smm.hashtagsRu.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label="Hashtags — English" hint="One per line."><Textarea name="hashtagsEn" defaultValue={smm.hashtagsEn.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
            </div>

            <Field label="Brand voice" hint="Given to the AI copywriter with every request.">
              <Textarea name="brandVoice" defaultValue={smm.brandVoice} className="min-h-[110px]" />
            </Field>

            <SubmitButton pendingText="Saving…">Save SMM settings</SubmitButton>
          </form>
        </Panel>
      ) : null}

      {tab === "telegram" ? <TelegramTab tg={tg} /> : null}

      {tab === "integrations" ? (
        <div className="space-y-5">
          <Panel title="Publishing integrations">
            <div className="overflow-x-auto">
              <table className="table-admin">
                <thead><tr><th>Platform</th><th>Status</th><th>Environment variables</th><th>Setup note</th></tr></thead>
                <tbody>
                  {Object.entries(platformStatus()).map(([p, st]) => (
                    <tr key={p}>
                      <td><PlatformChip platform={p} meta={PLATFORM_META[p]} /></td>
                      <td><StatusBadge value={st} /></td>
                      <td className="whitespace-nowrap font-mono text-[11px] text-ink-600">{INTEGRATION_NOTES[p]?.envs.join(", ")}</td>
                      <td className="max-w-[520px] text-xs text-ink-600">{INTEGRATION_NOTES[p]?.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              <b>dry-run</b> means no credentials are present: the adapter simulates the call and the variant is recorded as <i>simulated</i>, so the whole flow (generate → approve → publish → log) can be tested safely.
            </p>
          </Panel>

          <Panel title="AI copywriter">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${ai.provider === "template" ? "bg-amber-500" : "bg-green-500"}`} />
              <b className="font-semibold text-ink-900">{ai.provider}</b>
              <span className="text-ink-500">{ai.model}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-600">ANTHROPIC_API_KEY · ANTHROPIC_MODEL · GEMINI_API_KEY · GEMINI_MODEL</span>
            </div>
            <p className="mt-2 text-xs text-ink-500">Order: Claude → Gemini → built-in trilingual templates. Nothing breaks without a key; only the wording quality changes.</p>
          </Panel>

          <Panel title="Application">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">APP_URL</dt><dd className="font-mono text-xs text-ink-900">{env.appUrl}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Database</dt><dd className="font-mono text-xs text-ink-900">{env.databasePath}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Uploads</dt><dd className="font-mono text-xs text-ink-900">{env.uploadDir}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Worker in app</dt><dd className="font-mono text-xs text-ink-900">{String(env.runWorkerInApp)}</dd></div>
            </dl>
          </Panel>
        </div>
      ) : null}

      {tab === "live" ? (
        <div className="space-y-5">
          <Panel title="Live 3D backend">
            <form action={saveLiveAction} className="grid gap-4 sm:grid-cols-2">
              <Field label="Backend URL" hint="The Pixel Streaming admin API (website/ project)." className="sm:col-span-2">
                <Input name="backendUrl" defaultValue={live.backendUrl} />
              </Field>
              <Field label="Default display hours"><Input name="defaultDisplayHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultDisplayHours} /></Field>
              <Field label="Default real hours" hint="Actual GPU time budget."><Input name="defaultRealHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultRealHours} /></Field>
              <Field label="Default link lifetime (days)"><Input name="defaultDays" type="number" min={1} defaultValue={live.defaultDays} /></Field>
              <div className="sm:col-span-2 flex gap-2"><SubmitButton pendingText="Saving…">Save Live settings</SubmitButton></div>
            </form>
            <form action={testLiveConnectionAction} className="mt-4 border-t border-line pt-4">
              <SubmitButton variant="secondary" pendingText="Connecting…">Test connection</SubmitButton>
              <span className="ml-3 text-xs text-ink-500">{liveConfigured() ? "LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD are set." : "LIVE_ADMIN_USERNAME / LIVE_ADMIN_PASSWORD are not set — the admin API cannot be called."}</span>
            </form>
          </Panel>
          <Panel title="How it works">
            <p className="text-sm text-ink-600">
              The backend at <code>{live.backendUrl}</code> starts an AWS g4dn instance on demand and streams the Unreal scene to the browser. Each client gets a personal link{" "}
              <code>{live.backendUrl}/?instanceUuid=…</code> with display/real time quotas and an expiry date. Create and stop instances in <Link href="/admin/live" className="text-brand-600">Live 3D</Link>.
            </p>
          </Panel>
        </div>
      ) : null}

      {tab === "security" ? <SecurityTab userId={user.id} /> : null}
    </>
  );
}

async function TelegramTab({ tg }: { tg: TelegramSettings }) {
  const me = telegramEnabled() ? await getMe().catch(() => null) : null;
  return (
    <div className="space-y-5">
      <Panel title="Bot status">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {me ? (
            <>
              <CheckCircle2 size={16} className="text-success-500" />
              <span className="text-ink-900">Connected as <b>@{me.username}</b> ({me.first_name}, id {me.id})</span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-ink-900">{telegramEnabled() ? "TELEGRAM_BOT_TOKEN is set but getMe() failed — check the token or the network." : "No TELEGRAM_BOT_TOKEN — approvals and notifications run as a dry-run (logged in the server console)."}</span>
            </>
          )}
          <span className="ml-auto font-mono text-[11px] text-ink-500">webhook: {env.appUrl}/api/telegram/webhook</span>
          <CopyButton text={`${env.appUrl}/api/telegram/webhook`} label="Copy webhook URL" />
        </div>
      </Panel>

      <Panel title="Chats & notifications">
        <form action={saveTelegramAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Admin chat id" hint="Your private chat with the bot — approvals and alerts go here.">
            <Input name="adminChatId" defaultValue={tg.adminChatId} placeholder="123456789" />
          </Field>
          <Field label="Channel id" hint="Public channel for publishing, e.g. @architeksoft or -1001234567890. The bot must be an admin.">
            <Input name="channelId" defaultValue={tg.channelId} placeholder="@architeksoft" />
          </Field>
          <Field label="Daily digest time (Yerevan)" hint="Empty to disable."><Input name="dailyDigestTime" defaultValue={tg.dailyDigestTime} placeholder="09:00" /></Field>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyNewLeads" defaultChecked={tg.notifyNewLeads} className="h-4 w-4 rounded border-ink-300" /> Notify on new leads</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyClientFeedback" defaultChecked={tg.notifyClientFeedback} className="h-4 w-4 rounded border-ink-300" /> Notify on client-page feedback</label>
          </div>
          <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save Telegram settings</SubmitButton></div>
        </form>

        <form action={sendTelegramTestAction} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <input type="hidden" name="adminChatId" value={tg.adminChatId} />
          <SubmitButton variant="secondary" pendingText="Sending…">Send test message</SubmitButton>
          <span className="text-xs text-ink-500">Sends to the saved admin chat id. Save the settings first if you just changed it.</span>
        </form>
      </Panel>

      <Panel title="How to detect your chat id">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-600">
          <li>Open Telegram and send <code>/start</code> to your bot{me ? <> (<b>@{me.username}</b>)</> : null}.</li>
          <li>Send <code>/chatid</code> — the bot replies with the numeric id of the chat.</li>
          <li>Send <code>/setadmin</code> from that chat to store it as the admin chat automatically, or paste the number above and save.</li>
          <li>For a channel: add the bot as an administrator, then use <code>@channelname</code> (public) or the <code>-100…</code> id (private).</li>
        </ol>
        <p className="mt-3 text-xs text-ink-500">The bot only reacts to the configured admin chat; other chats are ignored.</p>
      </Panel>
    </div>
  );
}

async function SecurityTab({ userId }: { userId: string }) {
  const db = getDb();
  const sessions = db.select({ c: sql<number>`count(*)` }).from(schema.sessions).where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, nowIso()))).get()?.c ?? 0;
  const weakSecret = env.secret === DEFAULT_SECRET;
  return (
    <div className="space-y-5">
      {weakSecret ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 flex-none" />
          <span>
            <b>APP_SECRET is still the development default.</b> It signs sessions and the daily analytics visitor hash. Set a random 32+ character value in <code>.env</code> before going live — every existing session becomes invalid when you change it.
          </span>
        </div>
      ) : null}

      <Panel title="Change password">
        <form action={changePasswordAction} className="grid max-w-md gap-4">
          <Field label="New password" required hint="At least 8 characters."><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Repeat password" required><Input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <div><SubmitButton pendingText="Saving…">Change password</SubmitButton></div>
        </form>
      </Panel>

      <Panel title="Session & environment">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Active sessions</dt><dd className="text-ink-900">{sessions}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">APP_URL</dt><dd className="font-mono text-xs text-ink-900">{env.appUrl}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">APP_SECRET</dt><dd className={weakSecret ? "text-amber-700" : "text-ink-900"}>{weakSecret ? "default (change it)" : "custom value set"}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Environment</dt><dd className="text-ink-900">{env.isProd ? "production" : "development"}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-ink-500">
          Sessions are stored server-side (sha256 of the cookie token) and expire automatically. Public link:{" "}
          <a href={env.appUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600">{env.appUrl} <ExternalLink size={11} /></a>
        </p>
      </Panel>
    </div>
  );
}
