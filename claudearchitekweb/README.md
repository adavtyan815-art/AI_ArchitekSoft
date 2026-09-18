# ArchiTek Soft — Web System (marketing site, client pages, admin dashboard, SMM automation)

A single, self-contained system built for local testing first and production later:

| Part | URL (local) | What it is |
|---|---|---|
| Client website | http://localhost:3100 (hy), /ru, /en | Platform-first marketing site (interactive 3D for furniture) with clear B2B / B2C journeys and a 5-minute order intake wizard |
| Client pages | http://localhost:3100/p/`slug`?k=`token` | The individual link a client receives: Web Viewer (`/v/slug`), renders, video, sketch→3D, PDF, AR, premium Live 3D, approve / request changes |
| Admin dashboard | http://localhost:3100/admin | Armenian by default (English switch). CRM (leads, individuals, companies), projects, media library, client pages, Live 3D links, SMM studio, analytics, settings |
| Worker | runs inside the app | Scheduler + Telegram bot: approval workflow, notifications, daily brief, publishing, inbox scan |

First admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` create the owner account **once**, on a database that has no users yet (locally that is `admin@architeksoft.com` / `architek2026` from `.env.example`). Changing those values later has no effect — the password is changed in **Settings → Security**. On a server (`NODE_ENV=production`) the app refuses to create the account while `ADMIN_PASSWORD` is missing, is the testing default, is a placeholder, or is under 12 characters.

## Quick start (Windows)

Double-click **`start_local.bat`** — it checks that Node.js is installed, creates `.env` from `.env.example` if it is missing, installs dependencies (again after a `git pull` that changed `package-lock.json`), creates and seeds the database when `data/architeksoft.db` does not exist yet, and opens the browser once the server actually answers on `/api/health`.

Manual:

```bash
cd claudearchitekweb
npm install
cp .env.example .env        # optional: add ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN …
npm run db:seed             # demo data (skips as soon as any project exists)
npm run dev                 # http://localhost:3100
```

The database schema is applied automatically the first time the app opens the file, so there is no separate migration step for a fresh checkout.

Everything works without any API key: AI copy falls back to built-in trilingual templates, Telegram and social publishing run in **dry-run** mode and show exactly what they would do. What each platform needs to move from dry run to real publishing is listed in [`docs/16_FIRST_TEST_POST.md`](docs/16_FIRST_TEST_POST.md).

Light/dark mode: toggle in the site header and admin top bar (follows the system by default). Admin language: Armenian by default, English switch in the top bar.

## Documentation

Start with [`docs/00_EXECUTIVE_SUMMARY.md`](docs/00_EXECUTIVE_SUMMARY.md), then:

1. [`01_RESEARCH_FINDINGS.md`](docs/01_RESEARCH_FINDINGS.md) — study of the existing code, the live site, public presence, competitors
2. [`02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) — system design, request pipeline, data model, folder map
3. [`03_CLIENT_WEBSITE.md`](docs/03_CLIENT_WEBSITE.md) — information architecture, B2B/B2C journeys, copy principles
4. [`04_DASHBOARD_CRM.md`](docs/04_DASHBOARD_CRM.md) — admin, CRM, projects, media, client pages, Live 3D
5. [`05_SMM_AUTOMATION.md`](docs/05_SMM_AUTOMATION.md) — post generation, scheduling, Telegram approval, publishing adapters
6. [`06_SERVICES_APIS_PRICING.md`](docs/06_SERVICES_APIS_PRICING.md) — every external service, what it needs, what it costs
7. [`07_SECURITY_SCALABILITY.md`](docs/07_SECURITY_SCALABILITY.md) — sessions, rate limits, upload validation, headers
8. [`08_DEPLOYMENT.md`](docs/08_DEPLOYMENT.md) — local → staging → production, without touching the current site until you decide
9. [`09_ROADMAP.md`](docs/09_ROADMAP.md) — what is done, what is next
10. [`10_TESTING_GUIDE.md`](docs/10_TESTING_GUIDE.md) — a 30-minute click-through of everything, and how to re-test it
11. [`11_INFRASTRUCTURE_PLAN.md`](docs/11_INFRASTRUCTURE_PLAN.md) — every service: what, why, now/later, cost, when to migrate
12. [`12_OFFERS_AND_POSITIONING.md`](docs/12_OFFERS_AND_POSITIONING.md) — corrected positioning, Web Viewer vs Live 3D, proposed B2B/B2C packages
13. [`13_PERFORMANCE.md`](docs/13_PERFORMANCE.md) — bottlenecks found, changes, before/after numbers
14. [`14_DESIGN_SYSTEM.md`](docs/14_DESIGN_SYSTEM.md) — design audit and the v3 "Atelier" system: tokens, type, signature elements, components, layout and motion rules
15. [`15_INBOX_WORKFLOW.md`](docs/15_INBOX_WORKFLOW.md) — the local file inbox: drop renders in a folder, get a suggested post
16. [`16_FIRST_TEST_POST.md`](docs/16_FIRST_TEST_POST.md) — the owner's walk-through for the first test post: dry run today, then the credentials each platform needs
17. [`17_QA_AUDIT_2026-09.md`](docs/17_QA_AUDIT_2026-09.md) — the September 2026 quality audit: what was checked, what was fixed, what is left
18. [`18_OWNER_TEST_CHECKLIST.md`](docs/18_OWNER_TEST_CHECKLIST.md) — tick-box acceptance test of everything delivered, with a findings and sign-off sheet

