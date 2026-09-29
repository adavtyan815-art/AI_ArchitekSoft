#!/usr/bin/env node
/**
 * Copies the Architeksoft WebViewer (the customer-facing 3D kitchen configurator) into
 * public/webviewer/, where Next.js serves it as plain static files at /webviewer/customer.html.
 *
 * Source: a checkout of github.com/adavtyan815-art/ClaudeKitchen, branch `dev`, folder WebViewer/
 * (commit 10b0ce2 or later). Point WEBVIEWER_SRC at that folder; the default is the owner's checkout.
 *
 *   npm run webviewer:sync
 *   WEBVIEWER_SRC="/path/to/ClaudeKitchen/WebViewer" npm run webviewer:sync
 *
 * Only what the integration guide lists is copied: customer.html, app/, vendor/three/, the shared
 * starter texture and the kitchens listed in webviewer.config.json. Never index.html (developer
 * viewer), README.md or the old test folders (bundle/, bundle2/, bundle3/, demo/, Example02/).
 *
 * Everything under public/ is downloadable by anyone, so the PUBLIC SHOWCASE is built to contain nothing
 * worth taking beyond what the demo shows:
 *  - a config entry with `decors` becomes a curated bundle: the source kitchen + ONLY the listed decors;
 *  - their records keep display fields only (no supplier lists, internal material paths, product specs);
 *  - their textures are re-encoded at ≤ 512 px (plenty on screen, not production files), thumbnails at 96 px;
 *  - `locked` previews are a name, a maker, a colour and a 96 px thumbnail — no texture, nothing to apply;
 *  - `popular` ("Frequently used", by kind): the listed demo decors apply, the others are locked previews as above;
 *  - `curatedOptions: false` drops the base kitchen's own generic swatches (only real decors are offered);
 *  - a bundle copied as-is (its whole catalog public) needs `"publishFullCatalog": true` — never by accident;
 *  - an audit runs last and fails the sync if anything else ended up in the folder.
 *
 * Also writes src/lib/webviewer-build.ts with the source commit, the published bundle ids and the CSP
 * hash of the page's one inline script (its importmap), so the site always matches the deployed files.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(process.env.WEBVIEWER_SRC || "D:/UE projects/Claude_kitchen/WebViewer");
const CONFIG = path.resolve(ROOT, process.env.WEBVIEWER_CONFIG || "webviewer.config.json");
const DEST = path.join(ROOT, "public", "webviewer");
const BUILD_TS = path.join(ROOT, "src", "lib", "webviewer-build.ts");
/** Server-only library for the site's library API (index + 96 px thumbnails): outside public/ and git-ignored. */
const PRIVATE = path.join(ROOT, "private", "webviewer");
let libraryIndexed = "";

const FILES = ["customer.html", "T_wood02_D.jpg", "T_wood02_D_thumb.jpg"];
const DIRS = ["app", "vendor/three"];
const ID = /^[A-Za-z0-9_-]+$/;
const KINDS = ["solid", "wood", "stone"];   // "Frequently used" kinds, as the viewer names them
const TEX_MAX = 512;       // px, public decor textures
const THUMB_MAX = 96;      // px, swatch thumbnails
/** The only fields of a decor record that reach the public showcase (what the viewer displays). */
const PUBLIC_FIELDS = ["id", "manufacturer", "collection", "decorCode", "textureCode", "textureName", "name", "label", "category", "family", "finish", "hex", "roughness", "tileWcm", "tileHcm", "type", "texture", "thumb", "tintHex", "manufacturerUrl", "armenian", "confidence", "colorRefs"];

function fail(msg) {
  console.error(`webviewer:sync — ${msg}`);
  process.exit(1);
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));
/** A path from a catalog must stay inside its bundle folder (no "../", no absolute paths). */
const inside = (rel) => typeof rel === "string" && rel && !rel.startsWith("/") && !rel.split(/[\\/]/).includes("..");
function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
/** Re-encode an image no larger than `max` px (also drops metadata). */
async function shrink(from, to, max, quality = 82) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  await sharp(from).resize(max, max, { fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toFile(to);
}
const pickFields = (p) => Object.fromEntries(PUBLIC_FIELDS.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]));
const thumbOf = (p, thumbs) => p.thumb ?? thumbs.replace(/\/?$/, "/") + p.texture.split("/").pop().replace(/\.[^.]+$/, ".jpg");
/** A decor's display name: its English name, or its codes when the name is only a code. */
const displayName = (p) => (/^[A-Z]{0,3}\d/.test(p.name?.en ?? "") ? `${p.textureCode ?? ""} ${p.decorCode ?? ""}`.trim() : p.name?.en ?? p.decorCode ?? p.id);
/** The library's opaque token for a decor (the same one the library API and its thumbnails use). */
const tokenOf = (id) => crypto.createHash("sha256").update(`kp-library:${id}`).digest("hex").slice(0, 12);

