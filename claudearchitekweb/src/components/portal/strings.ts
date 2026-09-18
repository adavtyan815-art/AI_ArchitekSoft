import type { Locale } from "@/lib/i18n";

/**
 * Client-portal strings the shared site dictionary does not carry.
 * One table for /p and /v so both entry points say the same thing in hy / ru / en.
 */
export type PortalText = {
  // /p page
  view: string;
  approvedOn: string;
  error: string;
  note: string;
  changeRequested: string;
  questionAsked: string;
  premium: string;
  approveShort: string;
  deliverables: string;
  file: string;
  /** Short label of the viewer button in the phone action bar (the full sentence does not fit). */
  viewerShort: string;
  /** Phone action bar, when approving is no longer on offer. */
  messageShort: string;
  messageLong: string;
  /** State of an earlier question / change request. */
  answered: string;
  resolved: string;
  inProgress: string;
  replyNote: string;
  commentOptional: string;
  // access states
  inactive: string;
  passcodeError: string;
  /** Too many wrong codes: `(minutes)` because the lock is reported in whole minutes. */
  /** Template: "{m}" is replaced with the minutes left. A plain string so it can cross the server -> client boundary. */
  passcodeLocked: string;
  passcodeHint: string;
  noCode: string;
  // AR sheet
  arNoteDesktop: string;
  arNotePhone: string;
  arUnsupported: string;
  modelAlt: string;
  qrAlt: string;
  // /v page
  /** The cell note and the stage hint of a client model: no colour swatches are offered there. */
  viewerNote: string;
  viewerHint: string;
  viewerLoading: string;
  viewerError: string;
  viewerRetry: string;
  copied: string;
  reset: string;
  soonTitle: string;
  soonText: string;
  backToProject: string;
};

