/**
 * Seed demo data so the system is explorable on first start:
 *  - the "Aren" kitchen project with real renders/sketch/video/PDF from ../media_library
 *  - portfolio items using renders/posters from ../landing_page/assets
 *  - sample companies, individual clients, leads, a scheduled post
 *
 * Safe to run repeatedly:
 *  - without --force it skips as soon as any project exists;
 *  - with --force it adds only the demo records that are missing (companies, clients, projects, portfolio
 *    slugs, leads, tasks and the post are matched by their natural key), so a second run changes nothing;
 *  - media files are imported first, then every database write happens in ONE transaction. If anything
 *    fails the transaction rolls back and the files imported by this run are deleted again, so a crash
 *    never leaves a half-seeded database that later runs would skip.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { getDb, getSqlite, schema } from "../src/lib/db";
import { saveAsset } from "../src/lib/media";
import { ensureFirstAdmin } from "../src/lib/auth";
import { createLead, createShareLink, logActivity, nextProjectCode, type NewLeadInput } from "../src/lib/crm";
import { env } from "../src/lib/env";
import { nowIso } from "../src/lib/utils";
import { newId } from "../src/lib/ids";

const ROOT = path.resolve(process.cwd(), "..");
const MEDIA = path.join(ROOT, "media_library");
const LANDING = path.join(ROOT, "landing_page", "assets");

type Asset = Awaited<ReturnType<typeof saveAsset>>;
type MediaSpec = { file: string; kindHint?: string; caption: string; isPublic?: boolean };
type Localized = Record<"hy" | "ru" | "en", string>;

/** Demo projects, matched by title on later runs. */
const PROJECT_TITLES = {
  aren: "Aren — living room TV wall & storage",
  wood: "Wood Dreams — kitchen series (pilot)",
  amur: "Amur Prof — wardrobe & kitchen (3 units)",
  dev: "Northline — cottage village presentation",
  living: "Living room & TV zone — 4K",
  interior: "Apartment interior — full walkthrough",
} as const;
type ProjectKey = keyof typeof PROJECT_TITLES;
const PROJECT_KEYS = Object.keys(PROJECT_TITLES) as ProjectKey[];

const video = (name: string) => path.join(LANDING, "videos", name);

/** Files imported for each demo project (only when the project is created by this run). */
const PROJECT_MEDIA: Record<ProjectKey, MediaSpec[]> = {
  aren: [
    { file: path.join(MEDIA, "photo_2026-09-08_15-44-07.jpg"), kindHint: "sketch", caption: "Hand sketch from the client" },
    { file: path.join(MEDIA, "WD1.jpg"), caption: "Main view", isPublic: true },
    { file: path.join(MEDIA, "WD2.jpg"), caption: "Detail", isPublic: true },
    { file: path.join(MEDIA, "WD3.jpg"), caption: "Storage open", isPublic: true },
    { file: path.join(MEDIA, "ArchiTek_Kitchen Preview .mp4"), caption: "Preview video", isPublic: true },
    { file: path.join(MEDIA, "Aren.pdf"), caption: "Production drawings & cut list" },
  ],
  wood: [
    { file: video("video01_poster.jpg"), caption: "Kitchen — walnut fronts", isPublic: true },
    { file: video("video01.mp4"), caption: "Kitchen walkthrough", isPublic: true },
  ],
  amur: [
    { file: video("video03_poster.jpg"), caption: "Wardrobe", isPublic: true },
    { file: video("video03.mp4"), caption: "Wardrobe walkthrough", isPublic: true },
  ],
  dev: [
    { file: video("video02_poster.jpg"), caption: "Exterior", isPublic: true },
    { file: video("video02.mp4"), caption: "Exterior flythrough", isPublic: true },
    { file: path.join(LANDING, "images", "gallery06", "7722e149_original.jpg"), caption: "Cottage", isPublic: true },
  ],
  living: [
    { file: video("video04_poster.jpg"), caption: "Living room", isPublic: true },
    { file: video("video04.mp4"), caption: "Living room walkthrough", isPublic: true },
  ],
  interior: [
    { file: video("video10_poster.jpg"), caption: "Interior", isPublic: true },
    { file: video("video10.mp4"), caption: "Interior walkthrough", isPublic: true },
    { file: video("video11_poster.jpg"), caption: "Interior 2", isPublic: true },
  ],
};

