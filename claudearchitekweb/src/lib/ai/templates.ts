/**
 * Deterministic post templates used when no AI key is configured
 * (and to fill gaps if the AI omits a platform). Trilingual.
 *
 * Every sentence is built from the project type, never from a hard-coded "kitchen": the type noun is
 * stored with the grammatical forms each language needs (Armenian definite/genitive, Russian
 * case + gender, English article), so a wardrobe or an office reads correctly too.
 * Brand rule: the copy never names engines, clouds, frameworks or internal tools — only materials
 * and hardware manufacturers, which the rule allows.
 */
import { getSetting } from "../settings";
import type { PostContext, PostPack, VariantDraft } from "./index";

type L = PostContext["language"];

/** Armenian: bare noun, definite (-ը) and genitive (-ի, irregular for "տուն"). */
type HyNoun = { nom: string; def: string; gen: string };
/** Russian: nominative / accusative / genitive plus the gender the agreeing words follow. */
type RuNoun = { nom: string; acc: string; gen: string; g: "m" | "f" | "n" };

const HY_TYPES: Record<string, HyNoun> = {
  kitchen: { nom: "խոհանոց", def: "խոհանոցը", gen: "խոհանոցի" },
  wardrobe: { nom: "պահարան", def: "պահարանը", gen: "պահարանի" },
  living: { nom: "հյուրասենյակ", def: "հյուրասենյակը", gen: "հյուրասենյակի" },
  bedroom: { nom: "ննջասենյակ", def: "ննջասենյակը", gen: "ննջասենյակի" },
  bathroom: { nom: "լոգարան", def: "լոգարանը", gen: "լոգարանի" },
  office: { nom: "գրասենյակ", def: "գրասենյակը", gen: "գրասենյակի" },
  apartment: { nom: "բնակարան", def: "բնակարանը", gen: "բնակարանի" },
  house: { nom: "տուն", def: "տունը", gen: "տան" },
  commercial: { nom: "կոմերցիոն տարածք", def: "կոմերցիոն տարածքը", gen: "կոմերցիոն տարածքի" },
  other: { nom: "նախագիծ", def: "նախագիծը", gen: "նախագծի" },
};

const RU_TYPES: Record<string, RuNoun> = {
  kitchen: { nom: "кухня", acc: "кухню", gen: "кухни", g: "f" },
  wardrobe: { nom: "шкаф", acc: "шкаф", gen: "шкафа", g: "m" },
  living: { nom: "гостиная", acc: "гостиную", gen: "гостиной", g: "f" },
  bedroom: { nom: "спальня", acc: "спальню", gen: "спальни", g: "f" },
  bathroom: { nom: "ванная", acc: "ванную", gen: "ванной", g: "f" },
  office: { nom: "офис", acc: "офис", gen: "офиса", g: "m" },
  apartment: { nom: "квартира", acc: "квартиру", gen: "квартиры", g: "f" },
  house: { nom: "дом", acc: "дом", gen: "дома", g: "m" },
  commercial: { nom: "коммерческое пространство", acc: "коммерческое пространство", gen: "коммерческого пространства", g: "n" },
  other: { nom: "проект", acc: "проект", gen: "проекта", g: "m" },
};

const EN_TYPES: Record<string, string> = {
  kitchen: "kitchen",
  wardrobe: "wardrobe",
  living: "living room",
  bedroom: "bedroom",
  bathroom: "bathroom",
  office: "office",
  apartment: "apartment",
  house: "house",
  commercial: "commercial space",
  other: "project",
};