export const PORTAL_TEXT: Record<Locale, PortalText> = {
  hy: {
    view: "Դիտել",
    approvedOn: "Հաստատված է",
    error: "Չհաջողվեց ուղարկել։ Փորձեք կրկին կամ գրեք մեզ։",
    note: "Հաղորդագրություն",
    changeRequested: "Փոփոխություն է խնդրվել",
    questionAsked: "Հարց",
    premium: "Պրեմիում",
    approveShort: "Հաստատել",
    deliverables: "Ձեր 3D-ն",
    file: "Ֆայլ",
    viewerShort: "Web Viewer",
    messageShort: "Գրել",
    messageLong: "Գրել մեզ այս նախագծի մասին",
    answered: "Պատասխանված է",
    resolved: "Լուծված է",
    inProgress: "Ընթացքում է",
    replyNote: "Պատասխանում ենք հեռախոսով կամ մեսենջերով։",
    commentOptional: "Մեկնաբանություն",
    inactive: "Այս էջն այս պահին հասանելի չէ։ Խնդրում ենք կապվել մեզ հետ։",
    passcodeError: "Չհաջողվեց ստուգել կոդը։ Ստուգեք կապը և փորձեք կրկին։",
    passcodeLocked: "Չափազանց շատ փորձեր։ Կրկին փորձեք {m} րոպեից։",
    passcodeHint: "Կոդը նույն հաղորդագրության մեջ է, որտեղ հղումը։",
    noCode: "Կոդ չե՞ք ստացել",
    arNoteDesktop: "Սկանավորեք QR կոդը հեռախոսով՝ կահույքը ձեր սենյակում տեսնելու համար։",
    arNotePhone: "Սեղմեք մոդելի վրայի կոճակը՝ կահույքը ձեր սենյակում տեղադրելու համար։",
    arUnsupported: "AR-ն այս սարքում հասանելի չէ։ Մոդելը կարող եք պտտել այստեղ կամ բացել Web Viewer-ը։",
    modelAlt: "Կահույքի 3D մոդել",
    qrAlt: "QR կոդ, որը բացում է այս էջը հեռախոսով",
    viewerNote: "3D՝ ձեր բրաուզերում։ Պտտեք և մոտեցրեք ցանկացած կողմից։",
    viewerHint: "Քաշեք՝ պտտելու համար · մոտեցրեք մատներով կամ անիվով",
    viewerLoading: "3D մոդելը բեռնվում է…",
    viewerError: "3D մոդելը չհաջողվեց բեռնել։ Ստուգեք կապը և փորձեք կրկին։",
    viewerRetry: "Փորձել կրկին",
    copied: "Պատճենվեց",
    reset: "Վերականգնել դիտումը",
    soonTitle: "Web Viewer-ը շուտով պատրաստ կլինի",
    soonText: "3D մոդելը դեռ պատրաստվում է։ Հենց պատրաստ լինի, այս էջը կբացվի ինտերակտիվ 3D-ով՝ նույն հղումով։ Այժմ կարող եք դիտել պատրաստի պատկերները։",
    backToProject: "Վերադառնալ նախագծին",
  },
  ru: {
    view: "Открыть",
    approvedOn: "Утверждено",
    error: "Не удалось отправить. Попробуйте ещё раз или напишите нам.",
    note: "Сообщение",
    changeRequested: "Запрошены изменения",
    questionAsked: "Вопрос",
    premium: "Премиум",
    approveShort: "Утвердить",
    deliverables: "Ваш 3D",
    file: "Файл",
    viewerShort: "Web Viewer",
    messageShort: "Написать",
    messageLong: "Написать нам об этом проекте",
    answered: "Отвечено",
    resolved: "Решено",
    inProgress: "В работе",
    replyNote: "Отвечаем по телефону или в мессенджере.",
    commentOptional: "Комментарий",
    inactive: "Эта страница сейчас недоступна. Пожалуйста, свяжитесь с нами.",
    passcodeError: "Не удалось проверить код. Проверьте соединение и попробуйте ещё раз.",
    passcodeLocked: "Слишком много попыток. Повторите через {m} мин.",
    passcodeHint: "Код находится в том же сообщении, что и ссылка.",
    noCode: "Не получили код?",
    arNoteDesktop: "Отсканируйте QR-код телефоном, чтобы увидеть мебель в своей комнате.",
    arNotePhone: "Нажмите кнопку на модели, чтобы разместить мебель в своей комнате.",
    arUnsupported: "AR недоступен на этом устройстве. Модель можно вращать здесь или открыть Web Viewer.",
    modelAlt: "3D-модель мебели",
    qrAlt: "QR-код, открывающий эту страницу на телефоне",
    viewerNote: "3D в вашем браузере. Вращайте и приближайте с любой стороны.",
    viewerHint: "Перетащите, чтобы повернуть · масштаб жестом или колесом",
    viewerLoading: "Загружается 3D-модель…",
    viewerError: "Не удалось загрузить 3D-модель. Проверьте соединение и попробуйте ещё раз.",
    viewerRetry: "Повторить",
    copied: "Скопировано",
    reset: "Сбросить вид",
    soonTitle: "Web Viewer скоро будет готов",
    soonText: "3D-модель ещё готовится. Как только она будет готова, эта страница откроется в интерактивном 3D по той же ссылке. Пока посмотрите готовые изображения.",
    backToProject: "Вернуться к проекту",
  },
  en: {
    view: "View",
    approvedOn: "Approved",
    error: "Could not send. Please try again or message us.",
    note: "Message",
    changeRequested: "Change requested",
    questionAsked: "Question",
    premium: "Premium",
    approveShort: "Approve",
    deliverables: "Your 3D",
    file: "File",
    viewerShort: "Web Viewer",
    messageShort: "Message",
    messageLong: "Write to us about this project",
    answered: "Answered",
    resolved: "Resolved",
    inProgress: "In progress",
    replyNote: "We reply by phone or messenger.",
    commentOptional: "Comment",
    inactive: "This page is currently unavailable. Please contact us.",
    passcodeError: "Could not check the code. Check your connection and try again.",
    passcodeLocked: "Too many attempts. Try again in {m} min.",
    passcodeHint: "The code is in the same message as your link.",
    noCode: "Did not get a code?",
    arNoteDesktop: "Scan the QR code with your phone to see the furniture in your room.",
    arNotePhone: "Tap the button on the model to place the furniture in your room.",
    arUnsupported: "AR is not available on this device. You can still rotate the model here or open the Web Viewer.",
    modelAlt: "3D model of the furniture",
    qrAlt: "QR code that opens this page on a phone",
    viewerNote: "3D in your browser. Rotate it and zoom in from any side.",
    viewerHint: "Drag to rotate · pinch or scroll to zoom",
    viewerLoading: "Loading the 3D model…",
    viewerError: "The 3D model could not be loaded. Check your connection and try again.",
    viewerRetry: "Try again",
    copied: "Copied",
    reset: "Reset the view",
    soonTitle: "The Web Viewer will appear here soon",
    soonText: "The 3D model is still being prepared. As soon as it is ready this page opens in interactive 3D under the same link. In the meantime, here are the finished images.",
    backToProject: "Back to the project",
  },
};

/**
 * Language for a request that may not show a link's own language yet (unknown
 * slug or wrong key): taken from the browser, never from the link, so the page
 * looks the same whether or not the slug exists.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "hy";
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], weight: Number.isFinite(weight) ? weight : 0, i };
    })
    .filter((x) => x.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.i - b.i);
  for (const { lang } of ranked) {
    if (lang === "hy" || lang === "ru" || lang === "en") return lang;
  }
  return "hy";
}