if (!fs.existsSync(path.join(SRC, "customer.html"))) fail(`no customer.html in ${SRC} (set WEBVIEWER_SRC to the WebViewer/ folder)`);
const config = readJson(CONFIG);
const entries = Array.isArray(config.bundles) ? config.bundles : [];
if (!entries.length) fail(`${path.basename(CONFIG)} lists no bundles`);
for (const e of entries) {
  if (!ID.test(e.id ?? "")) fail(`invalid bundle id "${e.id}"`);
  const from = e.from ?? e.id;
  if (!ID.test(from) || !fs.existsSync(path.join(SRC, from, "manifest.json"))) fail(`"${e.id}": source bundle "${from}" has no manifest.json in ${SRC}`);
  if (e.decors && (!ID.test(e.decors.from ?? "") || !Array.isArray(e.decors.ids))) fail(`"${e.id}": decors needs { from, ids[] }`);
  if (e.locked && (!ID.test(e.locked.from ?? "") || !Array.isArray(e.locked.ids) || e.locked.ids.length > 12)) fail(`"${e.id}": locked needs { from, ids[] } with at most 12 ids`);
  if (e.popular && (!e.decors || !ID.test(e.popular.from ?? "") || !KINDS.some((k) => Array.isArray(e.popular[k])) || KINDS.some((k) => (e.popular[k] ?? []).length > 40))) fail(`"${e.id}": popular needs a curated "decors" entry and { from, solid[], wood[], stone[] } with at most 40 ids each`);
  for (const k of ["libraryUrl", "logo"]) if (e[k] !== undefined && !/^\/(?!\/)[\w\-./]+$/.test(e[k])) fail(`"${e.id}": ${k} must be a same-site path like /api/... or /brand/...`);
  if (e.libraryUrl && !e.decors) fail(`"${e.id}": libraryUrl needs a curated "decors" entry (the library is built from its source)`);
  if (!e.decors && e.publishFullCatalog !== true) fail(`"${e.id}" has no "decors" list: that would publish its whole decor catalog. Curate it, or set "publishFullCatalog": true if that is really intended.`);
}
const BUNDLES = entries.map((e) => e.id);

let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", SRC, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", SRC, "status", "--porcelain", "--", "."], { encoding: "utf8" }).trim();
  if (dirty) commit += "-dirty";
} catch {
  /* not a git checkout: keep "unknown" */
}

/** Copies a bundle as-is (its whole decor catalog becomes public — only with publishFullCatalog). */
function publishFull(e) {
  const src = path.join(SRC, e.from ?? e.id);
  fs.cpSync(src, path.join(DEST, e.id), { recursive: true });
  const ext = readJson(path.join(src, "manifest.json")).catalog_products_path;
  if (ext && !inside(ext)) console.warn(`webviewer:sync — "${e.id}" reads its decors from ${ext} (outside the bundle); they load only if that bundle is published too`);
  return "FULL catalog";
}

/**
 * Demo bundle: the kitchen of `from` + only the decors in `decors.ids` (display fields, ≤ 512 px textures), the
 * locked previews and the demo card data. The base bundle's own decor catalog and texture folder are never copied.
 */
