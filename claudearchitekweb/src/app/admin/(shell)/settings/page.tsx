import Link from "next/link";
import { and, eq, gt, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { getSetting, type TelegramSettings } from "@/lib/settings";
import { PLATFORMS, aiStatus } from "@/lib/ai";
import { PLATFORM_META, platformStatus } from "@/lib/social";
import { getMe, setAdminCode, telegramEnabled } from "@/lib/telegram";
import { liveConfigured } from "@/lib/live";
import { nowIso } from "@/lib/utils";
import { getAdminDict, labelFor, local, type AdminDict, type AdminLocale } from "@/lib/i18n/admin";
import { PageHeader, Panel, StatusBadge, Tabs } from "@/components/admin/shell";
import { Notice } from "@/components/admin/notice";
import { PlatformChip } from "@/components/admin/smm/platform-chip";
import { SubmitButton } from "@/components/admin/form-buttons";
import { CopyButton } from "@/components/admin/copy-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PasswordForm } from "./password-form";
import {
  readSettingsDraft,
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


/** Wording this page adds on top of the shared admin dictionary. */
const extra = (locale: AdminLocale) =>
  local(
    {
      hy: {
        polling: "Բոտն ինքը հարցնում է Telegram-ին (long polling)։ Webhook պետք չէ և չկա — մի գրանցիր այն, այլապես բոտը կդադարի պատասխանել։",
        setAdminTitle: "Ադմինի չաթը կապելու կոդը",
        setAdminText: "Բոտին ուղարկիր",
        setAdminAfter: "այս կոդով, և տվյալ չաթը կդառնա ադմինի չաթը։",
        copyCommand: "Պատճենել հրամանը",
        copied: "Պատճենված է",
        clearAdminChat: "Մաքրել ադմինի չաթի id-ն",
        keepAdminChatHint: "Դատարկ դաշտը ոչինչ չի փոխում։ Մաքրելու համար նշիր վանդակը։",
        postingUseHint: "Օգտագործվում է որպես նոր փոստերի առաջարկվող ժամանակը։",
        currentPassword: "Ընթացիկ գաղտնաբառը",
        currentPasswordHint: "Անհրաժեշտ է՝ բացված սեսիան միայնակ չկարողանա փոխել գաղտնաբառը։",
        passwordMismatch: "Գաղտնաբառերը չեն համընկնում։",
        signsOutOthers: "Փոխելուց հետո մյուս բոլոր սարքերի սեսիաները կփակվեն։ Այս դիտարկիչը կմնա մուտք գործած։",
      },
      en: {
        polling: "The bot asks Telegram for updates itself (long polling). There is no webhook route — do not register one, or the bot stops answering.",
        setAdminTitle: "Code to bind the admin chat",
        setAdminText: "Send the bot",
        setAdminAfter: "with this code and that chat becomes the admin chat.",
        copyCommand: "Copy the command",
        copied: "Copied",
        clearAdminChat: "Clear the admin chat id",
        keepAdminChatHint: "An empty field changes nothing. Tick the box to clear it.",
        postingUseHint: "Used as the suggested time for new posts.",
        currentPassword: "Current password",
        currentPasswordHint: "Required, so an open session alone cannot take the account over.",
        passwordMismatch: "Passwords do not match.",
        signsOutOthers: "Every other signed-in device is signed out; this browser stays in.",
      },
    },
    locale
  );

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
  const { t, locale } = await getAdminDict();
  const L = t.settings;
  const X = extra(locale);
  const sp = await searchParams;
  const tab = (TAB_KEYS as readonly string[]).includes(first(sp.tab)) ? first(sp.tab) : "brand";
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const tg = getSetting("telegram");
  const live = getSetting("live");
  const ai = aiStatus();
  const tabs = TAB_KEYS.map((k) => ({ key: k, label: L.tabs[k] }));
  // What the admin typed in the submit that was just rejected. Without it the redirect re-renders the
  // form from the stored settings and every unsaved edit is gone.
  const draft = await readSettingsDraft(tab);
  const d = (key: string, stored: string) => {
    const v = draft?.values[key];
    return typeof v === "string" ? v : stored;
  };
  const draftList = (key: string, stored: string[]) => {
    const v = draft?.values[key];
    return Array.isArray(v) ? v : stored;
  };
  const draftBool = (key: string, stored: boolean) => {
    const v = draft?.values[key];
    return typeof v === "boolean" ? v : stored;
  };
  /** Marks the one field the server rejected. */
  const bad = (key: string) => (draft?.field === key ? true : undefined);

  return (
    <>
      <PageHeader title={L.title} subtitle={L.subtitle} />
      <Notice text={sp.notice} tone={sp.tone} />
      <Tabs items={tabs} current={tab} base="/admin/settings" />

      {tab === "brand" ? (
        <Panel title={L.brand.panel}>
          <form action={saveBrandAction} className="grid gap-4 sm:grid-cols-2">
            <Field label={L.brand.name} required><Input name="name" defaultValue={d("name", brand.name)} required maxLength={80} aria-invalid={bad("name")} /></Field>
            <Field label={L.brand.tagline}><Input name="tagline" defaultValue={d("tagline", brand.tagline)} maxLength={160} aria-invalid={bad("tagline")} /></Field>
            {/* type=tel/email give the right keyboard and catch the obvious mistakes early. The link
                fields stay type=text on purpose: people paste "facebook.com/ArchiTekSoft", which the
                action turns into a full URL before validating — type=url would refuse it in the browser. */}
            <Field label={L.brand.phone}><Input name="phone" type="tel" inputMode="tel" defaultValue={d("phone", brand.phone)} placeholder="+374…" aria-invalid={bad("phone")} /></Field>
            <Field label={L.brand.phone2}><Input name="phone2" type="tel" inputMode="tel" defaultValue={d("phone2", brand.phone2)} placeholder="+374…" aria-invalid={bad("phone2")} /></Field>
            <Field label={L.brand.email}><Input name="email" type="email" inputMode="email" autoComplete="email" defaultValue={d("email", brand.email)} aria-invalid={bad("email")} /></Field>
            <Field label={L.brand.telegram}><Input name="telegram" defaultValue={d("telegram", brand.telegram)} placeholder="@ArchiTek_Soft" aria-invalid={bad("telegram")} /></Field>
            <Field label={L.brand.whatsapp}><Input name="whatsapp" type="tel" inputMode="tel" defaultValue={d("whatsapp", brand.whatsapp)} placeholder="+374…" aria-invalid={bad("whatsapp")} /></Field>
            <Field label={L.brand.address}><Input name="address" defaultValue={d("address", brand.address)} maxLength={200} aria-invalid={bad("address")} /></Field>
            <Field label={L.brand.website}><Input name="website" inputMode="url" defaultValue={d("website", brand.website)} placeholder="https://…" aria-invalid={bad("website")} /></Field>
            <Field label={L.brand.workingHours}><Input name="workingHours" defaultValue={d("workingHours", brand.workingHours)} maxLength={120} aria-invalid={bad("workingHours")} /></Field>
            <Field label={L.brand.instagram}><Input name="instagram" inputMode="url" defaultValue={d("instagram", brand.instagram)} placeholder="https://instagram.com/…" aria-invalid={bad("instagram")} /></Field>
            <Field label={L.brand.facebook}><Input name="facebook" inputMode="url" defaultValue={d("facebook", brand.facebook)} placeholder="https://facebook.com/…" aria-invalid={bad("facebook")} /></Field>
            <Field label={L.brand.linkedin}><Input name="linkedin" inputMode="url" defaultValue={d("linkedin", brand.linkedin)} placeholder="https://linkedin.com/company/…" aria-invalid={bad("linkedin")} /></Field>
            <Field label={L.brand.youtube}><Input name="youtube" inputMode="url" defaultValue={d("youtube", brand.youtube)} placeholder="https://youtube.com/@…" aria-invalid={bad("youtube")} /></Field>
            <Field label={L.brand.tiktok}><Input name="tiktok" inputMode="url" defaultValue={d("tiktok", brand.tiktok)} placeholder="https://tiktok.com/@…" aria-invalid={bad("tiktok")} /></Field>
            <Field label={L.brand.defaultLanguage} hint={L.brand.defaultLanguageHint}>
              <Select name="defaultLanguage" defaultValue={d("defaultLanguage", brand.defaultLanguage)}>
                <option value="hy">Հայերեն</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <SaveBar>
                <SubmitButton pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.brand.save}</SubmitButton>
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
              {/* min-h-11: a chip is a tap target, not a line of text. */}
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <label key={p} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-3 py-1.5 text-sm has-[:checked]:border-fg has-[:checked]:bg-surface-2">
                    <input type="checkbox" name="defaultPlatforms" value={p} defaultChecked={draftList("defaultPlatforms", smm.defaultPlatforms).includes(p)} className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" />
                    <PlatformChip platform={p} meta={PLATFORM_META[p]} />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.smm.leadTime} hint={L.smm.leadTimeHint}>
                <Input name="approvalLeadMinutes" type="number" min={0} max={10080} defaultValue={d("approvalLeadMinutes", String(smm.approvalLeadMinutes))} aria-invalid={bad("approvalLeadMinutes")} />
              </Field>
              <Field label={L.smm.postingTime} hint={X.postingUseHint}>
                <Input name="postingTime" type="time" defaultValue={d("postingTime", smm.postingTime)} className="min-w-0" aria-invalid={bad("postingTime")} />
              </Field>
              <Field label={L.smm.autoPublish} hint={L.smm.autoPublishHint}>
                <label className="-mx-2 mt-1 flex min-h-11 cursor-pointer items-center gap-2.5 px-2 text-sm">
                  <input type="checkbox" name="autoPublishAfterApproval" defaultChecked={draftBool("autoPublishAfterApproval", smm.autoPublishAfterApproval)} className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" />
                  {L.smm.autoPublishLabel}
                </label>
              </Field>
            </div>

            <div>
              <span className="label">{L.smm.postingDays}</span>
              <span className="field-hint mb-2 block">{X.postingUseHint}</span>
              <div className="flex flex-wrap gap-2">
                {L.smm.weekdays.map((label, i) => (
                  <label key={label} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-3 py-1.5 text-[13.5px] has-[:checked]:border-fg has-[:checked]:bg-surface-2">
                    <input type="checkbox" name="postingDays" value={i + 1} defaultChecked={draftList("postingDays", smm.postingDays.map(String)).includes(String(i + 1))} className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.smm.hashtagsHy} hint={L.smm.onePerLine}><Textarea name="hashtagsHy" defaultValue={d("hashtagsHy", smm.hashtagsHy.join("\n"))} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label={L.smm.hashtagsRu} hint={L.smm.onePerLine}><Textarea name="hashtagsRu" defaultValue={d("hashtagsRu", smm.hashtagsRu.join("\n"))} className="min-h-[140px] font-mono text-xs" /></Field>
              <Field label={L.smm.hashtagsEn} hint={L.smm.onePerLine}><Textarea name="hashtagsEn" defaultValue={d("hashtagsEn", smm.hashtagsEn.join("\n"))} className="min-h-[140px] font-mono text-xs" /></Field>
            </div>

            <Field label={L.smm.brandVoice} hint={L.smm.brandVoiceHint}>
              <Textarea name="brandVoice" defaultValue={d("brandVoice", smm.brandVoice)} className="min-h-[110px]" aria-invalid={bad("brandVoice")} />
            </Field>

            <SaveBar>
              <SubmitButton pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.smm.save}</SubmitButton>
            </SaveBar>
          </form>
        </Panel>
      ) : null}

      {tab === "telegram" ? <TelegramTab tg={tg} L={L} X={X} d={d} bad={bad} draftBool={draftBool} /> : null}

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
                <Input name="backendUrl" type="url" inputMode="url" placeholder="https://…" defaultValue={d("backendUrl", live.backendUrl)} aria-invalid={bad("backendUrl")} />
              </Field>
              <Field label={L.live.displayHours}><Input name="defaultDisplayHours" type="number" step="0.5" min={0.5} defaultValue={d("defaultDisplayHours", String(live.defaultDisplayHours))} aria-invalid={bad("defaultDisplayHours")} /></Field>
              <Field label={L.live.realHours} hint={L.live.realHint}><Input name="defaultRealHours" type="number" step="0.5" min={0.5} defaultValue={d("defaultRealHours", String(live.defaultRealHours))} aria-invalid={bad("defaultRealHours")} /></Field>
              <Field label={L.live.days}><Input name="defaultDays" type="number" min={1} defaultValue={d("defaultDays", String(live.defaultDays))} aria-invalid={bad("defaultDays")} /></Field>
              <div className="sm:col-span-2">
                <SaveBar>
                  <SubmitButton pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.live.save}</SubmitButton>
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
              {L.live.howText1} <code className="font-mono text-xs [overflow-wrap:anywhere]">{live.backendUrl}</code> {L.live.howText2}{" "}
              <Link href="/admin/live" className="inline-flex min-h-10 items-center font-medium text-accent hover:underline">{L.live.howLink}</Link>.
            </p>
            <p className="mt-2 text-xs text-muted">{L.live.premium}</p>
          </Panel>
        </div>
      ) : null}

      {tab === "security" ? <SecurityTab userId={user.id} L={L} X={X} /> : null}
    </>
  );
}