function mimeOf(file: string) {
  const ext = path.extname(file).toLowerCase();
  return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".mov": "video/quicktime", ".pdf": "application/pdf" } as Record<string, string>)[ext] ?? "application/octet-stream";
}

/** Writes the file + thumbnail and inserts the asset row, not yet attached to a project. */
async function importFile(spec: MediaSpec): Promise<Asset | null> {
  if (!fs.existsSync(spec.file)) {
    console.warn("  (missing) " + spec.file);
    return null;
  }
  const buffer = fs.readFileSync(spec.file);
  const a = await saveAsset({ buffer, originalName: path.basename(spec.file), mime: mimeOf(spec.file), kindHint: spec.kindHint, projectId: null, caption: spec.caption, isPublic: spec.isPublic ?? false });
  console.log(`  + ${a.kind.padEnd(8)} ${path.basename(spec.file)} → ${a.relPath}`);
  return a;
}

/** Undo the media import of a failed run: asset rows and the files behind them. */
function removeImported(assets: Asset[]) {
  if (assets.length === 0) return;
  try {
    getDb().delete(schema.assets).where(inArray(schema.assets.id, assets.map((a) => a.id))).run();
  } catch (e) {
    console.warn("  could not remove the imported asset rows:", (e as Error).message);
  }
  for (const a of assets) {
    for (const rel of [a.relPath, a.thumbRelPath]) {
      if (!rel) continue;
      try {
        fs.unlinkSync(path.join(env.uploadDir, rel));
      } catch {
        /* already gone */
      }
    }
  }
  console.warn(`  rolled back: removed ${assets.length} media file(s) imported by this run.`);
}

/** Exported so a test harness can run the seed against a scratch database. */
export async function seedDemo({ force = false }: { force?: boolean } = {}) {
  await ensureFirstAdmin();
  const db = getDb();
  const existing = db.select({ c: sql<number>`count(*)` }).from(schema.projects).get()?.c ?? 0;
  if (existing > 0 && !force) {
    console.log(`Seed skipped: ${existing} project(s) already exist. Use --force to add the missing demo data anyway.`);
    return;
  }

  // ---- 1. what is already there (a repeated --force run must not duplicate anything) ---------------
  const projectIds: Partial<Record<ProjectKey, string>> = {};
  const missing: ProjectKey[] = [];
  for (const key of PROJECT_KEYS) {
    const row = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.title, PROJECT_TITLES[key])).get();
    if (row) projectIds[key] = row.id;
    else missing.push(key);
  }

  // ---- 2. media files first (async work cannot run inside the synchronous DB transaction) ----------
  const imported: Asset[] = [];
  const importedBy = new Map<string, Asset>(); // "<project key>/<file name>" → asset of this run
  let summary = "";
  try {
    for (const key of missing) {
      console.log(`Importing media for "${PROJECT_TITLES[key]}"…`);
      for (const spec of PROJECT_MEDIA[key]) {
        const a = await importFile(spec);
        if (!a) continue;
        imported.push(a);
        importedBy.set(`${key}/${path.basename(spec.file)}`, a);
      }
    }

    // ---- 3. every database write in one transaction ------------------------------------------------
    summary = getSqlite().transaction(() => writeDemoData(projectIds, new Set(missing), importedBy))();
  } catch (e) {
    removeImported(imported);
    throw e;
  }
  console.log(summary);
}

