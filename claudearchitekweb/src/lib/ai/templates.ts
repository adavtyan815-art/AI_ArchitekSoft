/**
 * Deterministic post templates used when no AI key is configured
 * (and to fill gaps if the AI omits a platform). Trilingual.
 */
import { getSetting } from "../settings";
import type { PostContext, PostPack, VariantDraft } from "./index";

type L = PostContext["language"];

const TYPE_NAMES: Record<L, Record<string, string>> = {
  hy: { kitchen: "խոհանոց", wardrobe: "պահարան", living: "հյուրասենյակ", bedroom: "ննջասենյակ", bathroom: "լոգարան", office: "գրասենյակ", apartment: "բնակարան", house: "տուն", commercial: "կոմերցիոն տարածք", other: "նախագիծ" },
  ru: { kitchen: "кухня", wardrobe: "шкаф", living: "гостиная", bedroom: "спальня", bathroom: "ванная", office: "офис", apartment: "квартира", house: "дом", commercial: "коммерческое пространство", other: "проект" },
  en: { kitchen: "kitchen", wardrobe: "wardrobe", living: "living room", bedroom: "bedroom", bathroom: "bathroom", office: "office", apartment: "apartment", house: "house", commercial: "commercial space", other: "project" },
};

const T: Record<L, {
  core: (t: string, m?: string) => string;
  fbHead: (t: string) => string;
  fb: (t: string, site: string) => string;
  igHook: (t: string) => string;
  ig: (t: string) => string;
  li: (t: string) => string;
  tg: (t: string, site: string) => string;
  ytTitle: (t: string) => string;
  yt: (t: string, site: string) => string;
  tt: (t: string) => string;
  ctaSite: (site: string) => string;
  ctaBio: string;
  ctaB2b: string;
}> = {
  hy: {
    core: (t, m) => `${t.charAt(0).toUpperCase() + t.slice(1)}՝ նախագծված մեկ անգամ, իրական նյութերով${m ? ` (${m})` : ""}։ Պատվիրատուն տեսավ այն 3D-ով և հաստատեց մինչև արտադրությունը։ Արտադրողը նույն մոդելից ստացավ կտրման քարտեզն ու գծագրերը։`,
    fbHead: (t) => `Ինչպես է ${t}ը հաստատվում մինչև առաջին սալիկը կտրելը`,
    fb: (t, site) => `Այս ${t}ը պատվիրատուն տեսավ իր հեռախոսում՝ քայլեց սենյակում, բացեց դարակները, փոխեց ֆասադների գույնը և հաստատեց։\n\nՀաստատված մոդելից արտադրողը ստացավ կտրման քարտեզը, եզրաշերտերի նշումները և ֆուրնիտուրայի ցանկը։ Ոչ մի վերագծում, ոչ մի «մոտավոր»։\n\nՈւզո՞ւմ եք Ձեր խոհանոցը տեսնել նույն կերպ։ Ուղարկեք չափերը՝ ${site}`,
    igHook: (t) => `Այս ${t}ը հաստատվել է հեռախոսից, մինչև արտադրությունը։`,
    ig: () => `Իրական նյութեր, իրական չափեր, բացվող դարակներ։ Պատվիրատուն ընտրեց գույներն ինքը և տեսավ գինը։\n\nՉափերն ուղարկեք՝ և 24–48 ժամում ստացեք Ձեր 3D հղումը։`,
    li: (t) => `Խոհանոցի վաճառքը՝ մինչև արտադրությունը\n\nԱյս ${t}ի պատվիրատուն հաստատեց նախագիծը առաջին հանդիպմանը՝ ինտերակտիվ 3D հղումով։\n• Ֆասադներ և նյութեր՝ իրական արտադրողներից\n• Կտրման քարտեզ և ֆուրնիտուրայի ցանկ՝ նույն մոդելից\n• Զրո վերագծում, ավելի քիչ խոտան\n\nԿահույք արտադրողների համար առաջարկում ենք փորձնական նախագիծ՝ մեկ իրական պատվերով։`,
    tg: (t, site) => `${t.charAt(0).toUpperCase() + t.slice(1)}՝ էսքիզից մինչև 3D և կտրման քարտեզ։ Պատվիրատուն հաստատեց հեռախոսից, արտադրողը ստացավ փաստաթղթերը նույն մոդելից։\n\nՁեր նախագիծը՝ ${site}`,
    ytTitle: (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} 3D-ով՝ մինչև պատրաստելը | ArchiTek Soft`,
    yt: (t, site) => `Ինտերակտիվ ${t}՝ Unreal Engine 5-ով, իրական նյութերով և ֆուրնիտուրայով։ Պատվիրատուն քայլում է սենյակում, բացում դարակները, փոխում ֆասադները և հաստատում։\n\nԱրտադրողը նույն մոդելից ստանում է կտրման քարտեզ, ծակման կոորդինատներ և ֆուրնիտուրայի ցանկ։\n\nՍկսել նախագիծ՝ ${site}`,
    tt: (t) => `${t.charAt(0).toUpperCase() + t.slice(1)}ը հաստատվել է հեռախոսից, մինչև պատրաստելը։`,
    ctaSite: (site) => `Ուղարկեք չափերը՝ ${site}`,
    ctaBio: "Հղումը՝ պրոֆիլում",
    ctaB2b: "Գրեք մեզ փորձնական նախագծի համար։",
  },
  ru: {
    core: (t, m) => `${t.charAt(0).toUpperCase() + t.slice(1)}, спроектированная один раз из реальных материалов${m ? ` (${m})` : ""}. Клиент увидел её в 3D и утвердил до производства. Производитель получил из той же модели карту раскроя и чертежи.`,
    fbHead: (t) => `Как ${t} утверждается до распила первой плиты`,
    fb: (t, site) => `Эту ${t} клиент увидел на своём телефоне: прошёлся по комнате, открыл ящики, поменял цвет фасадов и утвердил.\n\nИз утверждённой модели производитель получил карту раскроя, отметки кромки и список фурнитуры. Без перечерчивания, без «примерно».\n\nХотите увидеть свою кухню так же? Отправьте размеры: ${site}`,
    igHook: (t) => `Эта ${t} утверждена с телефона — до производства.`,
    ig: () => `Реальные материалы, реальные размеры, открывающиеся ящики. Клиент сам выбрал цвета и увидел цену.\n\nОтправьте размеры — и через 24–48 часов получите свою 3D-ссылку.`,
    li: (t) => `Продажа кухни до производства\n\nКлиент этой ${t} утвердил проект на первой встрече — по интерактивной 3D-ссылке.\n• Фасады и материалы реальных производителей\n• Карта раскроя и список фурнитуры из той же модели\n• Ноль перечерчивания, меньше брака\n\nПроизводителям мебели предлагаем пилотный проект на одном реальном заказе.`,
    tg: (t, site) => `${t.charAt(0).toUpperCase() + t.slice(1)}: от эскиза до 3D и карты раскроя. Клиент утвердил с телефона, производитель получил документы из той же модели.\n\nВаш проект: ${site}`,
    ytTitle: (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} в 3D до изготовления | ArchiTek Soft`,
    yt: (t, site) => `Интерактивная ${t} на Unreal Engine 5 с реальными материалами и фурнитурой. Клиент ходит по комнате, открывает ящики, меняет фасады и утверждает.\n\nПроизводитель получает из той же модели карту раскроя, координаты присадки и список фурнитуры.\n\nНачать проект: ${site}`,
    tt: (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} утверждена с телефона — до изготовления.`,
    ctaSite: (site) => `Отправьте размеры: ${site}`,
    ctaBio: "Ссылка в профиле",
    ctaB2b: "Напишите нам о пилотном проекте.",
  },
  en: {
    core: (t, m) => `A ${t} designed once, from real materials${m ? ` (${m})` : ""}. The customer saw it in 3D and approved it before production. The maker got the cut list and drawings from the same model.`,
    fbHead: (t) => `How a ${t} gets approved before the first panel is cut`,
    fb: (t, site) => `The customer saw this ${t} on their phone: walked around the room, opened the drawers, changed the front colour and approved.\n\nFrom the approved model the maker received the cut list, edge-banding notes and the hardware list. No redrawing, no "approximately".\n\nWant to see your kitchen the same way? Send your measurements: ${site}`,
    igHook: (t) => `This ${t} was approved from a phone, before production.`,
    ig: () => `Real materials, real sizes, drawers that open. The customer chose the colours and saw the price.\n\nSend your measurements and get your 3D link in 24–48 hours.`,
    li: (t) => `Selling the kitchen before production\n\nThe customer of this ${t} approved the design at the first meeting, from an interactive 3D link.\n• Fronts and materials from real manufacturers\n• Cut list and hardware list from the same model\n• Zero redrawing, fewer remakes\n\nFor furniture makers we offer a pilot project on one real order.`,
    tg: (t, site) => `${t.charAt(0).toUpperCase() + t.slice(1)}: from a sketch to 3D and a cut list. The customer approved from a phone; the maker received the documents from the same model.\n\nYour project: ${site}`,
    ytTitle: (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} in 3D before it is built | ArchiTek Soft`,
    yt: (t, site) => `An interactive ${t} in Unreal Engine 5 with real materials and hardware. The customer walks around, opens drawers, switches fronts and approves.\n\nThe maker gets the cut list, drilling coordinates and hardware list from the same model.\n\nStart a project: ${site}`,
    tt: (t) => `This ${t} was approved from a phone, before it was built.`,
    ctaSite: (site) => `Send your measurements: ${site}`,
    ctaBio: "Link in bio",
    ctaB2b: "Message us about a pilot project.",
  },
};