async function publishCurated(e) {
  const src = path.join(SRC, e.from ?? e.id);
  const out = path.join(DEST, e.id);
  fs.mkdirSync(out, { recursive: true });
  for (const name of ["manifest.json", "set.glb", "set_ar.glb", "catalog.json"]) {
    if (fs.existsSync(path.join(src, name))) copyFile(path.join(src, name), path.join(out, name));
  }
  const cat = fs.existsSync(path.join(out, "catalog.json")) ? readJson(path.join(out, "catalog.json")) : {};
  if (e.curatedOptions === false) for (const g of Object.values(cat.groups ?? {})) g.options = [];
  // textures of the curated swatches (catalog.json), when they live inside the bundle
  for (const g of Object.values(cat.groups ?? {})) {
    for (const o of g.options ?? []) {
      for (const rel of [o.texture, o.thumb]) if (inside(rel) && fs.existsSync(path.join(src, rel))) await shrink(path.join(src, rel), path.join(out, rel), rel === o.thumb ? THUMB_MAX : TEX_MAX);
    }
  }

  const decorDir = path.join(SRC, e.decors.from);
  const doc = readJson(path.join(decorDir, "catalog_products.json"));
  const byId = new Map((doc.products ?? []).map((p) => [p.id, p]));
  const missing = e.decors.ids.filter((id) => !byId.has(id));
  if (missing.length) fail(`"${e.id}": not in ${e.decors.from}/catalog_products.json: ${missing.join(", ")}`);
  const thumbs = doc.thumbs ?? "textures/thumbs/";
  const products = [];
  for (const id of e.decors.ids) {
    const p = pickFields(byId.get(id));
    if (p.type === "texture" && p.texture) {
      if (!inside(p.texture)) fail(`"${e.id}": ${p.id} texture path leaves the bundle: ${p.texture}`);
      const thumb = thumbOf(p, thumbs);
      for (const [rel, max] of [[p.texture, TEX_MAX], [thumb, THUMB_MAX]]) {
        if (!inside(rel)) continue;
        if (!fs.existsSync(path.join(decorDir, rel))) fail(`"${e.id}": ${p.id} is missing ${e.decors.from}/${rel}`);
        await shrink(path.join(decorDir, rel), path.join(out, rel), max);
      }
    }
    products.push(p);
  }
  writeJson(path.join(out, "catalog_products.json"), { format: doc.format, generated: doc.generated, thumbs, curated: true, products });

  // Locked previews: name, maker, colour, a 96 px thumbnail under an opaque file name — never the decor's id or texture.
  const locked = [];
  if (e.locked) {
    const lockDir = path.join(SRC, e.locked.from);
    const lockDoc = e.locked.from === e.decors.from ? doc : readJson(path.join(lockDir, "catalog_products.json"));
    const lockById = new Map((lockDoc.products ?? []).map((p) => [p.id, p]));
    const lockThumbs = lockDoc.thumbs ?? "textures/thumbs/";
    for (const [n, id] of e.locked.ids.entries()) {
      const p = lockById.get(id);
      if (!p) fail(`"${e.id}": locked id ${id} is not in ${e.locked.from}/catalog_products.json`);
      if (e.decors.ids.includes(id)) fail(`"${e.id}": ${id} is both a demo decor and a locked preview`);
      const codeLike = /^[A-Z]{0,3}\d/.test(p.name?.en ?? "");
      const name = codeLike ? `${p.textureCode ?? ""} ${p.decorCode ?? ""}`.trim() : p.name?.en ?? p.decorCode ?? "";
      const item = { name, maker: p.manufacturer ?? "", hex: p.hex, category: p.category ?? "" };
      if (p.type === "texture" && p.texture) {
        const rel = thumbOf(p, lockThumbs);
        if (!inside(rel) || !fs.existsSync(path.join(lockDir, rel))) fail(`"${e.id}": locked ${id} has no thumbnail`);
        item.thumb = `textures/locked/l${n + 1}.jpg`;
        await shrink(path.join(lockDir, rel), path.join(out, item.thumb), THUMB_MAX, 78);
      }
      locked.push(item);
    }
  }

  // "Frequently used" (catalog.json `popular`, in kind order): a demo decor by id — it applies; any other decor as a
  // locked preview — name, maker, codes, colour, category, its library token and a 96 px thumbnail, never an id or texture.
  if (e.popular) {
    const popDir = path.join(SRC, e.popular.from);
    const popDoc = e.popular.from === e.decors.from ? doc : readJson(path.join(popDir, "catalog_products.json"));
    const popById = new Map((popDoc.products ?? []).map((p) => [p.id, p]));
    const popThumbs = popDoc.thumbs ?? "textures/thumbs/";
    const popular = [];
    let n = 0;
    for (const kind of KINDS) {
      for (const id of e.popular[kind] ?? []) {
        const p = popById.get(id);
        if (!p) fail(`"${e.id}": popular id ${id} is not in ${e.popular.from}/catalog_products.json`);
        if (e.decors.ids.includes(id)) { popular.push({ kind, id }); continue; }
        const item = { kind, name: displayName(p), maker: p.manufacturer ?? "", code: [p.decorCode, p.textureCode].filter(Boolean).join(" "), hex: p.hex, category: p.category ?? "", t: tokenOf(p.id) };
        if (p.type === "texture" && p.texture) {
          const rel = thumbOf(p, popThumbs);
          if (inside(rel) && fs.existsSync(path.join(popDir, rel))) {
            item.thumb = `textures/popular/p${++n}.jpg`;
            await shrink(path.join(popDir, rel), path.join(out, item.thumb), THUMB_MAX, 78);
          }
        }
        popular.push(item);
      }
    }
    cat.popular = popular;
  }

  // What the viewer's demo mode (?mode=demo) shows: the size of the full library the selection came from (decors the
  // viewer would list: confidence not "Low"), the locked previews and where "Start your project" leads.
  const library = (doc.products ?? []).filter((p) => p && (p.confidence || "Approximate") !== "Low");
  const libraryCount = library.length;
  cat.demo = { libraryCount, ...(e.cta ? { ctaUrl: e.cta } : {}), ...(locked.length ? { locked } : {}), ...(e.libraryUrl ? { libraryUrl: e.libraryUrl } : {}) };
  if (e.home || e.logo) cat.site = { ...(cat.site ?? {}), ...(e.home ? { home: e.home } : {}), ...(e.logo ? { logo: e.logo } : {}) };
  // the full library, for both modes: demo browses it locked, the client product applies what its bundle carries
  if (e.libraryUrl) cat.library = { url: e.libraryUrl, count: libraryCount };
  // The full library for the site's library API (src/app/api/webviewer/library): written to private/ — never under
  // public/, never in git. Display fields + a 96 px thumbnail under an opaque token; no textures, material data,
  // supplier data or internal paths. The demo's own decors are left out (they are already interactive in the viewer).
  if (e.libraryUrl) {
    fs.rmSync(PRIVATE, { recursive: true, force: true });
    fs.mkdirSync(path.join(PRIVATE, "thumbs"), { recursive: true });
    const demoIds = new Set(e.decors.ids);
    const jobs = [];
    const idx = library.filter((p) => !demoIds.has(p.id)).map((p) => {
      const name = displayName(p);
      const refs = (Array.isArray(p.colorRefs) ? p.colorRefs : []).map((r) => `${r.system} ${r.code}`).join(" ");
      const s = [p.label, p.decorCode, p.textureCode, p.name?.en, p.name?.ru, p.name?.hy, p.collection, p.family, p.manufacturer, p.finish, refs].filter(Boolean).join(" ").toLowerCase();
      const token = tokenOf(p.id);
      let th = false;
      if (p.type === "texture" && p.texture) {
        const rel = thumbOf(p, thumbs);
        if (inside(rel) && fs.existsSync(path.join(decorDir, rel))) { th = true; jobs.push([path.join(decorDir, rel), path.join(PRIVATE, "thumbs", `${token}.jpg`)]); }
      }
      return { t: token, n: name, m: p.manufacturer ?? "", c: [p.decorCode, p.textureCode].filter(Boolean).join(" "), h: /^#[0-9a-f]{6}$/i.test(p.hex ?? "") ? p.hex : null, k: p.category ?? "", a: !!p.armenian, th, s };
    });
    for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map(([from, to]) => shrink(from, to, THUMB_MAX, 76)));
    fs.writeFileSync(path.join(PRIVATE, "library.json"), JSON.stringify(idx));
    libraryIndexed = `${idx.length} library decors (${jobs.length} thumbnails) in private/`;
  }
  writeJson(path.join(out, "catalog.json"), cat);

  // point the manifest at the curated list inside this bundle
  const manifest = readJson(path.join(out, "manifest.json"));
  manifest.catalog_products_path = "catalog_products.json";
  manifest.catalog_products_thumbs = thumbs;
  writeJson(path.join(out, "manifest.json"), manifest);
  return `${products.length} decors, ${locked.length} locked previews${libraryIndexed ? `, ${libraryIndexed}` : ""}`;
}

