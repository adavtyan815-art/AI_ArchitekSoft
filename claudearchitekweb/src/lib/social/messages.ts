/**
 * Operator-facing wording for the publishing pipeline (dry-run notes, adapter errors, AI warnings).
 * These texts are stored with the post and shown in the admin, so they follow the admin language
 * (Armenian by default, English optional) instead of being hard-coded in one language.
 */
export type UiLocale = "hy" | "en";

/**
 * Admin language of the current request. Outside a request (scheduler, Telegram bot, scripts)
 * there is no cookie, so the default admin language (Armenian) is used.
 */
export async function resolveUiLocale(explicit?: UiLocale | null): Promise<UiLocale> {
  if (explicit === "hy" || explicit === "en") return explicit;
  try {
    const mod = await import("../i18n/admin");
    return await mod.getAdminLocale();
  } catch {
    return "hy";
  }
}

export type MediaSummary = { video: boolean; images: number };

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);

const hy = {
  media: (m: MediaSummary) => (m.video ? "1 վիդեո" : m.images === 0 ? "առանց մեդիայի" : `${m.images} նկար`),
  simFacebook: (media: string, chars: number) => `Facebook՝ փորձնական. կհրապարակվեր ${media} և ${chars} նիշ տեքստ։ Իրական հրապարակման համար լրացրու META_PAGE_ID և META_PAGE_ACCESS_TOKEN։`,
  simInstagram: (what: string, baseUrl: string) => `Instagram՝ փորձնական. կհրապարակվեր ${what}։ Իրական հրապարակման համար լրացրու META_IG_USER_ID և META_PAGE_ACCESS_TOKEN, իսկ ${baseUrl} հասցեն պետք է բաց լինի համացանցից (Instagram-ը մեդիան վերցնում է հղումով)։`,
  igReel: "Reel (վիդեո)",
  igCarousel: (n: number) => `${n} նկարից կարուսել`,
  igSingle: "1 նկար",
  igPadded: (n: number) => `${n} նկար հարմարեցվեց Instagram-ի թույլատրելի համամասնությանը (4:5 – 1.91:1)՝ լուսանցքներով, առանց կտրելու։`,
  igConverted: (n: number) => `${n} նկար փոխարկվեց JPEG ձևաչափի։`,
  simLinkedIn: (chars: number, media: string) => `LinkedIn՝ փորձնական. կհրապարակվեր ${chars} նիշ տեքստ և ${media}։ Իրական հրապարակման համար լրացրու LINKEDIN_ACCESS_TOKEN և LINKEDIN_ORG_URN (urn:li:organization:<թվային id>, պետք է Community Management API հասանելիություն)։`,
  simYouTube: (title: string, seconds: number) => `YouTube՝ փորձնական. կվերբեռնվեր «${title}» վիդեոն (${seconds} վրկ)։ Իրական հրապարակման համար լրացրու YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET և YOUTUBE_REFRESH_TOKEN։ Չստուգված հավելվածի վերբեռնումները մնում են փակ։`,
  simTelegram: (media: string) => `Telegram՝ փորձնական. կհրապարակվեր ալիքում՝ ${media}։ Իրական հրապարակման համար լրացրու TELEGRAM_BOT_TOKEN-ը և ալիքի id-ն՝ Կարգավորումներ → Telegram → Ալիքի id (կամ TELEGRAM_CHANNEL_ID). բոտը պետք է լինի ալիքի ադմին։`,
  tgTextSeparate: (chars: number) => `Տեքստը ${chars} նիշ է (մեդիայի ենթագրի սահմանը 1024 է), ուստի ուղարկվում է առանձին հաղորդագրությամբ՝ մեդիայի տակ։`,
  tiktokManual: (file: string | null) => `TikTok՝ ձեռքով քայլ. ${file ? `վերբեռնիր ${file} ֆայլը` : "վիդեո կցված չէ"} այս տարբերակի տեքստով։ TikTok-ը ավտոմատ հրապարակում թույլ է տալիս միայն ստուգված հավելվածներին, ուստի այս քայլը չենք ավտոմատացնում։`,
  igNeedsPublicUrl: "Instagram-ը մեդիան վերցնում է հրապարակային https հղումով, իսկ APP_URL-ը լոկալ է։",
  igNeedsMedia: "Instagram-ի համար պետք է առնվազն մեկ նկար կամ վիդեո։",
  ytNeedsVideo: "YouTube-ի համար պետք է վիդեո ֆայլ։",
  liVersion: (version: string) => `LinkedIn-ը մերժեց API-ի ${version} տարբերակը (HTTP 426)։ .env ֆայլում LINKEDIN_API_VERSION-ին տուր գործող YYYYMM տարբերակ (թարմացվում է տարին մեկ)։`,
  noVideo: (platform: string) => `${platform}՝ ձևաչափը վիդեո է, բայց վիդեո կցված չէ։`,
  fileMissing: (name: string) => `«${name}» ֆայլը սկավառակի վրա չկա։ Վերբեռնիր այն նորից։`,
  tooLarge: (platform: string, name: string, size: number, limit: number) => `${platform}՝ «${name}» ֆայլը ${mb(size)} ՄԲ է, սահմանը ${mb(limit)} ՄԲ է։ Փոքրացրու ֆայլը և փորձիր նորից։`,
  noPlatform: "Ոչ մի հարթակ միացված չէ, ուստի հրապարակելու բան չկա։",
  busy: "Այս գրառումն այս պահին մշակվում է (ուղարկվում կամ հրապարակվում է)։ Սպասիր մի քանի վայրկյան և փորձիր նորից։",
  notPublishable: "Այս գրառումը ընթացիկ կարգավիճակում հնարավոր չէ հրապարակել կամ ուղարկել հաստատման։",
  interrupted: "Հրապարակումն ընդհատվեց (սերվերը վերագործարկվեց)։ Ստուգիր հարթակները և փորձիր նորից։",
  aiNoKey: "AI բանալի չկա, ուստի տեքստը գրվել է ներկառուցված ձևանմուշներով։ AI տեքստերի համար .env ֆայլում ավելացրու ANTHROPIC_API_KEY։",
  aiFailed: (errors: string) => `AI-ը չպատասխանեց (${errors}), ուստի տեքստը գրվել է ներկառուցված ձևանմուշներով։`,
};

