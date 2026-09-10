# Deployment: local → test server → production (without touching the current site until you decide)

## Stage 0 — Local (today)
`start_local.bat` or `npm run dev`. SQLite + uploads in `data/`. Worker in-process. Telegram works locally with long polling (no public URL needed), so you can test the full approval flow from your laptop with just a bot token.

## Stage 1 — Test server on a subdomain (recommended next)
Goal: `new.architeksoft.com` (or `app.architeksoft.com`) running the whole system in production mode while `www` stays on Carrd.

1. VPS: Hetzner CAX21 (8 GB, €10.49) or CPX22, Ubuntu 24.04, Docker installed.
2. DNS (Cloudflare): `A new.architeksoft.com → VPS IP` (proxied).
3. On the server:
   ```bash
   git clone https://github.com/adavtyan815-art/AI_ArchitekSoft.git -b claude
   cd AI_ArchitekSoft/claudearchitekweb
   cp deploy/.env.production.example .env   # fill values
   docker compose -f deploy/docker-compose.yml up -d --build
   ```
   Caddy obtains the certificate automatically; the app listens on 3100 inside the compose network only.
4. `docker compose -f deploy/docker-compose.yml exec web node scripts/seed.js` is **not** needed in production — the first start creates the admin user; add real content via the admin.
5. Test everything with real data for a week: intake → Telegram → client pages → posts.

## Stage 2 — Go live
- Point `www.architeksoft.com` (and root) to the VPS (or keep Carrd and link to `new.` for the intake — but the site here is the better home). Keep `live.architeksoft.com` as is.
- Update `APP_URL=https://www.architeksoft.com` and restart; Instagram publishing needs this public URL.
- Set up backups (Litestream → R2, uploads → R2 nightly) and uptime monitoring (free tiers of Better Stack / UptimeRobot).

## Files in `deploy/`

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build → `next build` (standalone) → small runtime image with ffmpeg-static and sharp |
| `docker-compose.yml` | `web` (Next.js + in-app worker), `caddy` (HTTPS), optional `worker` profile to run the worker separately, volumes for `data/` |
| `Caddyfile` | Reverse proxy with automatic TLS, gzip, large upload limit |
| `.env.production.example` | Production variables |
| `litestream.yml` | Continuous SQLite replication to R2/S3 (optional, enable when you have a bucket) |
| `backup.sh` | Nightly uploads backup with rclone |

## Environment differences

| Variable | Local | Production |
|---|---|---|
| `APP_URL` | http://localhost:3100 | https://www.architeksoft.com |
| `NODE_ENV` | development | production |
| `APP_SECRET` | any | long random string |
| `RUN_WORKER_IN_APP` | true | true (single container) or false + `worker` service |
| `DATABASE_PATH` / `UPLOAD_DIR` | ./data/… | /app/data/… (volume) |

## Updating

```bash
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```
Migrations run automatically at start (`src/lib/db/migrations.ts`).

## Rollback
Keep the previous image (`docker compose` keeps it until pruned) and the Litestream snapshots; `docker compose up -d` with the previous git commit restores code, the DB file is forward-compatible.

## Optional: the old `website/` backend
Unchanged. If you later want the dashboard to *replace* its admin panel, the `live.ts` client already covers list/create/stop; the instance page can move here in a later step.
