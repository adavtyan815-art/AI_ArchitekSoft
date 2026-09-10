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
import { getAdminDict, labelFor, type AdminDict } from "@/lib/i18n/admin";
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

const TAB_KEYS = ["brand", "smm", "telegram", "integrations", "live", "security"] as const;

const DEFAULT_SECRET = "dev-secret-change-me-please-32-chars-min";

const INTEGRATION_ENVS: Record<string, string[]> = {
  facebook: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"],
  instagram: ["META_IG_USER_ID", "META_PAGE_ACCESS_TOKEN"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORG_URN"],
  youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"],
  tiktok: ["—"],
};

/** Sticky save bar: fixed above the mobile tab bar, inline from sm up. */
function SaveBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[72px] z-10 -mx-4 mt-3 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const { t } = await getAdminDict();
  const L = t.settings;
  const sp = await searchParams;
  const tab = (TAB_KEYS as readonly string[]).includes(first(sp.tab)) ? first(sp.tab) : "brand";
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const tg = getSetting("telegram");
  const live = getSetting("live");
  const ai = aiStatus();
  const tabs = TAB_KEYS.map((k) => ({ key: k, label: L.tabs[k] }));

  return (
    <>
      <PageHeader title={L.title} subtitle={L.subtitle} />
      <Notice text={sp.notice} tone={sp.tone} />
      <Tabs items={tabs} current={tab} base="/admin/settings" />

      {tab === "brand" ? (
        <Panel title={L.brand.panel}>
          <form action={saveBrandAction} className="grid gap-4 sm:grid-cols-2">
            <Field label={L.brand.name} required><Input name="name" defaultValue={brand.name} required /></Field>
            <Field label={L.brand.tagline}><Input name="tagline" defaultValue={brand.tagline} /></Field>
            <Field label={L.brand.phone}><Input name="phone" defaultValue={brand.phone} /></Field>
            <Field label={L.brand.phone2}><Input name="phone2" defaultValue={brand.phone2} /></Field>
            <Field label={L.brand.email}><Input name="email" defaultValue={brand.email} /></Field>
            <Field label={L.brand.telegram}><Input name="telegram" defaultValue={brand.telegram} placeholder="@ArchiTek_Soft" /></Field>
            <Field label={L.brand.whatsapp}><Input name="whatsapp" defaultValue={brand.whatsapp} placeholder="+374…" /></Field>
            <Field label={L.brand.address}><Input name="address" defaultValue={brand.address} /></Field>
            <Field label={L.brand.website}><Input name="website" defaultValue={brand.website} /></Field>
            <Field label={L.brand.workingHours}><Input name="workingHours" defaultValue={brand.workingHours} /></Field>
            <Field label={L.brand.instagram}><Input name="instagram" defaultValue={brand.instagram} /></Field>
            <Field label={L.brand.facebook}><Input name="facebook" defaultValue={brand.facebook} /></Field>
            <Field label={L.brand.linkedin}><Input name="linkedin" defaultValue={brand.linkedin} /></Field>
            <Field label={L.brand.youtube}><Input name="youtube" defaultValue={brand.youtube} /></Field>
            <Field label={L.brand.tiktok}><Input name="tiktok" defaultValue={brand.tiktok} /></Field>
            <Field label={L.brand.defaultLanguage} hint={L.brand.defaultLanguageHint}>
              <Select name="defaultLanguage" defaultValue={brand.defaultLanguage}>
                <option value="hy">Հայերեն</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <SaveBar>
                <SubmitButton variant="brand" pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.brand.save}</SubmitButton>
              </SaveBar>
            </div>
          </form>
        </Panel>
      ) : null}

      {tab === "smm" ? (
        <Panel title={L.smm.panel}>
          <form action={saveSmmAction} className="space-y-5">
            <div>
              <span className="label">{L.smm.defaultPlatforms}</span>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <label key={p} className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm has-[:checked]:border-fg has-[:checked]:bg-surface-2">
                    <input type="checkbox" name="defaultPlatforms" value={p} defaultChecked={smm.defaultPlatforms.includes(p)} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
                    <PlatformChip platform={p} meta={PLATFORM_META[p]} />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.smm.leadTime} hint={L.smm.leadTimeHint}>
                <Input name="approvalLeadMinutes" type="number" min={0} max={10080} defaultValue={smm.approvalLeadMinutes} />
              </Field>
              <Field label={L.smm.postingTime}><Input name="postingTime" type="time" defaultValue={smm.postingTime} className="min-w-0" /></Field>
              <Field label={L.smm.autoPublish} hint={L.smm.autoPublishHint}>
                <label className="mt-2 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="autoPublishAfterApproval" defaultChecked={smm.autoPublishAfterApproval} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
                  {L.smm.autoPublishLabel}
                </label>
              </Field>
            </div>

            <div>
              <span className="label">{L.smm.postingDays}</span>
              <div className="flex flex-wrap gap-2">
                {L.smm.weekdays.map((label, i) => (
                  <label key={label} className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[13.5px] has-[:checked]:border-fg has-[:checked]:bg-surface-2">
                    <input type="checkbox" name="postingDays" value={i + 1} defaultChecked={smm.postingDays.includes(i + 1)} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.smm.hashtagsHy} hint={L.smm.onePerLine}><Textarea name="hashtagsHy" defaultValue={smm.hashtagsHy.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label={L.smm.hashtagsRu} hint={L.smm.onePerLine}><Textarea name="hashtagsRu" defaultValue={smm.hashtagsRu.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label={L.smm.hashtagsEn} hint={L.smm.onePerLine}><Textarea name="hashtagsEn" defaultValue={smm.hashtagsEn.join("\n")} className="min-h-[140px] font-mono text-xs" /></Field>
            </div>

            <Field label={L.smm.brandVoice} hint={L.smm.brandVoiceHint}>
              <Textarea name="brandVoice" defaultValue={smm.brandVoice} className="min-h-[110px]" />
            </Field>

            <SaveBar>
              <SubmitButton variant="brand" pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.smm.save}</SubmitButton>
            </SaveBar>
          </form>
        </Panel>
      ) : null}

      {tab === "telegram" ? <TelegramTab tg={tg} L={L} /> : null}

      {tab === "integrations" ? (
        <div className="space-y-5">
          <Panel title={L.integrations.publishing}>
            <div className="overflow-x-auto">
              <table className="table-admin table-responsive">
                <thead>
                  <tr>
                    <th>{L.integrations.platform}</th>
                    <th>{L.integrations.status}</th>
                    <th>{L.integrations.envVars}</th>
                    <th>{L.integrations.note}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(platformStatus()).map(([p, st]) => (
                    <tr key={p}>
                      <td data-label={L.integrations.platform}><PlatformChip platform={p} meta={PLATFORM_META[p]} /></td>
                      <td data-label={L.integrations.status}><StatusBadge value={st} label={labelFor(t, "connection", st)} /></td>
                      <td data-label={L.integrations.envVars} className="font-mono text-[11px] whitespace-nowrap text-fg-2">{INTEGRATION_ENVS[p]?.join(", ")}</td>
                      <td data-label={L.integrations.note} className="max-w-[520px] text-xs text-fg-2">{L.integrations.notes[p as keyof typeof L.integrations.notes]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{L.integrations.dryRunNote}</p>
          </Panel>

          <Panel title={L.integrations.ai}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`inline-block h-2 w-2 ${ai.provider === "template" ? "bg-warning" : "bg-success"}`} />
              <b className="font-semibold text-fg">{ai.provider}</b>
              <span className="text-muted">{ai.provider === "template" ? t.smm.templatesModel : ai.model}</span>
              <span className="ml-auto font-mono text-[11px] text-fg-2">ANTHROPIC_API_KEY · ANTHROPIC_MODEL · GEMINI_API_KEY · GEMINI_MODEL</span>
            </div>
            <p className="mt-2 text-xs text-muted">{L.integrations.aiOrder}</p>
          </Panel>

          <Panel title={L.integrations.app}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">APP_URL</dt><dd className="font-mono text-xs text-fg">{env.appUrl}</dd></div>
              <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.integrations.db}</dt><dd className="font-mono text-xs break-all text-fg">{env.databasePath}</dd></div>
              <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.integrations.uploads}</dt><dd className="font-mono text-xs break-all text-fg">{env.uploadDir}</dd></div>
              <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.integrations.worker}</dt><dd className="font-mono text-xs text-fg">{String(env.runWorkerInApp)}</dd></div>
            </dl>
          </Panel>
        </div>
      ) : null}

      {tab === "live" ? (
        <div className="space-y-5">
          <Panel title={L.live.panel}>
            <form action={saveLiveAction} className="grid gap-4 sm:grid-cols-2">
              <Field label={L.live.backendUrl} hint={L.live.backendHint} className="sm:col-span-2">
                <Input name="backendUrl" defaultValue={live.backendUrl} />
              </Field>
              <Field label={L.live.displayHours}><Input name="defaultDisplayHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultDisplayHours} /></Field>
              <Field label={L.live.realHours} hint={L.live.realHint}><Input name="defaultRealHours" type="number" step="0.5" min={0.5} defaultValue={live.defaultRealHours} /></Field>
              <Field label={L.live.days}><Input name="defaultDays" type="number" min={1} defaultValue={live.defaultDays} /></Field>
              <div className="sm:col-span-2">
                <SaveBar>
                  <SubmitButton variant="brand" pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.live.save}</SubmitButton>
                </SaveBar>
              </div>
            </form>
            <form action={testLiveConnectionAction} className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <SubmitButton variant="secondary" pendingText={L.live.testing}>{L.live.test}</SubmitButton>
              <span className="text-xs text-muted">{liveConfigured() ? L.live.credsSet : L.live.credsMissing}</span>
            </form>
          </Panel>
          <Panel title={L.live.how}>
            <p className="text-sm text-fg-2">
              {L.live.howText1} <code className="font-mono text-xs">{live.backendUrl}</code> {L.live.howText2}{" "}
              <Link href="/admin/live" className="font-medium text-accent hover:underline">{L.live.howLink}</Link>.
            </p>
            <p className="mt-2 text-xs text-muted">{L.live.premium}</p>
          </Panel>
        </div>
      ) : null}

      {tab === "security" ? <SecurityTab userId={user.id} L={L} /> : null}
    </>
  );
}