const en: typeof hy = {
  media: (m) => (m.video ? "1 video" : m.images === 0 ? "no media" : `${m.images} image${m.images === 1 ? "" : "s"}`),
  simFacebook: (media, chars) => `Facebook dry run: would publish ${media} and ${chars} characters of text. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN to publish for real.`,
  simInstagram: (what, baseUrl) => `Instagram dry run: would publish ${what}. Set META_IG_USER_ID and META_PAGE_ACCESS_TOKEN, and make ${baseUrl} reachable from the internet (Instagram fetches media by URL).`,
  igReel: "a Reel (video)",
  igCarousel: (n) => `a carousel of ${n} images`,
  igSingle: "1 image",
  igPadded: (n) => `${n} image${n === 1 ? " was" : "s were"} fitted to Instagram's allowed aspect ratio (4:5 – 1.91:1) with margins, nothing cropped.`,
  igConverted: (n) => `${n} image${n === 1 ? " was" : "s were"} converted to JPEG.`,
  simLinkedIn: (chars, media) => `LinkedIn dry run: would publish ${chars} characters of text and ${media}. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_URN (urn:li:organization:<numeric id>; needs Community Management API access).`,
  simYouTube: (title, seconds) => `YouTube dry run: would upload "${title}" (${seconds} s). Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN. Uploads from an unverified app stay private.`,
  simTelegram: (media) => `Telegram dry run: would post to the channel with ${media}. Set TELEGRAM_BOT_TOKEN and the channel id in Settings → Telegram → Channel id (or TELEGRAM_CHANNEL_ID); the bot must be an admin of the channel.`,
  tgTextSeparate: (chars) => `The text is ${chars} characters (a media caption holds 1024), so it is sent as a separate message under the media.`,
  tiktokManual: (file) => `TikTok is a manual step: ${file ? `upload ${file}` : "no video attached"} with this variant's text. TikTok only allows automatic posting for audited apps, so this step is not automated.`,
  igNeedsPublicUrl: "Instagram fetches media from a public https URL, but APP_URL is local.",
  igNeedsMedia: "Instagram needs at least one image or a video.",
  ytNeedsVideo: "YouTube needs a video file.",
  liVersion: (version) => `LinkedIn rejected API version ${version} (HTTP 426). Set LINKEDIN_API_VERSION in .env to a currently supported YYYYMM version (it must be bumped about once a year).`,
  noVideo: (platform) => `${platform}: the format is video, but no video is attached.`,
  fileMissing: (name) => `The file "${name}" is missing on disk. Upload it again.`,
  tooLarge: (platform, name, size, limit) => `${platform}: "${name}" is ${mb(size)} MB, the limit is ${mb(limit)} MB. Make the file smaller and try again.`,
  noPlatform: "No platform is enabled, so there is nothing to publish.",
  busy: "This post is being processed right now (sending or publishing). Wait a few seconds and try again.",
  notPublishable: "This post cannot be published or sent for approval in its current status.",
  interrupted: "Publishing was interrupted (the server restarted). Check the platforms and try again.",
  aiNoKey: "No AI key is set, so the text was written with the built-in templates. Add ANTHROPIC_API_KEY to .env for AI-written posts.",
  aiFailed: (errors) => `The AI did not answer (${errors}), so the text was written with the built-in templates.`,
};

const DICTS: Record<UiLocale, typeof hy> = { hy, en };

export function socialMessages(locale: UiLocale | undefined | null): typeof hy {
  return DICTS[locale === "en" ? "en" : "hy"];
}
