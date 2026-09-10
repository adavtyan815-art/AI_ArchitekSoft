/**
 * Seed demo data so the system is explorable on first start:
 *  - the "Aren" kitchen project with real renders/sketch/video/PDF from ../media_library
 *  - portfolio items using renders/posters from ../landing_page/assets
 *  - sample companies, individual clients, leads, a scheduled post
 * Safe to run repeatedly (skips if projects already exist unless --force).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { saveAsset } from "../src/lib/media";
import { ensureFirstAdmin } from "../src/lib/auth";
import { createLead, createShareLink, logActivity, nextProjectCode } from "../src/lib/crm";
import { nowIso } from "../src/lib/utils";
import { newId } from "../src/lib/ids";

const ROOT = path.resolve(process.cwd(), "..");
const MEDIA = path.join(ROOT, "media_library");
const LANDING = path.join(ROOT, "landing_page", "assets");
const force = process.argv.includes("--force");

function mimeOf(file: string) {
  const ext = path.extname(file).toLowerCase();
  return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".mov": "video/quicktime", ".pdf": "application/pdf" } as Record<string, string>)[ext] ?? "application/octet-stream";
}

async function importFile(file: string, opts: { kindHint?: string; projectId?: string | null; caption?: string; isPublic?: boolean }) {
  if (!fs.existsSync(file)) {
    console.warn("  (missing) " + file);
    return null;
  }
  const buffer = fs.readFileSync(file);
  const a = await saveAsset({ buffer, originalName: path.basename(file), mime: mimeOf(file), kindHint: opts.kindHint, projectId: opts.projectId ?? null, caption: opts.caption ?? null, isPublic: opts.isPublic ?? false });
  console.log(`  + ${a.kind.padEnd(8)} ${path.basename(file)} → ${a.relPath}`);
  return a;
}

async function main() {
  await ensureFirstAdmin();
  const db = getDb();
  const existing = db.select({ c: sql<number>`count(*)` }).from(schema.projects).get()?.c ?? 0;
  if (existing > 0 && !force) {
    console.log(`Seed skipped: ${existing} project(s) already exist. Use --force to add demo data anyway.`);
    return;
  }

  console.log("Seeding companies and clients…");
  const coWood = newId("co");
  db.insert(schema.companies).values({ id: coWood, name: "Wood Dreams", type: "manufacturer", city: "Yerevan", phone: "+374 10 000000", source: "referral", status: "active", tags: JSON.stringify(["kitchens", "wardrobes"]), notes: "Kitchen & closet series on YouTube. Interested in monthly package." }).run();
  const coAmur = newId("co");
  db.insert(schema.companies).values({ id: coAmur, name: "Amur Prof", type: "manufacturer", city: "Vanadzor", source: "linkedin", status: "prospect", notes: "Pilot: 3 kitchens. Wants CNC export." }).run();
  const coDev = newId("co");
  db.insert(schema.companies).values({ id: coDev, name: "Northline Development", type: "developer", city: "Yerevan", source: "linkedin", status: "prospect", notes: "Residential complex presentation (day/night, VR)." }).run();

  const clAren = newId("cl");
  db.insert(schema.clients).values({ id: clAren, kind: "individual", firstName: "Արեն", lastName: "Հովհաննիսյան", phone: "+374 94 000000", telegram: "@aren", language: "hy", city: "Yerevan", source: "instagram", status: "active" }).run();
  const clMaria = newId("cl");
  db.insert(schema.clients).values({ id: clMaria, kind: "individual", firstName: "Мария", lastName: "Петросян", phone: "+374 98 111111", language: "ru", city: "Yerevan", source: "facebook", status: "lead" }).run();
  const ctWood = newId("cl");
  db.insert(schema.clients).values({ id: ctWood, kind: "contact", companyId: coWood, firstName: "Davit", lastName: "Sargsyan", position: "Owner", phone: "+374 91 222222", email: "davit@wooddreams.am", language: "hy", status: "active" }).run();
  const ctAmur = newId("cl");
  db.insert(schema.clients).values({ id: ctAmur, kind: "contact", companyId: coAmur, firstName: "Armen", lastName: "Grigoryan", position: "Production manager", phone: "+374 93 333333", language: "hy", status: "active" }).run();

  console.log("Seeding the Aren kitchen project with real media…");
  const prjAren = newId("prj");
  db.insert(schema.projects)
    .values({
      id: prjAren,
      code: nextProjectCode(),
      title: "Aren — living room TV wall & storage",
      segment: "b2c",
      type: "living",
      stage: "approval",
      status: "active",
      clientId: clAren,
      description: "Անհատական նախագծված TV գոտի և պահարան՝ մատ բեժ ֆասադներով, ինտեգրված Blum ֆուրնիտուրայով։ Էսքիզից մինչև 3D և արտադրական ռասկրոյ։",
      materials: "EGGER matt facades (beige), Blum Legrabox / Tip-On, ABS 1mm edge",
      room: JSON.stringify({ width: 2.32, depth: 0.45, height: 2.8 }),
      quoteAmount: 1850000,
      depositAmount: 500000,
      paidAmount: 500000,
      currency: "AMD",
      liveUrl: "https://live.architeksoft.com/?instanceUuid=demo",
      isPortfolio: true,
    })
    .run();
  const sketch = await importFile(path.join(MEDIA, "photo_2026-09-08_15-44-07.jpg"), { kindHint: "sketch", projectId: prjAren, caption: "Hand sketch from the client" });
  const r1 = await importFile(path.join(MEDIA, "WD1.jpg"), { projectId: prjAren, caption: "Main view", isPublic: true });
  const r2 = await importFile(path.join(MEDIA, "WD2.jpg"), { projectId: prjAren, caption: "Detail", isPublic: true });
  const r3 = await importFile(path.join(MEDIA, "WD3.jpg"), { projectId: prjAren, caption: "Storage open", isPublic: true });
  const vid = await importFile(path.join(MEDIA, "ArchiTek_Kitchen Preview .mp4"), { projectId: prjAren, caption: "Preview video", isPublic: true });
  const pdf = await importFile(path.join(MEDIA, "Aren.pdf"), { projectId: prjAren, caption: "Production drawings & cut list" });
  db.update(schema.projects).set({ coverAssetId: r1?.id ?? null, sketchAssetId: sketch?.id ?? null, pdfAssetId: pdf?.id ?? null }).where(eq(schema.projects.id, prjAren)).run();
  logActivity("project", prjAren, "3D link sent to the client via Telegram", "message");
  logActivity("project", prjAren, "Client asked to make the TV unit 10 cm lower", "note");
  const link = createShareLink(prjAren, { title: "Արեն — TV գոտի և պահարան", message: "Բարև Արեն։ Ահա Ձեր նախագծի ինտերակտիվ էջը։ Նայեք, փորձեք և գրեք, թե ինչ փոխել։", language: "hy", expiresDays: 60, showPdf: true, allowDownload: true });
  db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: "telegram", viewsCount: 7, lastViewedAt: nowIso() }).where(eq(schema.shareLinks.id, link.id)).run();
  for (let i = 0; i < 7; i++) db.insert(schema.shareEvents).values({ shareLinkId: link.id, type: "view", createdAt: new Date(Date.now() - i * 5 * 3600_000).toISOString() }).run();
  db.insert(schema.shareEvents).values({ shareLinkId: link.id, type: "open_live" }).run();

  console.log("Seeding B2B projects…");
  const prjWood = newId("prj");
  db.insert(schema.projects).values({ id: prjWood, code: nextProjectCode(), title: "Wood Dreams — kitchen series (pilot)", segment: "b2b", type: "kitchen", stage: "design", status: "active", clientId: ctWood, companyId: coWood, description: "Pilot: one real kitchen order. 3D link for their customer + cut list.", quoteAmount: 350000, currency: "AMD", materials: "Kronospan, Hettich" }).run();
  const wd1 = await importFile(path.join(LANDING, "videos", "video01_poster.jpg"), { projectId: prjWood, caption: "Kitchen — walnut fronts", isPublic: true });
  await importFile(path.join(LANDING, "videos", "video01.mp4"), { projectId: prjWood, caption: "Kitchen walkthrough", isPublic: true });
  db.update(schema.projects).set({ coverAssetId: wd1?.id ?? null }).where(eq(schema.projects.id, prjWood)).run();
  const prjAmur = newId("prj");
  db.insert(schema.projects).values({ id: prjAmur, code: nextProjectCode(), title: "Amur Prof — wardrobe & kitchen (3 units)", segment: "b2b", type: "wardrobe", stage: "production_prep", status: "active", clientId: ctAmur, companyId: coAmur, quoteAmount: 900000, depositAmount: 300000, paidAmount: 300000, currency: "AMD" }).run();
  const ap1 = await importFile(path.join(LANDING, "videos", "video03_poster.jpg"), { projectId: prjAmur, caption: "Wardrobe", isPublic: true });
  await importFile(path.join(LANDING, "videos", "video03.mp4"), { projectId: prjAmur, caption: "Wardrobe walkthrough", isPublic: true });
  db.update(schema.projects).set({ coverAssetId: ap1?.id ?? null }).where(eq(schema.projects.id, prjAmur)).run();
  const prjDev = newId("prj");
  db.insert(schema.projects).values({ id: prjDev, code: nextProjectCode(), title: "Northline — cottage village presentation", segment: "b2b", type: "house", stage: "handover", status: "done", companyId: coDev, quoteAmount: 2400000, paidAmount: 2400000, currency: "AMD", isPortfolio: true }).run();
  const dv1 = await importFile(path.join(LANDING, "videos", "video02_poster.jpg"), { projectId: prjDev, caption: "Exterior", isPublic: true });
  await importFile(path.join(LANDING, "videos", "video02.mp4"), { projectId: prjDev, caption: "Exterior flythrough", isPublic: true });
  const dv2 = await importFile(path.join(LANDING, "images", "gallery06", "7722e149_original.jpg"), { projectId: prjDev, caption: "Cottage", isPublic: true });
  db.update(schema.projects).set({ coverAssetId: dv1?.id ?? null }).where(eq(schema.projects.id, prjDev)).run();
  const prjLiving = newId("prj");
  db.insert(schema.projects).values({ id: prjLiving, code: nextProjectCode(), title: "Living room & TV zone — 4K", segment: "b2c", type: "living", stage: "handover", status: "done", clientId: clMaria, quoteAmount: 420000, paidAmount: 420000, isPortfolio: true }).run();
  const lv1 = await importFile(path.join(LANDING, "videos", "video04_poster.jpg"), { projectId: prjLiving, caption: "Living room", isPublic: true });
  await importFile(path.join(LANDING, "videos", "video04.mp4"), { projectId: prjLiving, caption: "Living room walkthrough", isPublic: true });
  db.update(schema.projects).set({ coverAssetId: lv1?.id ?? null }).where(eq(schema.projects.id, prjLiving)).run();
  const prjInterior = newId("prj");
  db.insert(schema.projects).values({ id: prjInterior, code: nextProjectCode(), title: "Apartment interior — full walkthrough", segment: "b2b", type: "apartment", stage: "handover", status: "done", companyId: coDev, isPortfolio: true }).run();
  const in1 = await importFile(path.join(LANDING, "videos", "video10_poster.jpg"), { projectId: prjInterior, caption: "Interior", isPublic: true });
  await importFile(path.join(LANDING, "videos", "video10.mp4"), { projectId: prjInterior, caption: "Interior walkthrough", isPublic: true });
  const in2 = await importFile(path.join(LANDING, "videos", "video11_poster.jpg"), { projectId: prjInterior, caption: "Interior 2", isPublic: true });
  db.update(schema.projects).set({ coverAssetId: in1?.id ?? null }).where(eq(schema.projects.id, prjInterior)).run();

  console.log("Seeding portfolio…");
  const items = [
    { slug: "aren-tv-wall", category: "living", title: { hy: "Արեն — TV գոտի և պահարան", ru: "Арен — ТВ-зона и шкаф", en: "Aren — TV wall & storage" }, summary: { hy: "Ձեռքի էսքիզից մինչև 3D և արտադրական ռասկրոյ։", ru: "От эскиза от руки до 3D и карты раскроя.", en: "From a hand sketch to 3D and a production cut list." }, cover: r1, assets: [r1, r2, r3], video: vid, projectId: prjAren, featured: true },
    { slug: "walnut-kitchen", category: "kitchen", title: { hy: "Ընկուզենու խոհանոց", ru: "Кухня с ореховыми фасадами", en: "Walnut kitchen" }, summary: { hy: "Ինտերակտիվ խոհանոց՝ բացվող դարակներով և նյութերի փոփոխությամբ։", ru: "Интерактивная кухня с открывающимися ящиками и сменой материалов.", en: "Interactive kitchen with opening drawers and material switching." }, cover: wd1, assets: [wd1], video: null, projectId: prjWood, featured: true },
    { slug: "wardrobe-system", category: "wardrobe", title: { hy: "Պահարանի համակարգ", ru: "Гардеробная система", en: "Wardrobe system" }, summary: { hy: "Դռների և դարակների սիմուլյացիա, Blum ֆուրնիտուրա։", ru: "Симуляция дверей и полок, фурнитура Blum.", en: "Door and shelf simulation, Blum hardware." }, cover: ap1, assets: [ap1], video: null, projectId: prjAmur, featured: false },
    { slug: "cottage-village", category: "real_estate", title: { hy: "Քոթեջային ավան", ru: "Коттеджный посёлок", en: "Cottage village" }, summary: { hy: "Արտաքին և ներքին շրջայց, օր/գիշեր, կահավորում։", ru: "Внешний и внутренний тур, день/ночь, меблировка.", en: "Exterior and interior tour, day/night, furnishing." }, cover: dv1, assets: [dv1, dv2], video: null, projectId: prjDev, featured: true },
    { slug: "living-room-4k", category: "living", title: { hy: "Հյուրասենյակ և TV գոտի", ru: "Гостиная и ТВ-зона", en: "Living room & TV zone" }, summary: { hy: "Մեծաֆորմատ կերամոգրանիտ, փայտե ռեյկաներ, կենսաբուխարի։", ru: "Крупноформатный керамогранит, деревянные рейки, биокамин.", en: "Large-format porcelain, wood slats, bio fireplace." }, cover: lv1, assets: [lv1], video: null, projectId: prjLiving, featured: false },
    { slug: "apartment-interior", category: "real_estate", title: { hy: "Բնակարանի ինտերիեր", ru: "Интерьер квартиры", en: "Apartment interior" }, summary: { hy: "Ամբողջական բնակարանի շրջայց՝ մեկ հղումով։", ru: "Полный тур по квартире по одной ссылке.", en: "Full apartment walkthrough from one link." }, cover: in1, assets: [in1, in2], video: null, projectId: prjInterior, featured: false },
  ];
  items.forEach((it, i) =>
    db.insert(schema.portfolioItems)
      .values({ id: newId("pf"), projectId: it.projectId, slug: it.slug, category: it.category, title: JSON.stringify(it.title), summary: JSON.stringify(it.summary), coverAssetId: it.cover?.id ?? null, assetIds: JSON.stringify(it.assets.filter(Boolean).map((a) => a!.id)), videoAssetId: it.video?.id ?? null, isPublished: true, isFeatured: it.featured, sortOrder: i })
      .run()
  );

  console.log("Seeding leads…");
  const l1 = createLead({ segment: "b2c", name: "Անի Մարտիրոսյան", phone: "+374 77 444444", telegram: "@ani_m", language: "hy", service: "kitchenpro", roomType: "kitchen", budget: "1–2 մլն ֏", message: "Ուզում եմ 3.2×2.6 խոհանոց, Г-ձև, մատ սպիտակ ֆասադներ։ Ֆայլերը կուղարկեմ Telegram-ով։", details: { dims: { width: 3.2, depth: 2.6, height: 2.7 }, style: "minimal, matt white, wood worktop", appliances: "fridge, oven, dishwasher" }, source: "instagram" });
  createLead({ segment: "b2b", name: "Karen Avetisyan", companyName: "KA Furniture", phone: "+374 55 555555", email: "karen@kafurniture.am", language: "hy", service: "cnc", message: "Հետաքրքիր է կտրման քարտեզի ավտոմատացումը։ 10–15 խոհանոց ամսական։", details: { companyType: "manufacturer", volume: "10–30" }, source: "website" });
  const l3 = createLead({ segment: "b2c", name: "Elena Sargsyan", phone: "+374 99 666666", language: "ru", service: "showroom", roomType: "wardrobe", message: "Гардеробная 2.4 м, раздвижные двери.", source: "facebook" });
  db.update(schema.leads).set({ status: "contacted" }).where(eq(schema.leads.id, l3.id)).run();
  createLead({ segment: "b2b", name: "Suren Hakobyan", companyName: "Domus Studio", email: "info@domus.am", language: "en", service: "showroom", message: "We would like a showroom screen configurator for our Yerevan store.", details: { companyType: "retailer", volume: "4–10" }, source: "linkedin" });
  db.update(schema.leads).set({ status: "won", updatedAt: nowIso() }).where(eq(schema.leads.id, l1.id)).run();

  console.log("Seeding tasks and a scheduled post…");
  db.insert(schema.tasks).values({ id: newId("task"), title: "Call Ani about survey date", dueAt: new Date(Date.now() + 86400_000).toISOString(), priority: "high", entityType: "lead", entityId: l1.id }).run();
  db.insert(schema.tasks).values({ id: newId("task"), title: "Send Amur Prof the CNC export sample", dueAt: new Date(Date.now() + 2 * 86400_000).toISOString(), entityType: "project", entityId: prjAmur }).run();
  db.insert(schema.tasks).values({ id: newId("task"), title: "Renew live.architeksoft.com TLS certificate (expired 17 Jul 2026)", priority: "high" }).run();

  const postId = newId("post");
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(11, 0, 0, 0);
  db.insert(schema.posts).values({ id: postId, projectId: prjAren, title: "Aren TV wall — from sketch to 3D", goal: "showcase", language: "hy", coreText: "Ձեռքի էսքիզից մինչև 3D և արտադրական ռասկրոյ։ Պատվիրատուն հաստատեց հեռախոսից։", status: "scheduled", scheduledAt: tomorrow.toISOString() }).run();
  const variants: [string, string, string[]][] = [
    ["facebook", "Այս TV գոտին պատվիրատուն տեսավ իր հեռախոսում՝ քայլեց սենյակում, բացեց դարակները և հաստատեց։\n\nՀաստատված մոդելից արտադրողը ստացավ կտրման քարտեզն ու ֆուրնիտուրայի ցանկը։\n\nՈւզո՞ւմ եք Ձեր կահույքը տեսնել նույն կերպ։ Ուղարկեք չափերը՝ architeksoft.com", ["#ArchiTekSoft", "#KitchenPro", "#Կահույք", "#3DՎիզուալիզացիա", "#Երևան"]],
    ["instagram", "Էսքիզից մինչև 3D՝ մինչև պատրաստելը։\n\nԻրական նյութեր, իրական չափեր, բացվող դարակներ։ Պատվիրատուն ընտրեց գույներն ինքը։\n\nՉափերն ուղարկեք՝ և 24–48 ժամում ստացեք Ձեր 3D հղումը։", ["#ArchiTekSoft", "#KitchenPro", "#Կահույք", "#Ինտերիեր", "#Երևան", "#InteriorDesign", "#3D"]],
    ["linkedin", "Հաստատումը՝ մինչև արտադրությունը\n\nԱյս նախագծի պատվիրատուն հաստատեց տարբերակը առաջին հանդիպմանը՝ ինտերակտիվ 3D հղումով։\n• Ֆասադներ և նյութեր՝ իրական արտադրողներից\n• Կտրման քարտեզ և ֆուրնիտուրայի ցանկ՝ նույն մոդելից\n• Զրո վերագծում\n\nԿահույք արտադրողների համար՝ փորձնական նախագիծ մեկ իրական պատվերով։", ["#KitchenPro", "#FurnitureManufacturing", "#ArchiTekSoft"]],
    ["telegram", "TV գոտի՝ էսքիզից մինչև 3D և կտրման քարտեզ։ Պատվիրատուն հաստատեց հեռախոսից։\n\nՁեր նախագիծը՝ architeksoft.com", []],
  ];
  for (const [platform, text, tags] of variants) db.insert(schema.postVariants).values({ id: newId("var"), postId, platform, enabled: true, text, hashtags: JSON.stringify(tags), format: "carousel" }).run();
  [r1, r2, r3].filter(Boolean).forEach((a, i) => db.insert(schema.postAssets).values({ postId, assetId: a!.id, role: "media", sortOrder: i }).run());

  // Some analytics history so charts are not empty
  const paths = ["/", "/kitchenpro", "/for-business", "/for-home", "/portfolio", "/start", "/contact"];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(Date.now() - d * 86400_000);
    const n = 8 + Math.floor(Math.random() * 20);
    for (let i = 0; i < n; i++) {
      const p = paths[Math.floor(Math.random() * paths.length)];
      db.insert(schema.analyticsEvents).values({ type: "page_view", path: p, locale: ["hy", "hy", "ru", "en"][Math.floor(Math.random() * 4)], referrer: ["", "", "instagram.com", "facebook.com", "linkedin.com", "google.com"][Math.floor(Math.random() * 6)], visitorHash: `seed${d}_${Math.floor(Math.random() * 12)}`, createdAt: new Date(day.getTime() + Math.random() * 86400_000).toISOString() }).run();
    }
    if (Math.random() < 0.35) db.insert(schema.analyticsEvents).values({ type: "form_submit", path: "/start", segment: Math.random() < 0.4 ? "b2b" : "b2c", visitorHash: `seed${d}_x`, createdAt: new Date(day.getTime() + 43200_000).toISOString() }).run();
  }

  console.log(`\nDone. Client page: /p/${link.slug}?k=${link.token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