## Local file inbox → suggested post

Copy renders into a folder on the PC and the system prepares a post draft by itself — one text per
platform, media attached, a publishing slot proposed — and suggests it in Telegram and in the admin.
Nothing is published without approval.

```
data/inbox/
  2026-09-17 walnut kitchen/     ← one sub-folder per post (any language in the name)
    01-render.jpg
    02-render.jpg
    clip.mp4
    post.txt                     ← optional brief; every key is optional
```

```
language: hy
goal: showcase
platforms: facebook, instagram, telegram
project: AT-2026-0003
schedule: auto
---
Walnut kitchen for a family in Yerevan; emphasise the island.
```

The folder is created with a `README.txt` on the first boot (`INBOX_DIR` moves it) and is imported
only once nothing in it has changed for 30 seconds, so copying a large video in is safe. It is picked
up by the worker every 60 seconds, by **Import now** on the Inbox panel of Admin → Social media, or
by `npm run inbox`. Your files are never deleted — the folder is moved to `data/inbox/_imported/`, or
to `_failed/` with an `error.txt` next to it.

Try it in one step: `npm run inbox -- --example`. Full guide: [`docs/15_INBOX_WORKFLOW.md`](docs/15_INBOX_WORKFLOW.md).

## Project layout

```
claudearchitekweb/
├── src/middleware.ts           locale rewrite, request headers, CSP nonce, client-page key cookie, 410 for dead links
├── src/app/(site)/[locale]/    public website (hy default, /ru, /en)
├── src/app/p/[slug]/           client pages (individual links)
├── src/app/v/[slug]/           Web Viewer for one project
├── src/app/demo/ar/            public AR demo (all three languages on one page)
├── src/app/admin/              dashboard (login + (shell) pages)
├── src/app/api/                JSON/multipart APIs (health, leads, track, uploads, portal, admin)
├── src/app/media/[...path]/    serves uploaded files with Range support, resized variants and per-link access checks
├── src/app/not-found.tsx       branded, translated 404 (plus one inside the site layout and one in the admin shell)
├── src/components/             ui.tsx primitives, site/, portal/, admin/
├── src/lib/                    db (schema, migrations), auth, crm, media, smm, social, ai, telegram, live, portal, inbox, analytics, csp, i18n
├── src/worker/                 scheduler + Telegram long polling (runs in-app or standalone)
├── scripts/                    seed / migrate / reset / worker / inbox / perf probe
├── deploy/                     Dockerfile, docker-compose, Caddy, Litestream, backup
├── docs/                       the documentation set
├── public/                     brand assets and demo media (images, video, GLB)
└── data/                       SQLite DB + uploads + inbox drop folder (git-ignored)
```

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server on :3100 with Turbopack (worker included) |
| `npm run build` | production build |
| `npm start` | start the production build on :3100 |
| `npm run worker` | run the worker separately (set `RUN_WORKER_IN_APP=false` in the web process) |
| `npm run inbox` | import whatever has finished copying into `data/inbox/`; `-- --dry-run` only lists it, `-- --example` creates a test folder |
| `npm run lint` | ESLint (flat config in `eslint.config.mjs`) |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run perf` | server-timing probe of the main routes (`node scripts/perf.mjs [baseUrl] [runs]`); set `PERF_SHARE_URL` to include a client page and `PERF_COOKIE` to include the admin |
| `npm run db:seed` | demo data; `npm run db:seed -- --force` adds only what is still missing |
| `npm run db:migrate` | apply any pending migration and list what has been applied (the app also does this on first access) |
| `npm run db:reset` | delete the local DB + uploads (local testing only) |
| `npm run db:generate` | drizzle-kit: generate SQL from `src/lib/db/schema.ts` when you change the schema |
| `npm run build:worker` | bundle `scripts/worker.ts` into `worker.js` (used by the Docker image's split-worker service) |
| `npm run build:standalone` | `next build` with `NEXT_STANDALONE=1`, for building the Docker image outside Docker |
| `npm run dev:webpack` | dev server without Turbopack (fallback) |

Media limits: 100 MB per file in the admin media library (`MAX_UPLOAD_BYTES` in `src/lib/media.ts`; the proxy in front of the site rejects larger request bodies — see `docs/08_DEPLOYMENT.md`, "Upload size"), 50 MB per file on the public intake form.
