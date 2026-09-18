# Deployment: local → test server → production (without touching the current site until you decide)

## Stage 0 — Local (today)
`start_local.bat` or `npm run dev`. SQLite + uploads in `data/`. Worker in-process. Telegram works locally with long polling (no public URL needed), so you can test the full approval flow from your laptop with just a bot token.

`start_local.bat` copies `.env.example` to `.env` on the first run, installs dependencies only when `package-lock.json` changed, seeds the demo database if `data/architeksoft.db` does not exist, and opens `/admin` as soon as `/api/health` answers (`scripts/open-when-ready.cmd`).

## Stage 1 — Test server on a subdomain (recommended next)
Goal: `new.architeksoft.com` (or `app.architeksoft.com`) running the whole system in production mode while `www` stays on Carrd.

1. VPS: Hetzner CAX21 (8 GB, €10.49) or CPX22, Ubuntu 24.04, Docker installed.
2. DNS (Cloudflare): `A new.architeksoft.com → VPS IP` (proxied — the orange cloud; see "Behind Cloudflare" below).
3. On the server:
   ```bash
   sudo apt-get install -y sqlite3 rclone      # only needed for backup.sh, see "Backups"
   git clone https://github.com/adavtyan815-art/AI_ArchitekSoft.git -b claude
   cd AI_ArchitekSoft/claudearchitekweb
   cp deploy/.env.production.example .env      # fill values, see "Before the first start"
   mkdir -p data/inbox                         # the bind-mounted drop folder, see "The render drop folder"
   docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
   ```
   Caddy obtains the certificate automatically; the app is only `expose`d on 3100 inside the compose
   network, so nothing but 80/443 (published by the `caddy` service) is reachable from outside.

   `--env-file .env` matters: without it `docker compose` reads `deploy/.env`, which does not exist. The
   services load `../.env` themselves (`env_file: ../.env`), so the containers get their variables either
   way — but `INBOX_HOST_DIR` is interpolated by **compose** when it builds the bind mount, and only
   `--env-file` gives it that value. (`SITE_HOST` reaches Caddy through the container environment, from
   the same file.) Keep the flag in every command.
4. The first start creates the admin user and runs the migrations. Seeding demo data on a server is **not**
   needed (and the seed script is not shipped in the runtime image) — add real content through the admin.
5. Test everything with real data for a week: intake → Telegram → client pages → posts.

### Before the first start

| Variable | Why it must be right before the first `up` |
|---|---|
| `ADMIN_PASSWORD` | Creates the owner account **once**, on the empty database. With `NODE_ENV=production` the app refuses to create it while the value is missing, the published testing default (`architek2026`), a placeholder (`REPLACE_ME`, `change-me…`, `your-…`) or under 12 characters — it logs `[auth] No admin account was created…` and you get no owner account at all. Later changes go through **Admin → Settings → Security**; editing `.env` again has no effect. |
| `APP_SECRET` | 32+ random characters (`openssl rand -base64 48`). See "What APP_SECRET keys" below. Settings → Security shows a warning, and the server logs one `[config]` line at boot, while it is a fallback, a placeholder or shorter than 32 characters. |
| `SITE_HOST` | The domain Caddy requests the certificate for. One host, or a space-separated list. |
| `APP_URL` | The public URL, used in links, QR codes and the media URLs Instagram fetches. |
| `INBOX_HOST_DIR` | The **host** folder compose bind-mounts at `/app/inbox`. Create it before the first `up`; do not set `INBOX_DIR` in `.env` on a server (compose sets it inside the container). |
| `LINKEDIN_ORG_URN` | Leave **empty** until you have the real `urn:li:organization:<numeric id>`. Anything that does not match that shape keeps LinkedIn in dry-run, and a value that looks real but is not makes every post fail at LinkedIn. |
| `LINKEDIN_API_VERSION` | LinkedIn's versioned API header, `YYYYMM`. Optional — the code default is **`202606`**. LinkedIn supports a version for about a year, so this must be bumped roughly **once a year**; when it expires LinkedIn answers HTTP 426 and the error message names this variable. Delete the line from your `.env` unless you need to override the default (`deploy/.env.production.example` still ships an older `202506`). |
| `YOUTUBE_PRIVACY` | The code default is `public`. Keep `private` until the Google API compliance audit passes, or the upload is rejected. |

### What APP_SECRET keys

It is not a session key — admin sessions are random tokens hashed in the database and survive a change.
`APP_SECRET` is the HMAC key for three things:

- the **client-page passcode cookie** (`hmac(APP_SECRET, "passcode|<linkId>|<code>")`) — changing the
  secret asks every visitor for the passcode once more;