/** Type nouns in their plain form — also used by the composer and the admin UI. */
export const TYPE_NAMES: Record<L, Record<string, string>> = {
  hy: Object.fromEntries(Object.entries(HY_TYPES).map(([k, v]) => [k, v.nom])),
  ru: Object.fromEntries(Object.entries(RU_TYPES).map(([k, v]) => [k, v.nom])),
  en: EN_TYPES,
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Russian agreement by gender: [masculine, feminine, neuter]. */
const byGender = (g: RuNoun["g"], m: string, f: string, n: string) => (g === "m" ? m : g === "f" ? f : n);

/** English indefinite article. Vowel-initial type names ("office", "apartment") take "an". */
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

type Copy = {
  core: (m?: string) => string;
  fbHead: () => string;
  fb: (site: string) => string;
  igHook: () => string;
  ig: () => string;
  li: () => string;
  tg: (site: string) => string;
  ytTitle: () => string;
  yt: (site: string) => string;
  tt: () => string;
  ctaSite: (site: string) => string;
  ctaBio: string;
  ctaB2b: string;
};

function hyCopy(n: HyNoun): Copy {
  return {
    core: (m) =>
      `${cap(n.nom)}՝ նախագծված մեկ անգամ, իրական նյութերով${m ? ` (${m})` : ""}։ Պատվիրատուն տեսավ այն 3D-ով և հաստատեց մինչև արտադրությունը։ Արտադրողը նույն մոդելից ստացավ կտրման քարտեզն ու գծագրերը։`,
    fbHead: () => `Ինչպես է ${n.def} հաստատվում մինչև առաջին սալիկը կտրելը`,
    fb: (site) =>
      `Այս ${n.def} պատվիրատուն տեսավ իր հեռախոսում՝ քայլեց սենյակում, բացեց դարակները, փոխեց ֆասադների գույնը և հաստատեց։\n\nՀաստատված մոդելից արտադրողը ստացավ կտրման քարտեզը, եզրաշերտերի նշումները և ֆուրնիտուրայի ցանկը։ Ոչ մի վերագծում, ոչ մի «մոտավոր»։\n\nՈւզո՞ւմ եք Ձեր ${n.def} տեսնել նույն կերպ։ Ուղարկեք չափերը՝ ${site}`,
    igHook: () => `Այս ${n.def} հաստատվել է հեռախոսից, մինչև արտադրությունը։`,
    ig: () =>
      `Իրական նյութեր, իրական չափեր, բացվող դարակներ։ Պատվիրատուն ընտրեց գույներն ինքը և տեսավ գինը։\n\nՉափերն ուղարկեք՝ և 24–48 ժամում ստացեք Ձեր 3D հղումը։`,
    li: () =>
      `${cap(n.gen)} վաճառքը՝ մինչև արտադրությունը\n\nԱյս ${n.gen} պատվիրատուն հաստատեց նախագիծը առաջին հանդիպմանը՝ ինտերակտիվ 3D հղումով։\n• Ֆասադներ և նյութեր՝ իրական արտադրողներից\n• Կտրման քարտեզ և ֆուրնիտուրայի ցանկ՝ նույն մոդելից\n• Զրո վերագծում, ավելի քիչ խոտան\n\nԿահույք արտադրողների համար առաջարկում ենք փորձնական նախագիծ՝ մեկ իրական պատվերով։`,
    tg: (site) =>
      `${cap(n.nom)}՝ էսքիզից մինչև 3D և կտրման քարտեզ։ Պատվիրատուն հաստատեց հեռախոսից, արտադրողը ստացավ փաստաթղթերը նույն մոդելից։\n\nՁեր նախագիծը՝ ${site}`,
    ytTitle: () => `${cap(n.nom)} 3D-ով՝ մինչև պատրաստելը | ArchiTek Soft`,
    yt: (site) =>
      `Ինտերակտիվ ${n.nom}՝ իրական նյութերով և ֆուրնիտուրայով։ Պատվիրատուն քայլում է սենյակում, բացում դարակները, փոխում ֆասադները և հաստատում։\n\nԱրտադրողը նույն մոդելից ստանում է կտրման քարտեզ, ծակման կոորդինատներ և ֆուրնիտուրայի ցանկ։\n\nՍկսել նախագիծ՝ ${site}`,
    tt: () => `${cap(n.def)} հաստատվել է հեռախոսից, մինչև պատրաստելը։`,
    ctaSite: (site) => `Ուղարկեք չափերը՝ ${site}`,
    ctaBio: "Հղումը՝ պրոֆիլում",
    ctaB2b: "Գրեք մեզ փորձնական նախագծի համար։",
  };
}

function ruCopy(n: RuNoun): Copy {
  const designed = byGender(n.g, "спроектированный", "спроектированная", "спроектированное");
  const approved = byGender(n.g, "утверждён", "утверждена", "утверждено");
  const interactive = byGender(n.g, "Интерактивный", "Интерактивная", "Интерактивное");
  const thisAcc = byGender(n.g, "Этот", "Эту", "Это");
  const thisNom = byGender(n.g, "Этот", "Эта", "Это");
  const thisGen = byGender(n.g, "этого", "этой", "этого");
  const yourAcc = byGender(n.g, "свой", "свою", "своё");
  return {
    core: (m) =>
      `${cap(n.nom)}, ${designed} один раз из реальных материалов${m ? ` (${m})` : ""}. Клиент увидел ${byGender(n.g, "его", "её", "его")} в 3D и утвердил до производства. Производитель получил из той же модели карту раскроя и чертежи.`,
    fbHead: () => `Как ${n.nom} утверждается до распила первой плиты`,
    fb: (site) =>
      `${thisAcc} ${n.acc} клиент увидел на своём телефоне: прошёлся по комнате, открыл ящики, поменял цвет фасадов и утвердил.\n\nИз утверждённой модели производитель получил карту раскроя, отметки кромки и список фурнитуры. Без перечерчивания, без «примерно».\n\nХотите увидеть ${yourAcc} ${n.acc} так же? Отправьте размеры: ${site}`,
    igHook: () => `${thisNom} ${n.nom} ${approved} с телефона — до производства.`,
    ig: () =>
      `Реальные материалы, реальные размеры, открывающиеся ящики. Клиент сам выбрал цвета и увидел цену.\n\nОтправьте размеры — и через 24–48 часов получите свою 3D-ссылку.`,
    li: () =>
      `Продажа ${n.gen} до производства\n\nКлиент ${thisGen} ${n.gen} утвердил проект на первой встрече — по интерактивной 3D-ссылке.\n• Фасады и материалы реальных производителей\n• Карта раскроя и список фурнитуры из той же модели\n• Ноль перечерчивания, меньше брака\n\nПроизводителям мебели предлагаем пилотный проект на одном реальном заказе.`,
    tg: (site) =>
      `${cap(n.nom)}: от эскиза до 3D и карты раскроя. Клиент утвердил с телефона, производитель получил документы из той же модели.\n\nВаш проект: ${site}`,
    ytTitle: () => `${cap(n.nom)} в 3D до изготовления | ArchiTek Soft`,
    yt: (site) =>
      `${interactive} ${n.nom} с реальными материалами и фурнитурой. Клиент ходит по комнате, открывает ящики, меняет фасады и утверждает.\n\nПроизводитель получает из той же модели карту раскроя, координаты присадки и список фурнитуры.\n\nНачать проект: ${site}`,
    tt: () => `${cap(n.nom)} ${approved} с телефона — до изготовления.`,
    ctaSite: (site) => `Отправьте размеры: ${site}`,
    ctaBio: "Ссылка в профиле",
    ctaB2b: "Напишите нам о пилотном проекте.",
  };
}

function enCopy(t: string): Copy {
  const a = article(t);
  return {
    core: (m) =>
      `${cap(a)} ${t} designed once, from real materials${m ? ` (${m})` : ""}. The customer saw it in 3D and approved it before production. The maker got the cut list and drawings from the same model.`,
    fbHead: () => `How ${a} ${t} gets approved before the first panel is cut`,
    fb: (site) =>
      `The customer saw this ${t} on their phone: walked around the room, opened the drawers, changed the front colour and approved.\n\nFrom the approved model the maker received the cut list, edge-banding notes and the hardware list. No redrawing, no "approximately".\n\nWant to see your ${t} the same way? Send your measurements: ${site}`,
    igHook: () => `This ${t} was approved from a phone, before production.`,
    ig: () =>
      `Real materials, real sizes, drawers that open. The customer chose the colours and saw the price.\n\nSend your measurements and get your 3D link in 24–48 hours.`,
    li: () =>
      `Selling the ${t} before production\n\nThe customer of this ${t} approved the design at the first meeting, from an interactive 3D link.\n• Fronts and materials from real manufacturers\n• Cut list and hardware list from the same model\n• Zero redrawing, fewer remakes\n\nFor furniture makers we offer a pilot project on one real order.`,
    tg: (site) =>
      `${cap(t)}: from a sketch to 3D and a cut list. The customer approved from a phone; the maker received the documents from the same model.\n\nYour project: ${site}`,
    ytTitle: () => `${cap(t)} in 3D before it is built | ArchiTek Soft`,
    yt: (site) =>
      `An interactive ${t} with real materials and hardware. The customer walks around, opens drawers, switches fronts and approves.\n\nThe maker gets the cut list, drilling coordinates and hardware list from the same model.\n\nStart a project: ${site}`,
    tt: () => `This ${t} was approved from a phone, before it was built.`,
    ctaSite: (site) => `Send your measurements: ${site}`,
    ctaBio: "Link in bio",
    ctaB2b: "Message us about a pilot project.",
  };
}

/** `MAP[key]` without the prototype, so a type named "constructor" cannot resolve to a function. */
function lookup<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function copyFor(l: L, type: string): Copy {
  if (l === "hy") return hyCopy(lookup(HY_TYPES, type) ?? HY_TYPES.other);
  if (l === "ru") return ruCopy(lookup(RU_TYPES, type) ?? RU_TYPES.other);
  return enCopy(lookup(EN_TYPES, type) ?? EN_TYPES.other);
}

/** Keeps the first occurrence of each tag (case-insensitive) so a variant never repeats a hashtag. */
function uniqueTags(tags: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === max) break;
  }
  return out;
}