/** Fails the sync if the public folder holds anything a curated showcase should not. */
async function audit() {
  const problems = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const top = new Set(fs.readdirSync(DEST));
  for (const name of top) if (![...FILES, "app", "vendor", ...BUNDLES].includes(name)) problems.push(`unexpected entry /webviewer/${name}`);
  let bytes = 0, files = 0;
  for (const f of walk(DEST)) { bytes += fs.statSync(f).size; files++; }
  for (const e of entries.filter((x) => x.decors)) {
    const dir = path.join(DEST, e.id);
    for (const f of walk(dir)) {
      const rel = path.relative(dir, f).replace(/\\/g, "/");
      if (!/^(manifest\.json|set\.glb|set_ar\.glb|catalog\.json|catalog_products\.json|textures\/.+\.jpg)$/.test(rel)) problems.push(`${e.id}: unexpected file ${rel}`);
      if (rel.startsWith("textures/")) {
        const { width = 0, height = 0 } = await sharp(f).metadata();
        const max = /^textures\/(thumbs|locked|popular)\//.test(rel) ? THUMB_MAX : TEX_MAX;
        if (Math.max(width, height) > max) problems.push(`${e.id}: ${rel} is ${width}×${height} (max ${max})`);
      }
    }
    const prods = readJson(path.join(dir, "catalog_products.json")).products ?? [];
    if (prods.length !== e.decors.ids.length) problems.push(`${e.id}: ${prods.length} decor records, expected ${e.decors.ids.length}`);
    for (const p of prods) for (const k of Object.keys(p)) if (!PUBLIC_FIELDS.includes(k)) problems.push(`${e.id}: ${p.id} carries "${k}"`);
    const tex = walk(path.join(dir, "textures")).filter((f) => !/[\\/](thumbs|locked|popular)[\\/]/.test(f)).length;
    if (tex > e.decors.ids.length + 4) problems.push(`${e.id}: ${tex} textures for ${e.decors.ids.length} decors`);
  }
  // the private library: thumbnails only, never above 96 px; and nothing of it under public/
  const privThumbs = path.join(PRIVATE, "thumbs");
  if (fs.existsSync(privThumbs)) {
    for (const name of fs.readdirSync(privThumbs)) {
      if (!/^[a-f0-9]{12}\.jpg$/.test(name)) { problems.push(`private: unexpected file thumbs/${name}`); continue; }
      const { width = 0, height = 0 } = await sharp(path.join(privThumbs, name)).metadata();
      if (Math.max(width, height) > THUMB_MAX) problems.push(`private: thumbs/${name} is ${width}×${height}`);
    }
  }
  if (walk(DEST).some((f) => /library\.json$/.test(f))) problems.push("a library index is under public/");
  if (problems.length) fail(`audit failed:\n  ${problems.join("\n  ")}`);
  return `${files} files, ${(bytes / 1048576).toFixed(1)} MB`;
}