- the **visitor / IP hashes** stored with analytics and client-page events — old hashes stop matching
  the new ones, so returning visitors count as new from that moment;
- the Telegram **`/setadmin` code** shown in Settings → Telegram — changing the secret changes the code,
  and an already-bound chat keeps working.

None of that loses data, so the secret can be rotated; just do it deliberately.

### First boot, step by step

`src/instrumentation.ts` runs once per Node process and calls `bootNode()`:

1. the SQLite file (and its folder) is created on first access and every pending migration in
   `src/lib/db/migrations.ts` is applied inside a transaction, idempotently;
2. `ensureFirstAdmin()` creates the owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — only
   when the `users` table is empty, and only when the password passes the production check above;
3. the inbox folder, its `README.txt` and `_processing/`, `_imported/`, `_failed/` are created (a
   read-only mount is a warning, never a failed boot);
4. with `RUN_WORKER_IN_APP=true` the 60-second scheduler, the inbox scan and Telegram long polling start
   in the same process.

## Stage 2 — Go live
- Point `www.architeksoft.com` (and root) to the VPS (or keep Carrd and link to `new.` for the intake — but the site here is the better home). Keep `live.architeksoft.com` as is.
- Serve both names: `SITE_HOST=www.architeksoft.com architeksoft.com` in `.env` (nothing to change in the Caddyfile). To serve `www` only and redirect the bare domain, uncomment the redirect block at the end of the Caddyfile.
- Update `APP_URL=https://www.architeksoft.com` and restart; Instagram publishing needs this public URL.
- Set up backups (Litestream → R2, uploads → R2 nightly) and uptime monitoring (free tiers of Better Stack / UptimeRobot).

### Go-live checklist

| # | Check | How |
|---|---|---|
| 1 | `NODE_ENV=production`, `APP_URL` and `SITE_HOST` are the real domain | `.env` |
| 2 | `APP_SECRET` is 32+ random characters | Admin → Settings → Security shows no warning; no `[config]` line in `docker compose -f deploy/docker-compose.yml logs web` |
| 3 | The owner account exists, and the live password is no longer the one sitting in `.env` | sign in, then change it in Settings → Security |
| 4 | Certificate issued for every name in `SITE_HOST` | `curl -I https://<host>` returns 200 and no TLS error |
| 5 | Health probe green | `curl https://<host>/api/health` → `{"ok":true,…}`; `docker compose -f deploy/docker-compose.yml ps` shows `healthy` |
| 6 | Only one scheduler runs | `RUN_WORKER_IN_APP=true` **or** the `split-worker` profile, never both |
| 7 | Telegram bound | Settings → Telegram → **Send test message** arrives |
| 8 | Drop folder writable | copy a folder into `data/inbox/`; within a minute it moves to `_imported/` |
| 9 | Uploads reach 100 MB | upload a large file in the admin; a rejection must be the app's message, not a proxy error |
| 10 | Backups run | `bash deploy/backup.sh` once by hand, then the cron line; check the objects in the bucket |
| 11 | Restore tested | copy the snapshot back into a scratch folder and open it with `sqlite3` |
| 12 | Monitors added | UptimeRobot on `/api/health` and `/`, with SSL-expiry alerts for every subdomain |

## Files in `deploy/`

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: `npm ci` → `next build` with `NEXT_STANDALONE=1` → bundled `worker.js` → small runtime image with sharp and ffmpeg-static |
| `docker-compose.yml` | `web` (Next.js + in-app worker), `caddy` (HTTPS), optional `worker` profile to run the worker separately, optional `litestream` profile, volumes for `data/` |
| `Caddyfile` | Reverse proxy with automatic TLS, compression, HSTS, the upload size cap and the Cloudflare client-IP configuration |
| `.env.production.example` | Production variables |
| `litestream.yml` | Continuous SQLite replication to R2/S3 (optional, enable when you have a bucket) |
| `backup.sh` | Nightly DB snapshot + uploads backup with rclone — runs on the **host** |

### Compose profiles

| Profile | Services started | When |
|---|---|---|
| *(none)* | `web`, `caddy` | The normal setup |
| `split-worker` | + `worker` (`node worker.js`) | Heavy media processing; set `RUN_WORKER_IN_APP=false` at the same time |
| `backup` | + `litestream` | Continuous DB replication; fill `deploy/litestream.yml` and the `LITESTREAM_*` keys first |

## How the image is built

The build depends on three things that are easy to lose:

1. **`package-lock.json` is committed.** The repository-root `.gitignore` ignores lockfiles; `claudearchitekweb/.gitignore` un-ignores this one (`!package-lock.json`). Without it `npm ci` in the builder stage fails on a fresh clone. Verify with `git check-ignore -v package-lock.json` — it must report the negation line.
2. **`NEXT_STANDALONE=1`.** `next.config.ts` emits `.next/standalone` only when this is set, and the runtime stage copies exactly that. The Dockerfile sets it in the builder stage. Outside Docker use `npm run build:standalone` (`cross-env`, so it works from PowerShell too).
3. **`worker.js`.** The runtime image has no `tsx`, no `scripts/` and no `src/`, so the builder bundles `scripts/worker.ts` into a single `worker.js` (`npm run build:worker`, esbuild, with `better-sqlite3` / `sharp` / `ffmpeg-static` left external) and the runner copies it, together with those three packages and what sharp needs (`detect-libc`, `semver`, `@img`). The `worker` service runs `node worker.js`.

Both stages are `node:22-bookworm-slim`. The runtime stage runs as the non-root `app` user, declares `VOLUME ["/app/data"]`, and sets `HOSTNAME=0.0.0.0` — the standalone server binds to `$HOSTNAME`, which Docker otherwise sets to the container id, and the health check (and Caddy) could not reach it. `tzdata` is installed because the slim base ships no zone files and `TZ` would silently stay UTC; both services set `TZ=Asia/Yerevan` so any local-time calculation lands in the business's time zone.

### Health check

`GET /api/health` runs one `select 1` against SQLite and answers `{"ok":true,"time":"…"}` with 200, or
`{"ok":false}` with **503** when the database cannot be read. The body never says why — the driver error
goes to the server log only. The image's `HEALTHCHECK` probes it every 30 s (5 s timeout, 20 s start
period) with `node -e "fetch('http://127.0.0.1:3100/api/health')…"`, so
`docker compose -f deploy/docker-compose.yml ps` shows the web container as `healthy`/`unhealthy`. The
`worker` service disables the check, because it serves no HTTP.
Point the external uptime monitor at the same path.

### Running the worker separately (optional)

```bash
# in .env:  RUN_WORKER_IN_APP=false
docker compose -f deploy/docker-compose.yml --env-file .env --profile split-worker up -d
```
Leaving `RUN_WORKER_IN_APP=true` while the profile is up runs two schedulers and two Telegram pollers.
Outside Docker the same process is `npm run worker`.

## Behind Cloudflare

DNS is proxied, so every request reaches Caddy from a Cloudflare address and the visitor's own address only arrives in `CF-Connecting-IP`. The Caddyfile therefore:

- lists the Cloudflare ranges in `servers { trusted_proxies static … }` and sets `client_ip_headers CF-Connecting-IP`, so `{client_ip}` is the real visitor — and a forwarded header from anyone else is ignored;
- passes `header_up X-Real-IP {client_ip}` (and the same value as `X-Forwarded-For`) and drops the incoming `CF-Connecting-IP`. The app reads the client address from `X-Real-IP` **only**, so one edge address can no longer exhaust a rate limit for everyone, and a bot cannot rotate a header to get past it.

That last point is a requirement, not a nicety: a reverse proxy that does not set `X-Real-IP` puts every
visitor in one rate-limit bucket, and the login, intake and passcode limiters then throttle everyone
together.