export function buildTemplatePack(ctx: PostContext): PostPack {
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const l = ctx.language;
  const t = TYPE_NAMES[l][ctx.projectType ?? "kitchen"] ?? TYPE_NAMES[l].other;
  const site = ctx.liveLink || brand.website.replace(/^https?:\/\//, "");
  const tags = l === "hy" ? smm.hashtagsHy : l === "ru" ? smm.hashtagsRu : smm.hashtagsEn;
  const tpl = T[l];
  const video = !!ctx.hasVideo;

  const all: Record<string, VariantDraft> = {
    facebook: { platform: "facebook", title: tpl.fbHead(t), text: tpl.fb(t, site), hashtags: tags.slice(0, 6), cta: tpl.ctaSite(site), format: video ? "video" : "carousel" },
    instagram: { platform: "instagram", text: `${tpl.igHook(t)}\n\n${tpl.ig(t)}`, hashtags: [...tags, "#Yerevan", "#InteriorDesign", "#KitchenDesign"].slice(0, 12), cta: tpl.ctaBio, format: video ? "reel" : "carousel" },
    linkedin: { platform: "linkedin", title: tpl.li(t).split("\n")[0], text: tpl.li(t), hashtags: ["#ArchiTekSoft", "#FurnitureManufacturing", "#3DVisualization", "#ArchiTekSoft"], cta: tpl.ctaB2b, format: video ? "video" : "image" },
    telegram: { platform: "telegram", text: tpl.tg(t, site), hashtags: [], cta: tpl.ctaSite(site), format: video ? "video" : "image" },
    youtube: { platform: "youtube", title: tpl.ytTitle(t), text: tpl.yt(t, site), hashtags: ["#ArchiTekSoft", "#Kitchen3D", "#Furniture3D", "#Shorts"], cta: tpl.ctaSite(site), format: "short" },
    tiktok: { platform: "tiktok", text: tpl.tt(t), hashtags: ["#kitchen", "#3d", "#furniture3d", "#architeksoft"], format: "short" },
  };

  return {
    title: ctx.projectTitle ? `${ctx.projectTitle} — ${ctx.goal}` : `${t} — ${ctx.goal}`,
    coreText: tpl.core(t, ctx.materials),
    variants: ctx.platforms.map((p) => all[p]).filter(Boolean),
    provider: "template",
  };
}
