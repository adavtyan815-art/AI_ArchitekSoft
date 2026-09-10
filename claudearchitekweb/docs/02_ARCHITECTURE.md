# Architecture

## Principles

1. **One folder, one process, one file to back up.** Next.js app + SQLite + uploads on disk. Enough for one admin and hundreds of clients; a Postgres/S3 switch is a configuration change later, not a rewrite.
2. **Everything degrades gracefully.** No API key → AI uses templates, Telegram and social adapters run in dry-run and explain what they would do. You can test the whole workflow on day one.
3. **Boring, readable code.** Plain SQL migrations, typed schema, small server actions, no hidden magic.
4. **Security by default.** Hashed passwords, opaque hashed sessions, unguessable client links with expiry/passcode, no secrets in the repo, security headers.

## System map

```
                    ┌──────────────────────────────── Next.js app (port 3100) ────────────────────────────────┐
  Visitors ───────▶ │ (site)/[locale]  public website (hy default, /ru, /en)                                   │
  Clients ────────▶ │ p/[slug]         client pages (token, expiry, passcode) → feedback → CRM + Telegram       │
  You ────────────▶ │ admin/*          dashboard (session cookie) → server actions → lib/*                      │
                    │ api/*            leads, uploads, portal events, track, admin search                       │
                    │ media/*          uploaded files with HTTP Range                                           │
                    │ worker/          scheduler (60 s) + Telegram long polling  (in-app or separate process)   │
                    └───────┬──────────────────────────────┬──────────────────────────────┬────────────────────┘
                            │                              │                              │
                     data/architeksoft.db            data/uploads/                external services
                     (SQLite, WAL)                   YYYY/MM/<id>.<ext> + thumbs   Anthropic/Gemini · Telegram Bot API
                                                                                    Meta Graph · LinkedIn · YouTube
                                                                                    live.architeksoft.com admin API
```

## Data model (SQLite via Drizzle, `src/lib/db/schema.ts`)

| Domain | Tables | Notes |
|---|---|---|
| Auth & settings | `users`, `sessions`, `settings`, `audit_log` | Sessions store `sha256(token)`. `settings` = JSON per key (brand, smm, telegram, live). |
| CRM | `companies`, `clients` (kind individual/contact), `leads`, `activities`, `tasks` | Leads carry segment b2b/b2c, source, service, room, budget, details JSON, uploaded file ids, UTM. Conversion links lead → client/company → project. |
| Projects & media | `projects` (KitchenPro stages, money, deliverable links), `assets` (kind, size, dimensions, duration, thumbnail, isPublic) | Assets belong to a project (or a lead before conversion). |
| Client pages | `share_links` (slug, token, expiry, passcode, toggles, views), `share_events`, `client_feedback` | One project can have several links (e.g. per family member or revision). |
| SMM | `posts` (core idea, goal, language, status, schedule), `post_variants` (one per platform), `post_assets`, `social_accounts`, `telegram_threads` | Variant status: pending / published / simulated / failed / skipped. |
| Public content | `portfolio_items` (trilingual title/summary JSON, assets, live link) | Curated separately from projects so client data never leaks. |
| Analytics | `analytics_events` (type, path, locale, segment, referrer, utm, daily-rotating visitor hash) | No cookies. |

Migrations: `src/lib/db/migrations.ts` (plain SQL, applied once, recorded in `_migrations`). Add a new entry per change.

## Request flow examples

**Start a project (B2C):** wizard → `POST /api/upload/public` per file (assets, kind client_upload) → `POST /api/leads` → `createLead()` → `notifyNewLead()` (Telegram + optional e-mail) → `track(form_submit)` → success screen with request number → in admin: lead detail → **Convert to project** (creates client [+ company], project with next code `AT-2026-0004`, moves files to the project).

**Client page:** admin creates a share link → copies/sends `https://app/p/aren-living?k=…` → client opens → `recordView` → clicks Live 3D (`open_live` event) → presses **Approve** → `client_feedback` + project stage `approval → production_prep` + Telegram notification.

**SMM:** composer → `createPostPack()` → AI/template variants → editor → schedule → worker: at `scheduledAt − approvalLeadMinutes` → `sendForApproval()` (Telegram media + buttons) → callback `ap:` → `publishPost()` → adapters → results back to Telegram. Edit flow: `ed:` → choose platform → force-reply → `handleTelegramReply()` updates the variant (optionally through AI with an instruction) → preview re-sent.

## Runtime

- `src/instrumentation.ts` boots the worker inside the Next.js server when `RUN_WORKER_IN_APP=true` (default). For production you may run `npm run worker` as a second container and set the variable to false in the web container (see `deploy/`).
- Middleware (Node runtime): locale rewrite (`/` → `/hy/...` internally, canonical URLs without prefix), admin cookie gate.
- Security headers in `next.config.ts`; uploads never served from `public/`; `/media` validates paths.

## Why not …

- **Separate front-end + API + worker repos?** Three deployments and three places for bugs; not needed at this scale.
- **A headless CMS?** The public content that changes (portfolio, brand settings) is editable in the admin; page copy lives in three dictionaries you can edit in one file per language.
- **Prisma / Postgres now?** Extra moving parts; SQLite handles this load easily and backs up as one file (Litestream to R2 in production). The Drizzle schema is dialect-portable when the time comes.