async function TelegramTab({ tg, L }: { tg: TelegramSettings; L: AdminDict["settings"] }) {
  const me = telegramEnabled() ? await getMe().catch(() => null) : null;
  return (
    <div className="space-y-5">
      <Panel title={L.telegram.botStatus}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {me ? (
            <>
              <CheckCircle2 size={16} className="text-success" />
              <span className="text-fg">{L.telegram.connectedAs} <b>@{me.username}</b> ({me.first_name}, id {me.id})</span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="text-warning" />
              <span className="text-fg">{telegramEnabled() ? L.telegram.tokenFail : L.telegram.noToken}</span>
            </>
          )}
          <span className="ml-auto font-mono text-[11px] break-all text-muted">{L.telegram.webhook}: {env.appUrl}/api/telegram/webhook</span>
          <CopyButton text={`${env.appUrl}/api/telegram/webhook`} label={L.telegram.copyWebhook} />
        </div>
      </Panel>

      <Panel title={L.telegram.chats}>
        <form action={saveTelegramAction} className="grid gap-4 sm:grid-cols-2">
          <Field label={L.telegram.adminChatId} hint={L.telegram.adminChatHint}>
            <Input name="adminChatId" defaultValue={tg.adminChatId} placeholder="123456789" />
          </Field>
          <Field label={L.telegram.channelId} hint={L.telegram.channelHint}>
            <Input name="channelId" defaultValue={tg.channelId} placeholder="@architeksoft" />
          </Field>
          <Field label={L.telegram.digest} hint={L.telegram.digestHint}><Input name="dailyDigestTime" defaultValue={tg.dailyDigestTime} placeholder="09:00" /></Field>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyNewLeads" defaultChecked={tg.notifyNewLeads} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" /> {L.telegram.notifyLeads}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyClientFeedback" defaultChecked={tg.notifyClientFeedback} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" /> {L.telegram.notifyFeedback}</label>
          </div>
          <div className="sm:col-span-2">
            <SaveBar>
              <SubmitButton variant="brand" pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.telegram.save}</SubmitButton>
            </SaveBar>
          </div>
        </form>

        <form action={sendTelegramTestAction} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <input type="hidden" name="adminChatId" value={tg.adminChatId} />
          <SubmitButton variant="secondary" pendingText={L.telegram.sending}>{L.telegram.test}</SubmitButton>
          <span className="text-xs text-muted">{L.telegram.testHint}</span>
        </form>
      </Panel>

      <Panel title={L.telegram.howTo}>
        <ol className="list-decimal space-y-2 pl-5 text-[13.5px] text-fg-2 marker:font-mono marker:text-muted">
          <li>{L.telegram.step1a} <code className="font-mono text-xs">/start</code>{me ? <> (<b>@{me.username}</b>)</> : null}</li>
          <li>{L.telegram.step2a} <code className="font-mono text-xs">/chatid</code> {L.telegram.step2b}</li>
          <li>{L.telegram.step3a} <code className="font-mono text-xs">/setadmin</code> {L.telegram.step3b}</li>
          <li>{L.telegram.step4}</li>
        </ol>
        <p className="mt-3 text-xs text-muted">{L.telegram.onlyAdmin}</p>
      </Panel>
    </div>
  );
}

