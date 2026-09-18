# Architecture

## Principles

1. **One folder, one process, one file to back up.** Next.js app + SQLite + uploads on disk. Enough for one admin and hundreds of clients; a Postgres/S3 switch is a configuration change later, not a rewrite.
2. **Everything degrades gracefully.** No API key → AI uses templates, Telegram and social adapters run in dry-run and explain what they would do. You can test the whole workflow on day one.
3. **Boring, readable code.** Plain SQL migrations, typed schema, small server actions, no hidden magic.
4. **Security by default.** Hashed passwords, opaque hashed sessions, unguessable client links with expiry/passcode, a per-request Content-Security-Policy, no secrets in the repo.
5. **Fail closed on someone else's data.** A lookup that throws while deciding who may see a client's file denies the file; it never guesses in the visitor's favour.

## System map

```
                    ┌─────────────────────────────── Next.js app (port 3100) ────────────────────────────────┐
  Visitors ───────▶ │ (site)/[locale]  public website (hy default, /ru, /en)                                 │
  Clients ────────▶ │ p/[slug]         client pages (token, expiry, passcode) → feedback → CRM + Telegram    │
                    │ v/[slug]         the same project in the full-screen 3D viewer                         │
  You ────────────▶ │ admin/*          dashboard (session cookie) → server actions → lib/*                   │
                    │ api/*            leads, uploads, portal events, track, health, admin search            │
                    │ media/*          uploaded files: resized variants, HTTP Range, per-link access check   │
                    │ worker/          scheduler (60 s) + Telegram long polling (in-app or separate process) │
                    └────────┬───────────────────┬───────────────────┬─────────────────────┬─────────────────┘
                             │                   │                   │                     │
                   data/architeksoft.db    data/uploads/        data/inbox/        external services
                   (SQLite, WAL)           YYYY/MM/<id>.<ext>   drop folder →      Anthropic/Gemini · Telegram Bot API
                                           + thumbs             suggested posts    Meta Graph · LinkedIn · YouTube
                                           + .cache/ and derived/                  live.architeksoft.com admin API
```

## Request pipeline

`src/middleware.ts` runs on the **Node runtime** (`config.runtime = "nodejs"`) and matches everything except
`_next/static`, `_next/image`, `api/`, `media/` and `favicon.ico`. Those two route prefixes are excluded on
purpose: the middleware runtime clones the request body, which would cut off an upload.

Every matched request does four things, in this order:

| Step | What happens |
|---|---|
| **CSP nonce** | 128 random bits, base64. It is written to the *request* header `content-security-policy` (where Next.js reads it before stamping its own script tags) and to `x-nonce`, and the same policy goes on the response so the browser enforces it. `src/lib/csp.ts` builds it. |
| **Request headers** | `x-locale` (public-site language), `x-pathname` (path + query — the admin shell uses it for `<html lang>` and for the sign-in redirect), `x-nonce`, `content-security-policy`. All four are set or deleted on every request, so a header a client sends can never reach a layout. |
| **Admin gate** | `/admin/*` other than `/admin/login` without the `at_admin` cookie redirects to `/admin/login`; a deep link travels in `?next=`, and its own query string stays inside that parameter. The real check is `requireUser()` in the shell layout and in every server action — the cookie gate only saves a render. `x-locale` is removed: the admin interface has no locale in the URL and follows the `admin_lang` cookie. |
| **Locale** | `/hy/...` is redirected (308) to the unprefixed canonical URL; `/ru/...` and `/en/...` pass through with `x-locale`; everything else is rewritten to `/hy/...` internally. Paths in the pass list (`/api`, `/p/`, `/v/`, `/media`, `/_next`, `/favicon`, `/robots`, `/sitemap`, `/brand`, `/demo`, `/og`) and anything with a file extension skip the rewrite. |

Two things happen only on client-page paths:

- **Portal key cookie (`pk`).** A client page carries its key in the URL (`/p/aren-living?k=…`), but the files it
  shows are loaded from `/media/...`, where the query string is gone. The middleware copies a well-formed key
  (base64url, 8–200 characters) into an HttpOnly, SameSite=Lax cookie — newest first, at most 5 keys, 30 days — so
  `/media` can tell which link the visitor actually holds. The cookie name and format are duplicated in
  `src/middleware.ts` and `src/lib/portal.ts` (`LINK_KEYS_COOKIE`) because the middleware deliberately imports no
  database code; keep the two in sync.