/** Runs inside one SQLite transaction: either all demo records of this run exist afterwards or none. */
function writeDemoData(projectIds: Partial<Record<ProjectKey, string>>, created: Set<ProjectKey>, importedBy: Map<string, Asset>): string {
  const db = getDb();
  const added: string[] = [];

  const projectId = (key: ProjectKey): string => {
    const id = projectIds[key];
    if (!id) throw new Error(`Demo project "${key}" is missing`);
    return id;
  };
  /** Asset of a demo project by file name: from this run, or from an earlier seed of the same project. */
  const assetId = (key: ProjectKey, fileName: string): string | null => {
    const fresh = importedBy.get(`${key}/${fileName}`);
    if (fresh) return fresh.id;
    const pid = projectIds[key];
    if (!pid) return null;
    return db.select({ id: schema.assets.id }).from(schema.assets).where(and(eq(schema.assets.projectId, pid), eq(schema.assets.originalName, fileName))).get()?.id ?? null;
  };
  const assetIds = (key: ProjectKey, ...fileNames: string[]) => fileNames.map((f) => assetId(key, f)).filter((v): v is string => !!v);

  // ---- companies and clients -----------------------------------------------------------------------
  console.log("Seeding companies and clients…");
  const company = (values: Omit<typeof schema.companies.$inferInsert, "id">): string => {
    const found = db.select({ id: schema.companies.id }).from(schema.companies).where(eq(schema.companies.name, values.name)).get();
    if (found) return found.id;
    const id = newId("co");
    db.insert(schema.companies).values({ id, ...values }).run();
    added.push(`company ${values.name}`);
    return id;
  };
  const client = (values: Omit<typeof schema.clients.$inferInsert, "id">): string => {
    const found = db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(and(eq(schema.clients.firstName, values.firstName), values.lastName ? eq(schema.clients.lastName, values.lastName) : isNull(schema.clients.lastName), values.phone ? eq(schema.clients.phone, values.phone) : isNull(schema.clients.phone)))
      .get();
    if (found) return found.id;
    const id = newId("cl");
    db.insert(schema.clients).values({ id, ...values }).run();
    added.push(`client ${values.firstName} ${values.lastName ?? ""}`.trim());
    return id;
  };

  const coWood = company({ name: "Wood Dreams", type: "manufacturer", city: "Yerevan", phone: "+374 10 000000", source: "referral", status: "active", tags: JSON.stringify(["kitchens", "wardrobes"]), notes: "Kitchen & closet series on YouTube. Interested in monthly package." });
  const coAmur = company({ name: "Amur Prof", type: "manufacturer", city: "Vanadzor", source: "linkedin", status: "prospect", notes: "Pilot: 3 kitchens. Wants CNC export." });
  const coDev = company({ name: "Northline Development", type: "developer", city: "Yerevan", source: "linkedin", status: "prospect", notes: "Residential complex presentation (day/night, VR)." });

  const clAren = client({ kind: "individual", firstName: "Արեն", lastName: "Հովհաննիսյան", phone: "+374 94 000000", telegram: "@aren", language: "hy", city: "Yerevan", source: "instagram", status: "active" });
  const clMaria = client({ kind: "individual", firstName: "Мария", lastName: "Петросян", phone: "+374 98 111111", language: "ru", city: "Yerevan", source: "facebook", status: "lead" });
  const ctWood = client({ kind: "contact", companyId: coWood, firstName: "Davit", lastName: "Sargsyan", position: "Owner", phone: "+374 91 222222", email: "davit@wooddreams.am", language: "hy", status: "active" });
  const ctAmur = client({ kind: "contact", companyId: coAmur, firstName: "Armen", lastName: "Grigoryan", position: "Production manager", phone: "+374 93 333333", language: "hy", status: "active" });

  // ---- projects ------------------------------------------------------------------------------------
  /** Creates the project when this run is responsible for it and attaches the media imported for it. */
  const project = (key: ProjectKey, values: Omit<typeof schema.projects.$inferInsert, "id" | "code" | "title">, roles: { cover?: string; sketch?: string; pdf?: string }) => {
    if (!created.has(key)) return;
    const id = newId("prj");
    db.insert(schema.projects).values({ id, code: nextProjectCode(), title: PROJECT_TITLES[key], ...values }).run();
    projectIds[key] = id;
    const mine = [...importedBy.entries()].filter(([k]) => k.startsWith(`${key}/`)).map(([, a]) => a.id);
    if (mine.length) db.update(schema.assets).set({ projectId: id }).where(inArray(schema.assets.id, mine)).run();
    db.update(schema.projects)
      .set({
        coverAssetId: roles.cover ? assetId(key, roles.cover) : null,
        sketchAssetId: roles.sketch ? assetId(key, roles.sketch) : null,
        pdfAssetId: roles.pdf ? assetId(key, roles.pdf) : null,
      })
      .where(eq(schema.projects.id, id))
      .run();
    added.push(`project ${PROJECT_TITLES[key]}`);
  };

  console.log("Seeding projects…");
  project(
    "aren",
    {
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
    },
    { cover: "WD1.jpg", sketch: "photo_2026-09-08_15-44-07.jpg", pdf: "Aren.pdf" }
  );
  if (created.has("aren")) {
    logActivity("project", projectId("aren"), "3D link sent to the client via Telegram", "message");
    logActivity("project", projectId("aren"), "Client asked to make the TV unit 10 cm lower", "note");
  }
  project("wood", { segment: "b2b", type: "kitchen", stage: "design", status: "active", clientId: ctWood, companyId: coWood, description: "Pilot: one real kitchen order. 3D link for their customer + cut list.", quoteAmount: 350000, currency: "AMD", materials: "Kronospan, Hettich" }, { cover: "video01_poster.jpg" });
  project("amur", { segment: "b2b", type: "wardrobe", stage: "production_prep", status: "active", clientId: ctAmur, companyId: coAmur, quoteAmount: 900000, depositAmount: 300000, paidAmount: 300000, currency: "AMD" }, { cover: "video03_poster.jpg" });
  project("dev", { segment: "b2b", type: "house", stage: "handover", status: "done", companyId: coDev, quoteAmount: 2400000, paidAmount: 2400000, currency: "AMD", isPortfolio: true }, { cover: "video02_poster.jpg" });
  project("living", { segment: "b2c", type: "living", stage: "handover", status: "done", clientId: clMaria, quoteAmount: 420000, paidAmount: 420000, isPortfolio: true }, { cover: "video04_poster.jpg" });
  project("interior", { segment: "b2b", type: "apartment", stage: "handover", status: "done", companyId: coDev, isPortfolio: true }, { cover: "video10_poster.jpg" });

  // ---- the Aren client page ------------------------------------------------------------------------
  let link = db.select().from(schema.shareLinks).where(eq(schema.shareLinks.projectId, projectId("aren"))).get();
  if (!link) {
    link = createShareLink(projectId("aren"), { title: "Արեն — TV գոտի և պահարան", message: "Բարև Արեն։ Ահա Ձեր նախագծի ինտերակտիվ էջը։ Նայեք, փորձեք և գրեք, թե ինչ փոխել։", language: "hy", expiresDays: 60, showPdf: true, allowDownload: true });
    db.update(schema.shareLinks).set({ sentAt: nowIso(), sentVia: "telegram", viewsCount: 7, lastViewedAt: nowIso() }).where(eq(schema.shareLinks.id, link.id)).run();
    for (let i = 0; i < 7; i++) db.insert(schema.shareEvents).values({ shareLinkId: link.id, type: "view", createdAt: new Date(Date.now() - i * 5 * 3600_000).toISOString() }).run();
    db.insert(schema.shareEvents).values({ shareLinkId: link.id, type: "open_live" }).run();
    added.push(`client page /p/${link.slug}`);
  }

  // ---- portfolio (slug is UNIQUE: existing items are left untouched) --------------------------------
  console.log("Seeding portfolio…");
  const items: { slug: string; category: string; title: Localized; summary: Localized; project: ProjectKey; cover: string; assets: string[]; video: string | null; featured: boolean }[] = [
    { slug: "aren-tv-wall", category: "living", title: { hy: "Արեն — TV գոտի և պահարան", ru: "Арен — ТВ-зона и шкаф", en: "Aren — TV wall & storage" }, summary: { hy: "Ձեռքի էսքիզից մինչև 3D և արտադրական ռասկրոյ։", ru: "От эскиза от руки до 3D и карты раскроя.", en: "From a hand sketch to 3D and a production cut list." }, project: "aren", cover: "WD1.jpg", assets: ["WD1.jpg", "WD2.jpg", "WD3.jpg"], video: "ArchiTek_Kitchen Preview .mp4", featured: true },
    { slug: "walnut-kitchen", category: "kitchen", title: { hy: "Ընկուզենու խոհանոց", ru: "Кухня с ореховыми фасадами", en: "Walnut kitchen" }, summary: { hy: "Ինտերակտիվ խոհանոց՝ բացվող դարակներով և նյութերի փոփոխությամբ։", ru: "Интерактивная кухня с открывающимися ящиками и сменой материалов.", en: "Interactive kitchen with opening drawers and material switching." }, project: "wood", cover: "video01_poster.jpg", assets: ["video01_poster.jpg"], video: null, featured: true },
    { slug: "wardrobe-system", category: "wardrobe", title: { hy: "Պահարանի համակարգ", ru: "Гардеробная система", en: "Wardrobe system" }, summary: { hy: "Դռների և դարակների սիմուլյացիա, Blum ֆուրնիտուրա։", ru: "Симуляция дверей и полок, фурнитура Blum.", en: "Door and shelf simulation, Blum hardware." }, project: "amur", cover: "video03_poster.jpg", assets: ["video03_poster.jpg"], video: null, featured: false },
    { slug: "cottage-village", category: "real_estate", title: { hy: "Քոթեջային ավան", ru: "Коттеджный посёлок", en: "Cottage village" }, summary: { hy: "Արտաքին և ներքին շրջայց, օր/գիշեր, կահավորում։", ru: "Внешний и внутренний тур, день/ночь, меблировка.", en: "Exterior and interior tour, day/night, furnishing." }, project: "dev", cover: "video02_poster.jpg", assets: ["video02_poster.jpg", "7722e149_original.jpg"], video: null, featured: true },
    { slug: "living-room-4k", category: "living", title: { hy: "Հյուրասենյակ և TV գոտի", ru: "Гостиная и ТВ-зона", en: "Living room & TV zone" }, summary: { hy: "Մեծաֆորմատ կերամոգրանիտ, փայտե ռեյկաներ, կենսաբուխարի։", ru: "Крупноформатный керамогранит, деревянные рейки, биокамин.", en: "Large-format porcelain, wood slats, bio fireplace." }, project: "living", cover: "video04_poster.jpg", assets: ["video04_poster.jpg"], video: null, featured: false },
    { slug: "apartment-interior", category: "real_estate", title: { hy: "Բնակարանի ինտերիեր", ru: "Интерьер квартиры", en: "Apartment interior" }, summary: { hy: "Ամբողջական բնակարանի շրջայց՝ մեկ հղումով։", ru: "Полный тур по квартире по одной ссылке.", en: "Full apartment walkthrough from one link." }, project: "interior", cover: "video10_poster.jpg", assets: ["video10_poster.jpg", "video11_poster.jpg"], video: null, featured: false },
  ];
  const takenSlugs = new Set(
    db
      .select({ slug: schema.portfolioItems.slug })
      .from(schema.portfolioItems)
      .where(inArray(schema.portfolioItems.slug, items.map((it) => it.slug)))
      .all()
      .map((r) => r.slug)
  );
  items.forEach((it, i) => {
    if (takenSlugs.has(it.slug)) {
      console.log(`  = portfolio/${it.slug} already exists, left as it is`);
      return;
    }
    db.insert(schema.portfolioItems)
      .values({ id: newId("pf"), projectId: projectId(it.project), slug: it.slug, category: it.category, title: JSON.stringify(it.title), summary: JSON.stringify(it.summary), coverAssetId: assetId(it.project, it.cover), assetIds: JSON.stringify(assetIds(it.project, ...it.assets)), videoAssetId: it.video ? assetId(it.project, it.video) : null, isPublished: true, isFeatured: it.featured, sortOrder: i })
      .run();
    added.push(`portfolio ${it.slug}`);
  });

  // ---- leads ---------------------------------------------------------------------------------------
  console.log("Seeding leads…");
  const lead = (input: NewLeadInput, status?: "contacted" | "won"): string => {
    const contact = input.phone ? eq(schema.leads.phone, input.phone) : input.email ? eq(schema.leads.email, input.email) : undefined;
    const found = db.select({ id: schema.leads.id }).from(schema.leads).where(and(eq(schema.leads.name, input.name), contact)).get();
    if (found) return found.id;
    const row = createLead(input);
    if (status) db.update(schema.leads).set({ status, updatedAt: nowIso() }).where(eq(schema.leads.id, row.id)).run();
    added.push(`lead ${input.name}`);
    return row.id;
  };
  const leadAni = lead({ segment: "b2c", name: "Անի Մարտիրոսյան", phone: "+374 77 444444", telegram: "@ani_m", language: "hy", service: "kitchenpro", roomType: "kitchen", budget: "1–2 մլն ֏", message: "Ուզում եմ 3.2×2.6 խոհանոց, Г-ձև, մատ սպիտակ ֆասադներ։ Ֆայլերը կուղարկեմ Telegram-ով։", details: { dims: { width: 3.2, depth: 2.6, height: 2.7 }, style: "minimal, matt white, wood worktop", appliances: "fridge, oven, dishwasher" }, source: "instagram" }, "won");
  lead({ segment: "b2b", name: "Karen Avetisyan", companyName: "KA Furniture", phone: "+374 55 555555", email: "karen@kafurniture.am", language: "hy", service: "cnc", message: "Հետաքրքիր է կտրման քարտեզի ավտոմատացումը։ 10–15 խոհանոց ամսական։", details: { companyType: "manufacturer", volume: "10–30" }, source: "website" });
  lead({ segment: "b2c", name: "Elena Sargsyan", phone: "+374 99 666666", language: "ru", service: "showroom", roomType: "wardrobe", message: "Гардеробная 2.4 м, раздвижные двери.", source: "facebook" }, "contacted");
  lead({ segment: "b2b", name: "Suren Hakobyan", companyName: "Domus Studio", email: "info@domus.am", language: "en", service: "showroom", message: "We would like a showroom screen configurator for our Yerevan store.", details: { companyType: "retailer", volume: "4–10" }, source: "linkedin" });

  // ---- tasks and a scheduled post ------------------------------------------------------------------
  console.log("Seeding tasks and a scheduled post…");
  const task = (values: Omit<typeof schema.tasks.$inferInsert, "id">) => {
    if (db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.title, values.title)).get()) return;
    db.insert(schema.tasks).values({ id: newId("task"), ...values }).run();
    added.push(`task ${values.title}`);
  };
  task({ title: "Call Ani about survey date", dueAt: new Date(Date.now() + 86400_000).toISOString(), priority: "high", entityType: "lead", entityId: leadAni });
  task({ title: "Send Amur Prof the CNC export sample", dueAt: new Date(Date.now() + 2 * 86400_000).toISOString(), entityType: "project", entityId: projectId("amur") });
  task({ title: "Renew live.architeksoft.com TLS certificate (expired 17 Jul 2026)", priority: "high" });

  const postTitle = "Aren TV wall — from sketch to 3D";
  if (!db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.title, postTitle)).get()) {
    const postId = newId("post");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    db.insert(schema.posts).values({ id: postId, projectId: projectId("aren"), title: postTitle, goal: "showcase", language: "hy", coreText: "Ձեռքի էսքիզից մինչև 3D և արտադրական ռասկրոյ։ Պատվիրատուն հաստատեց հեռախոսից։", status: "scheduled", scheduledAt: tomorrow.toISOString() }).run();
    const variants: [string, string, string[]][] = [
      ["facebook", "Այս TV գոտին պատվիրատուն տեսավ իր հեռախոսում՝ քայլեց սենյակում, բացեց դարակները և հաստատեց։\n\nՀաստատված մոդելից արտադրողը ստացավ կտրման քարտեզն ու ֆուրնիտուրայի ցանկը։\n\nՈւզո՞ւմ եք Ձեր կահույքը տեսնել նույն կերպ։ Ուղարկեք չափերը՝ architeksoft.com", ["#ArchiTekSoft", "#KitchenPro", "#Կահույք", "#3DՎիզուալիզացիա", "#Երևան"]],
      ["instagram", "Էսքիզից մինչև 3D՝ մինչև պատրաստելը։\n\nԻրական նյութեր, իրական չափեր, բացվող դարակներ։ Պատվիրատուն ընտրեց գույներն ինքը։\n\nՉափերն ուղարկեք՝ և 24–48 ժամում ստացեք Ձեր 3D հղումը։", ["#ArchiTekSoft", "#KitchenPro", "#Կահույք", "#Ինտերիեր", "#Երևան", "#InteriorDesign", "#3D"]],
      ["linkedin", "Հաստատումը՝ մինչև արտադրությունը\n\nԱյս նախագծի պատվիրատուն հաստատեց տարբերակը առաջին հանդիպմանը՝ ինտերակտիվ 3D հղումով։\n• Ֆասադներ և նյութեր՝ իրական արտադրողներից\n• Կտրման քարտեզ և ֆուրնիտուրայի ցանկ՝ նույն մոդելից\n• Զրո վերագծում\n\nԿահույք արտադրողների համար՝ փորձնական նախագիծ մեկ իրական պատվերով։", ["#KitchenPro", "#FurnitureManufacturing", "#ArchiTekSoft"]],
      ["telegram", "TV գոտի՝ էսքիզից մինչև 3D և կտրման քարտեզ։ Պատվիրատուն հաստատեց հեռախոսից։\n\nՁեր նախագիծը՝ architeksoft.com", []],
    ];
    for (const [platform, text, tags] of variants) db.insert(schema.postVariants).values({ id: newId("var"), postId, platform, enabled: true, text, hashtags: JSON.stringify(tags), format: "carousel" }).run();
    assetIds("aren", "WD1.jpg", "WD2.jpg", "WD3.jpg").forEach((id, i) => db.insert(schema.postAssets).values({ postId, assetId: id, role: "media", sortOrder: i }).run());
    added.push(`post ${postTitle}`);
  }

  // ---- some analytics history so charts are not empty (once) ----------------------------------------
  const seededEvents = db.select({ c: sql<number>`count(*)` }).from(schema.analyticsEvents).where(like(schema.analyticsEvents.visitorHash, "seed%")).get()?.c ?? 0;
  if (seededEvents === 0) {
    const paths = ["/", "/platform", "/for-business", "/for-home", "/portfolio", "/start", "/contact"];
    for (let d = 29; d >= 0; d--) {
      const day = new Date(Date.now() - d * 86400_000);
      const n = 8 + Math.floor(Math.random() * 20);
      for (let i = 0; i < n; i++) {
        const p = paths[Math.floor(Math.random() * paths.length)];
        db.insert(schema.analyticsEvents).values({ type: "page_view", path: p, locale: ["hy", "hy", "ru", "en"][Math.floor(Math.random() * 4)], referrer: ["", "", "instagram.com", "facebook.com", "linkedin.com", "google.com"][Math.floor(Math.random() * 6)], visitorHash: `seed${d}_${Math.floor(Math.random() * 12)}`, createdAt: new Date(day.getTime() + Math.random() * 86400_000).toISOString() }).run();
      }
      if (Math.random() < 0.35) db.insert(schema.analyticsEvents).values({ type: "form_submit", path: "/start", segment: Math.random() < 0.4 ? "b2b" : "b2c", visitorHash: `seed${d}_x`, createdAt: new Date(day.getTime() + 43200_000).toISOString() }).run();
    }
    added.push("30 days of sample analytics");
  }

  const head = added.length ? `\nDone. Added ${added.length} demo record(s).` : "\nDone. Every demo record already exists, nothing was added.";
  const pageUrl = `/p/${link.slug}?k=${link.token}`;
  return `${head}\nClient page: ${pageUrl}\nTo time this page with the performance probe set PERF_SHARE_URL=${pageUrl} before "npm run perf".`;
}

// Run only when started as a script (`tsx scripts/seed.ts [--force]`), not when imported.
// argv[1] is an OS path, so accept both separators — on Windows it arrives as ...\scripts\seed.ts.
if (/(^|[\\/])seed\.(ts|js|mjs|cjs)$/.test(process.argv[1] ?? "")) {
  seedDemo({ force: process.argv.includes("--force") }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