async function SecurityTab({ userId, L }: { userId: string; L: AdminDict["settings"] }) {
  const db = getDb();
  const sessions = db.select({ c: sql<number>`count(*)` }).from(schema.sessions).where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, nowIso()))).get()?.c ?? 0;
  const weakSecret = env.secret === DEFAULT_SECRET;
  return (
    <div className="space-y-5">
      {weakSecret ? (
        <div className="flex items-start gap-3 rounded-sm border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] text-warning">
          <AlertTriangle size={16} className="mt-0.5 flex-none" />
          <span>
            <b>{L.security.weakSecretTitle}</b> {L.security.weakSecretText}
          </span>
        </div>
      ) : null}

      <Panel title={L.security.changePassword}>
        <form action={changePasswordAction} className="grid max-w-md gap-4">
          <Field label={L.security.newPassword} required hint={L.security.passwordHint}><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label={L.security.repeat} required><Input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <SaveBar>
            <SubmitButton variant="brand" pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.security.save}</SubmitButton>
          </SaveBar>
        </form>
      </Panel>

      <Panel title={L.security.session}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.security.activeSessions}</dt><dd className="text-fg">{sessions}</dd></div>
          <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">APP_URL</dt><dd className="font-mono text-xs break-all text-fg">{env.appUrl}</dd></div>
          <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.security.appSecret}</dt><dd className={weakSecret ? "text-warning" : "text-fg"}>{weakSecret ? L.security.secretDefault : L.security.secretCustom}</dd></div>
          <div><dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{L.security.environment}</dt><dd className="text-fg">{env.isProd ? L.security.production : L.security.development}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          {L.security.sessionNote}{" "}
          <a href={env.appUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{env.appUrl} <ExternalLink size={11} /></a>
        </p>
      </Panel>
    </div>
  );
}