- **410 for dead links.** On an exact `/p/<slug>` or `/v/<slug>` the middleware loads the link and runs the same
  `checkAccess` the page runs. When the answer is `expired` or `inactive` the response status is **410 Gone** while
  the page still renders its own "no longer available" card. The App Router gives a page no way to set a status, and
  this is the one place that can, so a link checker or an unfurling chat app can tell a used-up client link from a
  live one. It costs one indexed single-row SELECT, and only on `/p` and `/v`. An unknown slug is a plain 404.

## Data model (SQLite via Drizzle, `src/lib/db/schema.ts`)

| Domain | Tables | Notes |
|---|---|---|
| Auth & settings | `users`, `sessions`, `settings`, `audit_log` | Sessions store `sha256(token)`. `settings` = JSON per key (`brand`, `smm`, `telegram`, `live`), plus the worker's own `digest_last` row. `audit_log` is declared but not written to yet; the timeline that is actually kept is `activities`. |
| CRM | `companies`, `clients` (kind individual/contact), `leads`, `activities`, `tasks`, `counters` | Leads carry segment b2b/b2c, source, service, room, budget, details JSON, uploaded file ids, UTM. `activities.meta` holds the language-independent payload of system timeline entries. `counters` hands out project codes. |
| Projects & media | `projects` (KitchenPro stages, money, deliverable links), `assets` (kind, size, dimensions, duration, thumbnail, isPublic, projectId, leadId) | An asset belongs to a project, or to the lead that uploaded it before conversion. `isPublic` means "may appear on the website". |
| Client pages | `share_links` (slug, token, expiry, passcode, toggles, views), `share_events`, `client_feedback` | One project can have several links (e.g. per family member or revision), each with its own download permission. |
| SMM | `posts` (core idea, goal, language, status, schedule, source), `post_variants` (one per platform), `post_assets`, `social_accounts`, `telegram_threads` | `posts.source` is `manual` or `inbox`; `source_ref` is the inbox folder the post came from. |
| Public content | `portfolio_items` (trilingual title/summary JSON, assets, live link) | Curated separately from projects so client data never leaks; only files marked public are rendered. |
| Analytics | `analytics_events` (type, path, locale, segment, referrer, utm, daily-rotating visitor hash) | No cookies. |

### Migrations

`src/lib/db/migrations.ts` is an ordered list of `{ id, sql }` entries. Each one runs inside a transaction, exactly
once, and its id is recorded in `_migrations(id, applied_at)`. Never edit an entry that has shipped — add a new one.
Because the connection is cached on `globalThis`, `getDb()` / `getSqlite()` re-check the list length on every call
(one integer compare), so a migration added while the dev server is running is applied without a restart.

| Id | What it does |
|---|---|
| `0001_init` | The base schema: `users`, `sessions`, `settings`, `audit_log`, `companies`, `clients`, `leads`, `activities`, `tasks`, `projects`, `assets`, `share_links`, `share_events`, `client_feedback`, `posts`, `post_variants`, `post_assets`, `social_accounts`, `telegram_threads`, `portfolio_items`, `analytics_events`, and their indexes. |
| `0002_integrity_and_activity_meta` | Adds `activities.meta`. Adds seven triggers for the links SQLite cannot express as foreign keys: a contact whose company is gone becomes an individual (on insert and on update), and deleting a company, client, project, lead or post unlinks its tasks and removes its timeline (`tasks.entity_type/entity_id` and `activities.entity_type/entity_id` are polymorphic). Deleting a project clears `leads.project_id`; deleting a lead clears `projects.lead_id` and `assets.lead_id`. One-off cleanup of what earlier deletes left behind, and a backfill of `assets.lead_id` from `leads.files`. |
| `0003_project_code_counter` | Adds `counters(key, value)` and seeds `project_seq:<year>` from the existing project codes, so a deleted project's number is never handed out twice. Expect gaps in `AT-YYYY-NNNN`. |
| `0004_post_source` | Adds `posts.source` (NOT NULL, default `manual`) and `posts.source_ref`, plus `posts_source_idx`. |

Connection pragmas (`src/lib/db/index.ts`): `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`,
`busy_timeout=5000`, `cache_size=-32000` (32 MB), `temp_store=MEMORY`, `mmap_size=268435456` (256 MB).

