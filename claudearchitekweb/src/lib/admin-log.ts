/**
 * Localised sentences used inside server actions: activity-log entries, notices and error messages.
 * Server actions call `await actionStrings()` and read the locale from the admin language cookie.
 */
import { adminDict, getAdminLocale, local, type AdminDict, type AdminLocale } from "@/lib/i18n/admin";

const dict = (locale: AdminLocale) =>
  local(
    {
      hy: {
        addedManually: (who: string) => `Ձեռքով ավելացրեց՝ ${who}`,
        createdBy: (who: string) => `Ստեղծեց՝ ${who}`,
        contactAdded: (name: string) => `Ավելացվեց կոնտակտ՝ ${name}`,
        statusChange: (from: string, to: string) => `Կարգավիճակ՝ ${from} → ${to}`,
        stageChange: (from: string, to: string) => `Փուլ՝ ${from} → ${to}`,
        estimatedValue: (v: string) => `Մոտավոր գումարը՝ ${v}`,
        quoteSet: (v: string) => `Առաջարկի գումարը՝ ${v}`,
        paidSet: (v: string) => `Վճարված գումարը՝ ${v}`,
        markedLost: (reason: string) => (reason ? `Նշվեց «չստացվեց»։ Պատճառը՝ ${reason}` : "Նշվեց «չստացվեց»"),
        projectCreatedBy: (who: string) => `Նախագիծը ստեղծեց՝ ${who}`,
        projectCreated: (title: string) => `Ստեղծվեց նախագիծ՝ ${title}`,
        roleSet: (role: string) => `Նշվեց «${role}» ֆայլը`,
        roleCleared: (role: string) => `Հանվեց «${role}» ֆայլը`,
        deliverablesUpdated: "Հանձնվողների հղումները թարմացվեցին",
        liveCreated: (uuid: string, until: string) => `Live 3D սեսիան ստեղծվեց՝ ${uuid} (գործում է մինչև ${until})`,
        liveCreatedDry: (url: string) => `Live 3D հղումը ստեղծվեց փորձնական ռեժիմում (սերվերը կարգավորված չէ)՝ ${url}`,
        pageCreated: (who: string, lang: string) => `Հաճախորդի էջը ստեղծեց՝ ${who} (${lang})`,
        pageToggled: (on: boolean, slug: string) => `${on ? "Անջատվեց" : "Միացվեց"} հաճախորդի էջը /p/${slug}`,
        pageRegenerated: (slug: string) => `Նոր հղում՝ /p/${slug} (հինը այլևս չի աշխատում)`,
        pageDeleted: (slug: string) => `Ջնջվեց հաճախորդի էջը /p/${slug}`,
        pageSent: (via: string) => `Հաճախորդի էջն ուղարկվեց ${via}-ով`,
        pageSentTelegram: "Հաճախորդի էջի հղումն ուղարկվեց Telegram-ի ադմին չատ",
        pageSentTelegramDry: "Հաճախորդի էջի հղումն ուղարկվեց Telegram (փորձնական՝ բոտի բանալի չկա)",
        feedbackToggled: (resolved: boolean, type: string) => `${resolved ? "Վերաբացվեց" : "Լուծվեց"} հաճախորդի «${type}»-ը`,
        fileDeleted: (name: string) => `Ջնջվեց ֆայլը՝ ${name}`,
        filesAssigned: (n: number) => `${n} ֆայլ կապվեց նախագծին`,
        telegramCardTitle: "Հաճախորդի էջ",
        telegramOpen: "Բացել հաճախորդի էջը",
        telegramPasscode: "Գաղտնաբառ",
        telegramExpires: "Գործում է մինչև",
        leadNotFound: "Հարցումը չի գտնվել",
        clientNotFound: "Հաճախորդը չի գտնվել",
        companyNotFound: "Ընկերությունը չի գտնվել",
        projectNotFound: "Նախագիծը չի գտնվել",
        assetNotFound: "Ֆայլը չի գտնվել",
        telegramNotConfigured: "Telegram-ի ադմին չատի id-ն նշված չէ (Կարգավորումներ → Telegram)",
      },
      en: {
        addedManually: (who: string) => `Entered manually by ${who}`,
        createdBy: (who: string) => `Created by ${who}`,
        contactAdded: (name: string) => `Contact added: ${name}`,
        statusChange: (from: string, to: string) => `Status: ${from} → ${to}`,
        stageChange: (from: string, to: string) => `Stage: ${from} → ${to}`,
        estimatedValue: (v: string) => `Estimated value set to ${v}`,
        quoteSet: (v: string) => `Quote set to ${v}`,
        paidSet: (v: string) => `Paid amount set to ${v}`,
        markedLost: (reason: string) => (reason ? `Marked lost: ${reason}` : "Marked lost"),
        projectCreatedBy: (who: string) => `Project created by ${who}`,
        projectCreated: (title: string) => `Project created: ${title}`,
        roleSet: (role: string) => `Set “${role}” asset`,
        roleCleared: (role: string) => `Cleared “${role}” asset`,
        deliverablesUpdated: "Deliverable links updated",
        liveCreated: (uuid: string, until: string) => `Live 3D instance created: ${uuid} (expires ${until})`,
        liveCreatedDry: (url: string) => `Live 3D link created (dry-run, backend not configured): ${url}`,
        pageCreated: (who: string, lang: string) => `Client page created by ${who} (${lang})`,
        pageToggled: (on: boolean, slug: string) => `${on ? "Deactivated" : "Activated"} client page /p/${slug}`,
        pageRegenerated: (slug: string) => `Regenerated link for /p/${slug} (old link no longer works)`,
        pageDeleted: (slug: string) => `Deleted client page /p/${slug}`,
        pageSent: (via: string) => `Client page sent via ${via}`,
        pageSentTelegram: "Client page link sent to the Telegram admin chat",
        pageSentTelegramDry: "Client page link sent to Telegram (dry-run: no bot token)",
        feedbackToggled: (resolved: boolean, type: string) => `${resolved ? "Reopened" : "Resolved"} client “${type}”`,
        fileDeleted: (name: string) => `Deleted file ${name}`,
        filesAssigned: (n: number) => `${n} file(s) assigned from the media library`,
        telegramCardTitle: "Client page",
        telegramOpen: "Open client page",
        telegramPasscode: "Passcode",
        telegramExpires: "Expires",
        leadNotFound: "Lead not found",
        clientNotFound: "Client not found",
        companyNotFound: "Company not found",
        projectNotFound: "Project not found",
        assetNotFound: "Asset not found",
        telegramNotConfigured: "Telegram admin chat id is not configured (Settings → Telegram)",
      },
    },
    locale
  );

export type ActionStrings = ReturnType<typeof dict>;

/** `const { t, L } = await actionStrings()` — `t` is the full admin dictionary, `L` the action sentences. */
export async function actionStrings(): Promise<{ t: AdminDict; L: ActionStrings; locale: AdminLocale }> {
  const locale = await getAdminLocale();
  return { t: adminDict(locale), L: dict(locale), locale };
}
