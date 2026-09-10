# Performance investigation and optimisation

Measured with `node scripts/perf.mjs` (server timings: cold = first request after start/compile, warm = median of 3–5) and the browser's Navigation/Resource Timing API on the same machine. All numbers are local (Windows 11, Node 22). `PERF_COOKIE="at_admin=<token>"` measures admin pages authenticated.

## 1. What was actually slow

| Symptom | Root cause | Evidence |
|---|---|---|
| "Hangs" for seconds when opening a page locally | **Dev mode compiles each route on first visit** (webpack). Home 5.3 s, `/admin/smm` 4.8 s, `/admin` 2.4 s, other routes 0.7–1.5 s; after that every request is ~100 ms. Every code change recompiles; four agents editing in parallel made it constant. | dev log `Compiled /[locale] in …`; perf table "cold_ms" |
| Same in production? | **No.** Production build: warm TTFB **7 ms**, cold 10–20 ms (first-ever request 3.7 s = server boot + JIT). | perf table PROD |
| Heavy first paint on the home page | 4 unoptimised JPEGs = **778 KB** (render-2.jpg 354 KB, sketch 147 KB, render-1 125 KB, kitchen 117 KB); HTML 144 KB raw because the **entire dictionary was serialised into client-component props** (header, footer contact, wizard) | resource timing top list; HTML byte count |
| Admin analytics page heavy | recharts in the initial bundle (230 KB first-load JS vs 106 KB elsewhere) | `next build` route table |
| Dev server slower with the DB inside the project | Watcher indexed `data/` (SQLite WAL, uploads, logs) | ignored via `watchOptions` now |
| Possible per-request work | None found: settings/portfolio/dashboard queries take < 5 ms; the worker ticks once a minute; Telegram polling sleeps when no token; no blocking I/O on the request path | timings of `/api/health` 2 ms warm |

## 2. Before (baseline, 10 Sept 2026)

Dev (webpack), first visit per route:

| Route | Cold | Warm TTFB | HTML |
|---|---|---|---|
| `/` | 5,288 ms | 120 ms | 263 KB |
| `/kitchenpro` | 1,467 ms | 107 ms | 188 KB |
| `/start` | 1,212 ms | 86 ms | 96 KB |
| `/p/<slug>` | 1,484 ms | 86 ms | 117 KB |
| `/admin` | 2,453 ms | 97 ms | 107 KB |
| `/admin/smm` | 4,843 ms | 98 ms | 95 KB |
| `/admin/analytics` | 1,009 ms | 157 ms | 217 KB |
| average | 821 ms | 60 ms | |

Production (`next build` + start), warm:

| Route | TTFB | HTML (raw / gzip) | Page weight | Load |
|---|---|---|---|---|
| `/` | 15 ms | 144 KB / 38 KB | ~1.0 MB (778 KB images, 106 KB JS, 65 KB CSS/fonts) | 421 ms |
| `/p/<slug>` | 6 ms | 23 KB | — | — |
| `/admin/login` | 14–20 ms | 5 KB | ~180 KB | 24–42 ms |
| average (17 routes) | 7 ms | | | |

Dev with Turbopack (same code): cold `/` 3,173 ms, `/admin/smm` 701 ms, `/admin` 906 ms; warm TTFB ≈ 150 ms.

## 3. Changes made

| Area | Change | Effect |
|---|---|---|
| Dev workflow | `npm run dev` now uses **Turbopack**; watcher ignores `data/`, `.next`, logs | cold compiles 2–7× faster (e.g. `/admin/smm` 4.8 s → 0.7 s); no recompiles from DB/upload writes |
| Production start | `output: "standalone"` only when `NEXT_STANDALONE=1` (Docker); `npm start` works locally | no warning/misconfig; `start_local.bat` unchanged |
| Images | `next/image` (AVIF/WebP, responsive `sizes`) for site images; `/media/...?w=` resize route with disk cache for uploads (`mediaUrl(rel, width)`, `mediaSrcSet`) | home images 778 KB → ~150–250 KB at 1280px, less on phones |
| Payload | client components receive only the strings they use (header nav, wizard, contact form) instead of the whole dictionary | HTML/RSC payload down ~60–70% on public pages |
| Charts | recharts loaded with `next/dynamic` (ssr:false) on analytics/overview | chart bundle off the critical path |
| Database | pragmas: `synchronous=NORMAL`, 32 MB cache, `temp_store=MEMORY`, 256 MB mmap | faster writes/reads under load; unchanged correctness with WAL |
| Caching | in-process TTL cache for settings (30 s) and portfolio (60 s), busted on write; static asset headers (`/brand`, `/demo`: 7 days) and immutable media | fewer DB hits per request; repeat visits free |
| Config | `optimizePackageImports` for lucide-react/recharts, `compress`, no `X-Powered-By` | smaller JS, gzip on |
| Health | `/api/health` for uptime checks | — |

## 4. After (10 Sept 2026, same machine, production build)

Server (`node scripts/perf.mjs`, 5 runs):

| Route | Warm TTFB | Cold | HTML raw |
|---|---|---|---|
| `/` | 16 ms | 127 ms | 161 KB (43 KB over the wire) |
| `/for-business` | 10 ms | 17 ms | 122 KB |
| `/p/<slug>` | 18 ms | 50 ms | 75 KB (was 117 KB) |
| `/admin` | 9 ms | 18 ms | 62 KB (was 107 KB) |
| `/admin/analytics` | 12 ms | 20 ms | 105 KB (was 217 KB) |
| average of 17 routes | **9 ms** | 23 ms | |

Browser (Navigation/Resource Timing):

| Page | Before | After |
|---|---|---|
| `/` on a phone (375px) | ~1.0 MB, load ~420 ms | **353 KB, load 136 ms** (WebP hero images 67 + 41 KB; the 3D demo is tap-to-load on phones) |
| `/` on desktop | ~1.0 MB, load ~420 ms | **352 KB, load 122 ms** before the 3D demo; the 2.4 MB demo model loads only when the section is near the viewport (desktop) or on tap (phones) |
| `/admin/analytics` | 230 KB first-load JS | **108 KB first-load JS**, 340 KB total, load 76 ms (charts load after the page) |
| First-load JS shared by all pages | 102 KB | 102 KB (unchanged, already lean) |

Dev (Turbopack) after: cold compile `/admin/smm` 0.75 s (was 4.8 s with webpack), `/admin` 0.8 s (was 2.4 s), `/` 3.3 s (was 5.3 s); warm requests 130–200 ms (dev overhead only; production is 9 ms).

Remaining large asset by design: the sample GLB (3.7 MB, 2.4 MB compressed) used by the Web Viewer demo. For production, export project models with Draco/meshopt compression (gltf-transform) and KTX2 textures to bring typical kitchens to 1–3 MB; the `/v/<slug>` viewer already lazy-loads and posters the model.

## 5. Interpretation and rules going forward

- **Local slowness was development mode, not the application.** Use `start_local.bat` (Turbopack) for editing; for a realistic feel run `npm run build && npm start`.
- Keep pages server-rendered and pass small props; keep uploads out of `public/`; always request images with a width (`?w=`) and `sizes`.
- Do not add third-party scripts on the public site (fonts are self-hosted by next/font; model-viewer is loaded lazily only when the demo section is near the viewport).
- On the VPS the numbers above translate to: TTFB < 50 ms in Armenia/EU with Cloudflare in front; home page ≈ 300 KB on a phone.