## Background worker

`src/instrumentation.ts` → `src/worker/boot.ts` runs on server start: create the first admin account
(`ensureFirstAdmin`), create the inbox folder and its README (`ensureInboxDir`, a warning if the volume is
read-only), then start the worker when `RUN_WORKER_IN_APP=true` (default). In production you may instead run
`npm run worker` as a second container and set the variable to false in the web container (see `deploy/`).

The worker is two loops.

**Scheduler, every 60 s.** The next tick is armed only when the current one has finished, so two ticks can never
overlap and a slow upload cannot let a second tick publish the same post. Each step has its own try/catch, so one
broken step never aborts the rest:

1. **Daily digest** first, so a slow step below cannot push it past its minute.
2. **Stale claim sweep** — `sweepStalePost()` (see the state machine below).
3. **Inbox scan** — `runInbox()` imports whatever finished copying into `data/inbox` and suggests each new draft.
   Every folder is claimed with an atomic `fs.rename`, so a tick and an "Import now" click cannot import it twice.
   A folder nothing can move (open in another program) is logged at most once every 15 minutes instead of 60 times
   an hour. The rules the importer follows are in `docs/15_INBOX_WORKFLOW.md`.
4. **Approvals due** — `duePostsForApproval()`: posts in `scheduled` whose `scheduledAt` is within
   `smm.approvalLeadMinutes` → `sendForApproval()`.
5. **Publishes due** — `duePostsForPublishing()`: posts in `approved` that are due (a post approved with no
   schedule is due immediately), and only while `smm.autoPublishAfterApproval` is on → `publishPost()`.
6. **Cleanup, once an hour** — `client_upload` assets older than 24 h with no project, no lead and no mention in
   any `leads.files` (abandoned `/start` wizards) are deleted with their files and cache variants; derived social
   images unused for 48 h are removed.

A post whose approval send or publish throws goes into **back-off**, held in memory per post id: 5 minutes after the
first failure, 10 after the second, 15 after the third, capped at one hour. A success clears it. This is what stops
a post whose media cannot be sent from being re-uploaded every 60 seconds.

**Telegram long polling.** `getUpdates(offset, 25)`; while no bot token is configured the loop sleeps 15 s at a
time. A network error backs off from 2 s, doubling to a maximum of 60 s. `/start`, `/chatid` and `/id` answer in any
chat with that chat's id; `/setadmin <code>` binds the admin chat while none is bound; `/status` and the approval
buttons work only in the bound admin chat.

## Media pipeline

Files live under `UPLOAD_DIR/YYYY/MM/<assetId>.<ext>`, outside `public/`. `src/lib/media.ts` owns writing them and
`src/app/media/[...path]/route.ts` owns serving them.

**Accepting a file.** The stored type comes from the extension, never from the MIME the client declares (`page.html`
sent as `image/png` is refused). The allow-list is `.jpg/.jpeg/.jpe/.jfif/.png/.webp/.gif/.avif`,
`.mp4/.m4v/.mov/.webm/.mkv`, `.pdf`, the models `.glb/.usdz/.gltf`, and the opaque downloads
`.dwg/.dxf/.skp/.max/.zip/.rar/.7z/.csv/.xlsx`; a file with no extension is accepted only when its declared type is
one we can name ourselves. The bytes then have to agree with that type (`contentMatchesType`) or `saveAsset` throws
`MediaTypeError` and writes nothing. Limits: **100 MB** per file (`MAX_UPLOAD_BYTES`, the admin library and the
inbox), **50 MB** per file and 8 files per request on the public upload route.

**Deriving.** Images get a 640 px JPEG thumbnail (quality 82) generated with sharp — which also proves the bytes
decode, so a file that is still being copied is caught. Videos get their duration parsed from ffmpeg's output and a
frame at 1 s as the thumbnail; both are optional, and every ffmpeg child carries a kill timer (120 s for a
transcode, 20 s for the metadata probe). PDFs get no thumbnail. What could not be read is returned as
`postProcessError` so the inbox importer can refuse to attach the file, while the library still shows the row.