export function buildTemplatePack(ctx: PostContext): PostPack {
  const brand = getSetting("brand");
  const smm = getSetting("smm");
  const l = ctx.language;
  // No project type means we do not know what is in the photos, and the generic "other" wording is
  // what that deserves. Falling back to "kitchen" made every post from a folder with no `project:`
  // line — the ordinary first-use case with no AI key — claim to be about a kitchen, whatever the
  // renders actually showed.
  const type = ctx.projectType && lookup(EN_TYPES, ctx.projectType) ? ctx.projectType : "other";
  const name = TYPE_NAMES[l][type];
  const tpl = copyFor(l, type);
  const site = ctx.liveLink || brand.website.replace(/^https?:\/\//, "");
  const tags = l === "hy" ? smm.hashtagsHy : l === "ru" ? smm.hashtagsRu : smm.hashtagsEn;
  const video = !!ctx.hasVideo;
  // The hashtags come from the type too: "#kitchen" on a bathroom post is the same mistake as
  // "this kitchen" in the body text.
  const enType = lookup(EN_TYPES, type) ?? EN_TYPES.other;
  const typeTag = `#${enType.replace(/\s+/g, "")}`;
  const typeTag3D = `#${cap(enType.replace(/\s+/g, ""))}3D`;
  const typeTagDesign = `#${cap(enType.replace(/\s+/g, ""))}Design`;

  const all: Record<string, VariantDraft> = {
    facebook: { platform: "facebook", title: tpl.fbHead(), text: tpl.fb(site), hashtags: uniqueTags(tags, 6), cta: tpl.ctaSite(site), format: video ? "video" : "carousel" },
    instagram: { platform: "instagram", text: `${tpl.igHook()}\n\n${tpl.ig()}`, hashtags: uniqueTags([...tags, "#Yerevan", "#InteriorDesign", typeTagDesign], 12), cta: tpl.ctaBio, format: video ? "reel" : "carousel" },
    linkedin: { platform: "linkedin", title: tpl.li().split("\n")[0], text: tpl.li(), hashtags: uniqueTags(["#ArchiTekSoft", "#FurnitureManufacturing", "#3DVisualization", "#B2B"], 5), cta: tpl.ctaB2b, format: video ? "video" : "image" },
    telegram: { platform: "telegram", text: tpl.tg(site), hashtags: [], cta: tpl.ctaSite(site), format: video ? "video" : "image" },
    youtube: { platform: "youtube", title: tpl.ytTitle(), text: tpl.yt(site), hashtags: uniqueTags(["#ArchiTekSoft", typeTag3D, "#Furniture3D", "#Shorts"], 8), cta: tpl.ctaSite(site), format: "short" },
    tiktok: { platform: "tiktok", text: tpl.tt(), hashtags: uniqueTags([typeTag, "#3d", "#furniture3d", "#architeksoft"], 5), format: "short" },
  };

  return {
    title: ctx.projectTitle ? `${ctx.projectTitle} — ${ctx.goal}` : `${name} — ${ctx.goal}`,
    coreText: tpl.core(ctx.materials),
    variants: ctx.platforms.map((p) => all[p]).filter(Boolean),
    provider: "template",
  };
}