// A clean copy: files removed upstream (or from the config) must not linger here.
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
for (const d of DIRS) fs.cpSync(path.join(SRC, d), path.join(DEST, d), { recursive: true });
const report = [];
if (entries.filter((e) => e.libraryUrl).length > 1) fail("only one bundle can drive the library API (libraryUrl)");
if (!entries.some((e) => e.libraryUrl)) fs.rmSync(PRIVATE, { recursive: true, force: true });   // the API then answers empty
for (const e of entries) report.push(`${e.id} (${e.decors ? await publishCurated(e) : publishFull(e)})`);
const summary = await audit();

const html = fs.readFileSync(path.join(DEST, "customer.html"), "utf8");
const m = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html);
if (!m) fail("customer.html has no importmap — the CSP in src/middleware.ts needs a new rule");
const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
if (inline.length !== 1) fail(`customer.html has ${inline.length} inline scripts, expected exactly the importmap`);
// The HTML parser turns CRLF / CR into LF before the browser hashes a script, so hash it that way too
// (a Windows checkout has CRLF on disk).
const lf = m[1].replace(/\r\n?/g, "\n");
const hash = `sha256-${crypto.createHash("sha256").update(lf, "utf8").digest("base64")}`;

fs.writeFileSync(
  BUILD_TS,
  `// Generated by scripts/sync-webviewer.mjs from webviewer.config.json — do not edit by hand.
/** ClaudeKitchen commit the files in public/webviewer/ were copied from. */
export const WEBVIEWER_COMMIT = ${JSON.stringify(commit)};
/** CSP source for the one inline script of customer.html (its importmap). */
export const WEBVIEWER_IMPORTMAP_HASH = ${JSON.stringify(`'${hash}'`)};
/** Bundles published in public/webviewer/; the first one is the site's default kitchen. */
export const WEBVIEWER_SYNCED_BUNDLES = ${JSON.stringify(BUNDLES)} as const;
`,
);

console.log(`webviewer:sync — ${SRC} @ ${commit} → public/webviewer/: ${report.join(", ")}; audit OK (${summary}); importmap ${hash}`);