**Serving.** `/media/<rel>` streams the original with `Accept-Ranges`, honouring `Range` (an open-ended range
returns at most 4 MB) and always sending `X-Content-Type-Options: nosniff`. `?w=` returns a resized **AVIF** (when
the client accepts it) or **WebP**, written once to `UPLOAD_DIR/.cache/<rel with "_">.w<W>.q<Q>.<fmt>`. Both the
width and the quality snap to fixed ladders — widths 160/320/480/640/960/1280/1600/1920, qualities 45/55/65/78/90 —
so a crawler cannot fill the disk with near-identical copies.

**Per-link gating.** `accessFor()` decides before anything is read or resized:

| The file is | Who gets it |
|---|---|
| not in the library, or has no owning project, or is marked public | everyone (brand and site images, visitor attachments, and files social platforms fetch by URL) |
| a project file that is not public | the signed-in owner; a visitor holding a live link of that project (`pk` cookie, plus the passcode cookie when the link has a code) — with **that** link's download permission, so a sibling link with downloads on does not open the file for someone holding a link where it is off; and the platform fetching a file attached to a post that is on its way out (view only, never `?download=`) |
| anything else | 404 — nothing is said about a file the caller may not see |

A gated response is `Cache-Control: private` with `Vary: Cookie`, so a shared cache can never hand one client's
render to the next visitor. Thumbnails are matched the same way as the file they preview. If the library itself
cannot be read the route answers **503** (`no-store`, `Retry-After: 5`) instead of guessing.

Two more derived trees live under `UPLOAD_DIR`: `derived/<platform>/` holds images converted or padded to a
platform's limits before publishing (`src/lib/social/media-prep.ts`), and posters generated by `generatePoster()`
are ordinary assets (1080×1080, 1080×1350, 1920×1080 or 1080×1920 JPEG with the brand line).

`deleteAsset()` clears every reference in one transaction — project deliverable roles, portfolio cover/gallery/video,
lead attachments, `post_assets` by cascade — and only then removes the file, its thumbnail and its `.cache` variants.

## SMM state machine

```
draft ─┬─▶ scheduled ─┐
       │              ├─▶ sending_approval ─▶ awaiting_approval ─┬─▶ approved ─▶ publishing ─┬─▶ published
       └──────────────┘            (claim)                       │              (claim)      ├─▶ partially_published
                                                                 └─▶ cancelled               └─▶ failed
```

`sending_approval` and `publishing` are **transient claims**, never a resting place. A post enters them with a
conditional UPDATE (`claimPost`), so the 60-second tick, a Telegram button and the admin's own "Publish now" can run
at the same moment without sending an approval twice or publishing a variant twice. `post_variants` are claimed the
same way. If the process dies inside a claim, the worker's sweep releases it.

| Post status | Meaning |
|---|---|
| `draft` | Created, no schedule. |
| `scheduled` | Has `scheduledAt`; the tick will send it for approval `approvalLeadMinutes` beforehand. |
| `sending_approval` | Claim: an approval message is being sent right now. |
| `awaiting_approval` | The Telegram message (or, in dry run, the admin UI) is waiting for a decision. |
| `approved` | Approved; publishes at its scheduled time when `autoPublishAfterApproval` is on, otherwise waits for a manual Publish. |
| `publishing` | Claim: adapters are running. |
| `published` | Every enabled variant went out (or simulated). |
| `partially_published` | Some enabled variants went out, some failed. |
| `failed` | No enabled variant went out — including the configuration mistake of having none enabled. |
| `cancelled` | Skipped from Telegram or cancelled in the admin. A published or partially published post can no longer be cancelled. |

| Variant status | Meaning |
|---|---|
| `pending` | Not attempted yet (the default). |
| `publishing` | Claim: this variant's adapter is running. |
| `published` | The platform accepted it; `externalId` / `externalUrl` are stored. |
| `simulated` | Dry run — no key for that platform, so the adapter explains what it would have done in `error` (the only per-variant text column). |
| `failed` | The adapter refused or threw; the reason is in `error`. |

(`skipped` still appears in the schema comment for `post_variants.status`; nothing in the code sets it today.)

**Claims a publish may start from:** `draft`, `scheduled`, `awaiting_approval`, `approved`, `failed`,
`partially_published`. **An approval send may start from:** `draft`, `scheduled`, `awaiting_approval`, `approved`,
`failed`. Anything else is refused with a message naming the current status.