type DraftHelpers = {
  d: (key: string, stored: string) => string;
  bad: (key: string) => true | undefined;
  draftBool: (key: string, stored: boolean) => boolean;
};

async function TelegramTab({ tg, L, X, d, bad, draftBool }: { tg: TelegramSettings; L: AdminDict["settings"]; X: ReturnType<typeof extra> } & DraftHelpers) {
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
        </div>
        {/* There is no /api/telegram/webhook route: the bot long-polls getUpdates. The page used to
            offer that URL with a copy button, and registering it makes Telegram answer getUpdates
            with 409 — approvals and commands stop without a visible error. */}
        <p className="mt-3 text-xs text-muted">{X.polling}</p>
      </Panel>

      {!tg.adminChatId ? (
        <Panel title={X.setAdminTitle}>
          <p className="text-[13.5px] text-fg-2">
            {X.setAdminText} <code className="font-mono text-xs">/setadmin {setAdminCode()}</code> {X.setAdminAfter}
          </p>
          <div className="mt-3">
            <CopyButton text={`/setadmin ${setAdminCode()}`} label={X.copyCommand} copiedLabel={X.copied} />
          </div>
        </Panel>
      ) : null}

      <Panel title={L.telegram.chats}>
        <form action={saveTelegramAction} className="grid gap-4 sm:grid-cols-2">
          {/* The bot's /setadmin can store the chat id while this form is open: the action compares the
              value against what the form was rendered with and never overwrites a newer id by accident. */}
          <input type="hidden" name="adminChatIdPrev" value={tg.adminChatId} />
          <Field label={L.telegram.adminChatId} hint={`${L.telegram.adminChatHint} ${X.keepAdminChatHint}`}>
            <Input name="adminChatId" inputMode="numeric" defaultValue={d("adminChatId", tg.adminChatId)} placeholder="123456789" aria-invalid={bad("adminChatId")} />
          </Field>
          <Field label={L.telegram.channelId} hint={L.telegram.channelHint}>
            <Input name="channelId" defaultValue={d("channelId", tg.channelId)} placeholder="@architeksoft" aria-invalid={bad("channelId")} />
          </Field>
          <Field label={L.telegram.digest} hint={L.telegram.digestHint}><Input name="dailyDigestTime" type="time" defaultValue={d("dailyDigestTime", tg.dailyDigestTime)} placeholder="09:00" className="min-w-0" aria-invalid={bad("dailyDigestTime")} /></Field>
          <div className="space-y-1 pt-6">
            <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-2.5 px-2 text-sm"><input type="checkbox" name="notifyNewLeads" defaultChecked={draftBool("notifyNewLeads", tg.notifyNewLeads)} className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" /> {L.telegram.notifyLeads}</label>
            <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-2.5 px-2 text-sm"><input type="checkbox" name="notifyClientFeedback" defaultChecked={draftBool("notifyClientFeedback", tg.notifyClientFeedback)} className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" /> {L.telegram.notifyFeedback}</label>
            {tg.adminChatId ? (
              <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-2.5 px-2 text-sm text-muted"><input type="checkbox" name="clearAdminChatId" className="h-5 w-5 flex-none rounded-none border-line-strong accent-[var(--accent)]" /> {X.clearAdminChat}</label>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <SaveBar>
              <SubmitButton pendingText={L.saving} className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap">{L.telegram.save}</SubmitButton>
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

async function SecurityTab({ userId, L, X }: { userId: string; L: AdminDict["settings"]; X: ReturnType<typeof extra> }) {
  const db = getDb();
  const sessions = db.select({ c: sql<number>`count(*)` }).from(schema.sessions).where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, nowIso()))).get()?.c ?? 0;
  // One definition of "weak", shared with the production boot warning in src/lib/env.ts: the shipped
  // fallback, any placeholder ("REPLACE_ME…", "change-me", "your-…") or anything under 32 characters.
  // APP_SECRET salts the portal and analytics hashes and keys the client-page passcode cookie.
  const weakSecret = env.isWeakSecret;
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
        <PasswordForm
          labels={{
            current: X.currentPassword,
            currentHint: X.currentPasswordHint,
            newPassword: L.security.newPassword,
            passwordHint: L.security.passwordHint,
            repeat: L.security.repeat,
            mismatch: X.passwordMismatch,
            save: L.security.save,
            saving: L.saving,
            signsOutOthers: X.signsOutOthers,
          }}
        />
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
          <a href={env.appUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 [overflow-wrap:anywhere] text-accent hover:underline">{env.appUrl} <ExternalLink size={11} /></a>
        </p>
      </Panel>
    </div>
  );
}