Re-check the ranges (<https://www.cloudflare.com/ips/>) once or twice a year. If the site ever stops being proxied, remove the `servers` block — otherwise `{client_ip}` falls back to the socket address, which is then correct anyway.

### Upload size

Cloudflare's proxy rejects request bodies over **100 MB** on the plans in use, so that is the real limit
no matter what the app allows. The numbers are kept equal on purpose, so the admin shows a clear message
instead of a proxy error:

| Limit | Value | Where |
|---|---|---|
| Proxy / reverse proxy body cap | 100 MB | Cloudflare plan limit, `request_body max_size 100MB` in `deploy/Caddyfile` |
| Admin upload, per file | 100 MB | `MAX_UPLOAD_BYTES` in `src/lib/media.ts` (also the inbox's per-file cap) |
| Public intake upload, per file | 50 MB | `MAX_BYTES` in `src/app/api/upload/public/route.ts` |
| Telegram file send | 50 MB (photos 10 MB) | Bot API limit, `src/lib/telegram.ts` |

The app does not shrink a video for you — it only extracts a poster frame and reads the duration with the bundled ffmpeg — so re-encode an oversized original before uploading it. If a genuinely larger original must go through one day, add a DNS-only (grey cloud) `admin.` subdomain and raise the Caddy cap and `MAX_UPLOAD_BYTES` together.

## Environment differences

| Variable | Local | Production |
|---|---|---|
| `APP_URL` | http://localhost:3100 | https://www.architeksoft.com |
| `NODE_ENV` | development | production |
| `APP_SECRET` | any | 32+ random characters |
| `ADMIN_PASSWORD` | testing default | 12+ characters, set before the first start |
| `RUN_WORKER_IN_APP` | true | true (single container) or false + `worker` service |
| `DATABASE_PATH` / `UPLOAD_DIR` | ./data/… | /app/data/… (volume, set by compose) |
| `INBOX_DIR` | ./data/inbox | /app/inbox — a **bind mount**, set by compose (see below) |
| `INBOX_HOST_DIR` | — | host path compose mounts as the inbox (default `deploy/../data/inbox`) |
| `TZ` | system | Asia/Yerevan (set by compose and by the image) |
| `NEXT_STANDALONE` | unset | 1 (set by the Dockerfile) |

### The render drop folder

The inbox (`docs/15_INBOX_WORKFLOW.md`) only works if the owner can *put files into it*, so it is the
one path that must **not** live in the `appdata` volume — a named volume has no host path to copy
into. `deploy/docker-compose.yml` therefore bind-mounts a host folder at `/app/inbox` and sets
`INBOX_DIR` itself; `INBOX_HOST_DIR` in `.env` decides which host folder that is.

```bash
mkdir -p data/inbox          # before the first `up`; the app writes a README into it on boot
docker compose -f deploy/docker-compose.yml --env-file .env up -d
```

Copy a render folder into `data/inbox/` on the server — over SFTP, or into a folder kept in sync
with the desktop (Syncthing, `rclone mount`, a mapped share) by pointing `INBOX_HOST_DIR` at it.
Within a minute the worker imports it and sends the draft for approval. Imported folders are moved
to `_imported/` and failed ones to `_failed/` (with an `error.txt`) inside the same folder — nothing is
deleted, so prune those two occasionally. The inbox needs no backup: everything that matters has been
copied into `uploads/` and the database by then.

Locally the same importer is also a command: `npm run inbox`, `npm run inbox -- --dry-run`,
`npm run inbox -- --example`. It needs `tsx` and `scripts/`, which the runtime image does not ship, so on
a server the worker is the only importer.

## Backups

`deploy/backup.sh` runs **on the host**, not inside a container: it needs `sqlite3` and `rclone` installed there and reads the Docker volume directly.

```bash
rclone config                      # create a remote called "r2"
crontab -e
# 0 3 * * * bash /opt/architeksoft/claudearchitekweb/deploy/backup.sh >> /var/log/architeksoft-backup.log 2>&1
```
Use the path of your own checkout. The script takes a consistent `.backup` snapshot of the database, copies it to `r2:…/db/`, and mirrors `uploads/`. It reads `DATA_DIR` (default `/var/lib/docker/volumes/deploy_appdata/_data`), `REMOTE` (default `r2:architeksoft-backups`) and `MAX_DELETE` (default 50) from the environment, and refuses to run at all when the database file or the `uploads` directory is missing.

> `uploads/derived/` and `uploads/.cache/` hold generated copies only — per-platform social images (deleted by the worker after 48 h unused) and resized web variants. Both are rebuilt on demand, so the backup job may skip them with `--exclude 'derived/**' --exclude '.cache/**'`.
 Files the mirror would delete or overwrite are moved to `uploads-deleted/<date>/` instead of being destroyed, and a run that would remove more than `MAX_DELETE` (50) files stops — so a wrongly deleted asset, or an unmounted volume, cannot wipe the backup overnight. Add a lifecycle rule on the bucket that expires `uploads-deleted/` after 30–90 days.

## Updating

```bash
git pull
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```
Migrations run automatically at start (`src/lib/db/migrations.ts`), inside a transaction and only once
each, so re-running the command is safe. The web container is replaced rather than added next to the old
one, so expect a few seconds of 502 while it boots: watch
`docker compose -f deploy/docker-compose.yml logs -f web` until the health check reports `healthy`.
Take a backup (`bash deploy/backup.sh`) before an update that adds migrations.

## Rollback

```bash
git checkout <previous-commit>
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```
The database file is forward-compatible in practice: every migration so far only adds tables and columns,
so an older build keeps running on a newer file and ignores what it does not know. (A future migration
that adds a `NOT NULL` column without a default would be the exception — then restore a snapshot instead.)
Restore the data itself only if it is
actually damaged — stop the stack, replace `architeksoft.db` in the `appdata` volume with the snapshot
from `r2:…/db/` (or `litestream restore`), and start again. Docker keeps the previous image until you
prune, so a rollback does not need a rebuild if the image is still there.

## Optional: the old `website/` backend
Unchanged. If you later want the dashboard to *replace* its admin panel, the `live.ts` client already covers list/create/stop/balance; the instance page can move here in a later step.
