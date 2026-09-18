/**
 * Simple performance probe: hits a list of URLs, reports TTFB / total / bytes (median of N runs).
 *
 * Usage:  node scripts/perf.mjs [baseUrl] [runs]      (default http://localhost:3100, 5 runs)
 *
 * Environment:
 *   PERF_SHARE_URL  a client page to time, e.g. "/p/aren-living?k=…" (`npm run db:seed` prints one).
 *                   When it is unset the probe looks for an active client page in the local database;
 *                   when there is none it skips that row instead of timing an error page.
 *   PERF_COOKIE     an admin session cookie so the /admin rows measure real pages instead of the
 *                   redirect to the login form.
 *   DATABASE_PATH   only read to find a client page (falls back to .env, then ./data/architeksoft.db).
 *
 * A row that did not measure what it was meant to measure — a redirect, any non-200 answer, or a
 * client page that came back too small to be the real page — is marked in the table and left out of
 * the averages, so the numbers in docs/13_PERFORMANCE.md stay comparable between machines.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const runs = Math.max(1, Number(process.argv[3] || 5));
const cookie = process.env.PERF_COOKIE || "";

/** The real client page is a full document; an error page is a short one. */
const MIN_PORTAL_BYTES = 8 * 1024;

/** This script runs on plain node (no dotenv), so read the one value we need out of .env ourselves. */
function fromEnvFile(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = fs
      .readFileSync(path.join(projectRoot, ".env"), "utf8")
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith(`${name}=`));
    return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

/** Newest client page that is still open, straight from the local database. */
async function portalPathFromDb() {
  const dbPath = path.resolve(projectRoot, fromEnvFile("DATABASE_PATH") || "./data/architeksoft.db");
  if (!fs.existsSync(dbPath)) return null;
  try {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const row = db
      .prepare("SELECT slug, token FROM share_links WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT 1")
      .get(new Date().toISOString());
    db.close();
    return row ? `/p/${row.slug}?k=${row.token}` : null;
  } catch (e) {
    console.warn(`  (could not read ${path.relative(projectRoot, dbPath)}: ${e.message})`);
    return null;
  }
}

/** PERF_SHARE_URL wins; it may be a full URL or just the path the seed script prints. */
async function portalPath() {
  const given = (process.env.PERF_SHARE_URL || "").trim();
  if (given) {
    if (/^https?:\/\//i.test(given)) {
      const u = new URL(given);
      return u.pathname + u.search;
    }
    return given.startsWith("/") ? given : `/${given}`;
  }
  return portalPathFromDb();
}

const portal = await portalPath();
if (!portal) {
  console.warn("No client page to time: set PERF_SHARE_URL=/p/<slug>?k=<token> (npm run db:seed prints one) or seed the local database.");
  console.warn("The /p/ row is skipped; every other row is measured as usual.\n");
}

const urls = [
  "/", "/en", "/platform", "/for-business", "/for-home", "/portfolio", "/start", "/contact",
  ...(portal ? [portal] : []),
  "/admin", "/admin/leads", "/admin/projects", "/admin/media", "/admin/smm", "/admin/analytics",
  "/api/health", "/api/admin/search?q=aren",
];

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

async function probe(url) {
  const t0 = performance.now();
  try {
    const res = await fetch(base + url, { headers: cookie ? { cookie } : {}, redirect: "manual" });
    const ttfb = performance.now() - t0;
    const buf = await res.arrayBuffer();
    return { status: res.status, ttfb, total: performance.now() - t0, bytes: buf.byteLength };
  } catch (e) {
    // A server that is not running must not end the run half-way through the table.
    return { status: 0, error: e.message, ttfb: performance.now() - t0, total: performance.now() - t0, bytes: 0 };
  }
}

/** Why a row cannot be compared with the others — empty string means the measurement is good. */
function problemWith(url, { status, bytes, error }) {
  if (status === 0) return `no answer (${error})`;
  if (status >= 300 && status < 400) return url.startsWith("/admin") && !cookie ? "redirect (set PERF_COOKIE)" : "redirect";
  if (status !== 200) return `HTTP ${status}`;
  if (url === portal && bytes < MIN_PORTAL_BYTES) return "not the real page — stale link?";
  return "";
}

/** Never print a client-page token into a report. */
const label = (url) => (url === portal ? `${url.split("?")[0]}?k=…` : url);

const rows = [];
for (const u of urls) {
  const cold = await probe(u);
  const warm = [];
  for (let i = 0; i < runs; i++) warm.push(await probe(u));
  rows.push({
    url: label(u),
    status: cold.status,
    cold_ms: Math.round(cold.total),
    warm_ttfb_ms: Math.round(median(warm.map((w) => w.ttfb))),
    warm_total_ms: Math.round(median(warm.map((w) => w.total))),
    kb: Math.round(cold.bytes / 1024),
    note: problemWith(u, cold),
  });
}
console.table(rows);

const measured = rows.filter((r) => !r.note);
const skipped = rows.filter((r) => r.note);
if (measured.length === 0) {
  console.log("No comparable rows: nothing was measured successfully.");
} else {
  const avg = (k) => Math.round(measured.reduce((s, r) => s + r[k], 0) / measured.length);
  console.log(`avg over ${measured.length} page(s): cold ${avg("cold_ms")} ms | warm TTFB ${avg("warm_ttfb_ms")} ms | warm total ${avg("warm_total_ms")} ms`);
}
if (skipped.length) console.log(`left out of the averages: ${skipped.map((r) => `${r.url} (${r.note})`).join(", ")}`);
