# ArchiTek Soft — Web System (KitchenPro site, client pages, admin dashboard, SMM automation)

A single, self-contained system built for local testing first and production later:

| Part | URL (local) | What it is |
|---|---|---|
| Client website | http://localhost:3100 (hy), /ru, /en | KitchenPro-first marketing site with clear B2B / B2C journeys and a 5-minute order intake wizard |
| Client pages | http://localhost:3100/p/`slug`?k=`token` | The individual link a client receives: Web Viewer (`/v/slug`), renders, video, sketch→3D, PDF, AR, premium Live 3D, approve / request changes |
| Admin dashboard | http://localhost:3100/admin | Armenian by default (English switch). CRM (leads, individuals, companies), projects, media library, client pages, Live 3D links, SMM studio, analytics, settings |
| Worker | runs inside the app | Scheduler + Telegram bot: approval workflow, notifications, daily brief, publishing |

Default admin login: `admin@architeksoft.com` / `architek2026` (change in Settings → Security or in `.env`).

## Quick start (Windows)

Double-click **`start_local.bat`** — it installs dependencies, creates the database, seeds demo data (the Aren project with real renders), and opens the browser.

Manual:

```bash
cd claudearchitekweb
npm install
cp .env.example .env        # optional: add ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN …
npm run db:seed             # demo data (skips if the DB already has projects)
npm run dev                 # http://localhost:3100
```

Everything works without any API key: AI copy falls back to built-in trilingual templates, Telegram and social publishing run in **dry-run** mode and show exactly what they would do.

Light/dark mode: toggle in the site header and admin top bar (follows the system by default). Admin language: Armenian by default, English switch in the top bar.

## Documentation

Start with [`docs/00_EXECUTIVE_SUMMARY.md`](docs/00_EXECUTIVE_SUMMARY.md), then:

1. [`01_RESEARCH_FINDINGS.md`](docs/01_RESEARCH_FINDINGS.md) — study of the existing code, the live site, public presence, competitors
2. [`02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) — system design, data model, folder map
3. [`03_CLIENT_WEBSITE.md`](docs/03_CLIENT_WEBSITE.md) — information architecture, B2B/B2C journeys, copy principles
4. [`04_DASHBOARD_CRM.md`](docs/04_DASHBOARD_CRM.md) — admin, CRM, projects, media, client pages, Live 3D
5. [`05_SMM_AUTOMATION.md`](docs/05_SMM_AUTOMATION.md) — post generation, scheduling, Telegram approval, publishing adapters
6. [`06_SERVICES_APIS_PRICING.md`](docs/06_SERVICES_APIS_PRICING.md) — every external service, what it needs, what it costs
7. [`07_SECURITY_SCALABILITY.md`](docs/07_SECURITY_SCALABILITY.md)
8. [`08_DEPLOYMENT.md`](docs/08_DEPLOYMENT.md) — local → staging → production, without touching the current site until you decide
9. [`09_ROADMAP.md`](docs/09_ROADMAP.md) — what is done, what is next
10. [`10_TESTING_GUIDE.md`](docs/10_TESTING_GUIDE.md) — a 30-minute click-through of everything
11. [`11_INFRASTRUCTURE_PLAN.md`](docs/11_INFRASTRUCTURE_PLAN.md) — every service: what, why, now/later, cost, when to migrate
12. [`12_OFFERS_AND_POSITIONING.md`](docs/12_OFFERS_AND_POSITIONING.md) — corrected positioning, Web Viewer vs Live 3D, proposed B2B/B2C packages
13. [`13_PERFORMANCE.md`](docs/13_PERFORMANCE.md) — bottlenecks found, changes, before/after numbers
14. [`14_DESIGN_SYSTEM.md`](docs/14_DESIGN_SYSTEM.md) — design audit and the v3 "Atelier" system: tokens, type, signature elements, components, layout and motion rules

## Project layout

```
claudearchitekweb/
├── src/app/(site)/[locale]/   public website (hy default, /ru, /en)
├── src/app/p/[slug]/          client pages (individual links)
├── src/app/admin/             dashboard (login + (shell) pages)
├── src/app/api/               JSON/multipart APIs (leads, uploads, portal, track, admin)
├── src/app/media/[...path]/   serves uploaded files with Range support
├── src/components/            ui.tsx primitives, site/, portal/, admin/
├── src/lib/                   db (schema, migrations), auth, crm, media, smm, social, ai, telegram, live, analytics, i18n
├── src/worker/                scheduler + Telegram long polling (runs in-app or standalone)
├── scripts/                   seed / migrate / reset / worker
├── deploy/                    Dockerfile, docker-compose, Caddy, backup
├── docs/                      the documentation set
└── data/                      SQLite DB + uploads (git-ignored)
```

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server on :3100 (worker included) |
| `npm run build && npm start` | production build / start |
| `npm run worker` | run the worker separately (set `RUN_WORKER_IN_APP=false` in the web process) |
| `npm run db:seed` | demo data; `npm run db:seed -- --force` to add again |
| `npm run db:reset` | delete local DB + uploads |
| `npm run typecheck` | TypeScript check |
| `npm run perf` | server-timing probe of the main routes (`node scripts/perf.mjs [baseUrl] [runs]`) |
| `npm run dev:webpack` | dev server without Turbopack (fallback) |