**Sweep (`sweepStalePost`, every tick).** A post in a claim whose `updatedAt` is older than 15 minutes was
interrupted by a restart: `publishing` → `failed` (an interrupted publish is something the owner must look at),
`sending_approval` → `scheduled` when it has a schedule, otherwise `draft`. Variants left in `publishing` become
`failed` with the "interrupted" note, and the owner gets one Telegram line per released post. The same sweep expires
`telegram_threads` left in `awaiting_edit` for more than 24 hours, so a forgotten force-reply prompt stops
swallowing later messages.

**Telegram buttons.** Each callback is valid only for certain statuses (`ap`, `sk`, `ed`, `ep`, `ai` only while
`awaiting_approval`; `pp` also while `scheduled`; `sa` — "send for approval" on an inbox suggestion — while `draft`
or `scheduled`). A button from an older message is stripped and answered with "Too late — this post is …".
**Approve** honours the schedule and the `autoPublishAfterApproval` setting; it does not publish on the spot unless
the post is already due. An edit reply is applied only when it is a reply to the prompt that opened the edit.

## Settings

`src/lib/settings.ts` stores one JSON object per key in the `settings` table: `brand`, `smm`, `telegram`, `live`.
Defaults live in code, reads are cached in process for 30 s and busted on write. Three fields are **env-backed** —
`telegram.adminChatId` (`TELEGRAM_ADMIN_CHAT_ID`), `telegram.channelId` (`TELEGRAM_CHANNEL_ID`) and
`live.backendUrl` (`LIVE_BACKEND_URL`): they resolve as *stored value → environment → built-in default* on every
read, and a saved value that is empty or identical to the environment's is not stored at all, so a later `.env`
change takes effect again. `getAllSettings()` is what the admin Settings page renders.

## Request flow examples

**Start a project (B2C):** wizard → `POST /api/upload/public` per file (assets, kind `client_upload`) →
`POST /api/leads` → `createLead()` → `notifyNewLead()` (Telegram + optional e-mail) → `track(form_submit)` →
success screen with the request number → in admin: lead detail → **Convert to project** (creates client [+ company],
a project with the next code from `counters`, and moves the lead's own files to it).

**Client page:** admin creates a share link → sends `https://app/p/aren-living?k=…` → the middleware stores the key
in the `pk` cookie → the page records a view → the client opens Live 3D (`open_live` event) and presses **Approve**
→ `client_feedback` + project stage `approval → production_prep` + Telegram notification. Its renders load from
`/media`, which re-checks that cookie on every file.

**SMM:** composer (or the inbox drop folder) → `createPostPack()` → AI/template variants → editor → schedule →
worker at `scheduledAt − approvalLeadMinutes` → `sendForApproval()` (Telegram media + buttons) → callback `ap:` →
`publishPost()` → adapters → results back to Telegram. Edit flow: `ed:` → choose platform → force-reply →
`handleTelegramReply()` updates the variant (optionally through AI with an instruction) → preview re-sent.

## Runtime

- **Worker:** in-app by default (`RUN_WORKER_IN_APP=true`), or `npm run worker` as its own process.
- **Middleware:** Node runtime, one nonce per request, locale rewrite, admin cookie gate, `pk` cookie, 410 for dead
  client links.
- **Headers:** `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts`; the
  per-request CSP in the middleware; a flat `default-src 'none'` policy for `/api/*`; `X-Robots-Tag: noindex,
  nofollow` on `/p` and `/v`.
- **Uploads** are never served from `public/`; `/media` resolves and validates every path against `UPLOAD_DIR`.
- **Body sizes:** server actions 2 MB (`serverActions.bodySizeLimit` in `next.config.ts`); the two upload route
  handlers are outside that limit and enforce their own (100 MB admin, 50 MB × 8 files public).

## Why not …

- **Separate front-end + API + worker repos?** Three deployments and three places for bugs; not needed at this scale.
- **A headless CMS?** The public content that changes (portfolio, brand settings) is editable in the admin; page copy
  lives in three dictionaries you can edit in one file per language.
- **Prisma / Postgres now?** Extra moving parts; SQLite handles this load easily and backs up as one file (Litestream
  to R2 in production). The Drizzle schema is dialect-portable when the time comes.
- **A job queue (Redis/BullMQ)?** The scheduler is one non-overlapping tick over a table that already carries the
  state; claims in SQL give the same "exactly once" guarantee without a second service to run and back up.
