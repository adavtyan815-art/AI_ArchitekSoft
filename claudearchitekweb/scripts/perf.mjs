/**
 * Simple performance probe: hits a list of URLs, reports TTFB / total / bytes (median of N).
 * Usage: node scripts/perf.mjs [baseUrl] [runs]      (default http://localhost:3100, 5 runs)
 */
const base = process.argv[2] || "http://localhost:3100";
const runs = Number(process.argv[3] || 5);
const cookie = process.env.PERF_COOKIE || "";
const urls = [
  "/", "/en", "/kitchenpro", "/for-business", "/for-home", "/portfolio", "/start", "/contact",
  "/p/aren-living?k=p7_iF-nUOAoPqfpe",
  "/admin", "/admin/leads", "/admin/projects", "/admin/media", "/admin/smm", "/admin/analytics",
  "/api/health", "/api/admin/search?q=aren",
];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
async function probe(url) {
  const t0 = performance.now();
  const res = await fetch(base + url, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const ttfb = performance.now() - t0;
  const buf = await res.arrayBuffer();
  return { status: res.status, ttfb, total: performance.now() - t0, bytes: buf.byteLength };
}
const rows = [];
for (const u of urls) {
  const cold = await probe(u);
  const warm = [];
  for (let i = 0; i < runs; i++) warm.push(await probe(u));
  rows.push({ url: u, status: cold.status, cold_ms: Math.round(cold.total), warm_ttfb_ms: Math.round(median(warm.map((w) => w.ttfb))), warm_total_ms: Math.round(median(warm.map((w) => w.total))), kb: Math.round(cold.bytes / 1024) });
}
console.table(rows);
const avg = (k) => Math.round(rows.reduce((s, r) => s + r[k], 0) / rows.length);
console.log(`avg cold ${avg("cold_ms")} ms | avg warm TTFB ${avg("warm_ttfb_ms")} ms | avg warm total ${avg("warm_total_ms")} ms`);
