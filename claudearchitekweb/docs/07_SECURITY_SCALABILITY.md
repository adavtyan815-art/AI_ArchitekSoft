# Security and scalability

## Built in

| Area | Implementation |
|---|---|
| Admin auth | bcrypt password hashes; opaque 256-bit session tokens stored as SHA-256; HttpOnly, SameSite=Lax, Secure in production; 14-day expiry; middleware gate on `/admin` + server-side check in the shell layout and in every server action (`requireUser`). |
| Client links | Readable slug + 96-bit random token in the URL; optional passcode (hashed in a cookie); expiry date; deactivate/regenerate; view events with hashed IPs only. |
| Uploads | Allow-list of MIME types/extensions, size limits (public 50 MB, admin 1 GB), random file names, stored outside `public/`, served with `nosniff`, path traversal blocked. |
| Public forms | zod validation, honeypot field, naive per-IP rate limit, no HTML rendering of user text. |
| Secrets | Only in `.env` (git-ignored); `.env.example` documents them. `APP_SECRET` signs sessions/hashes — Settings → Security warns if it is still the default. |
| Headers | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera allowed for AR). |
| Analytics | No cookies; visitor hash rotates daily; no third-party scripts. |
| Telegram | Only the configured admin chat can press approval buttons or edit text; commands from other chats are ignored. |
| Audit | `activities` and `audit_log` tables; every publish result is stored per variant. |

## Do before production

1. Set a long random `APP_SECRET`, a real `ADMIN_PASSWORD`, `APP_URL=https://…`, `NODE_ENV=production`.
2. Put the app behind Caddy (automatic HTTPS) and Cloudflare (proxy + WAF + rate limiting). Optionally Cloudflare Access in front of `/admin` as a second gate.
3. Backups: Litestream (`deploy/litestream.yml`) streams the SQLite file to Cloudflare R2/B2 continuously; test a restore once. Back up `data/uploads` nightly (rsync/rclone to R2).
4. Rotate the Gemini key that is committed in `dashboard/server.js`; never commit `.env`.
5. Keep the `live.architeksoft.com` certificate renewed (it expired on 17 Jul 2026); consider IAM roles instead of long-lived AWS keys there and hash its admin password (its login compares plain text).
6. Add 2FA/passkeys for the admin if more than one person uses it (SimpleWebAuthn / TOTP) — listed in the roadmap.

## Scalability path

| Load | What to do |
|---|---|
| 1 admin, hundreds of clients, tens of GB of media | Current setup on one €10–20 VPS. SQLite in WAL mode handles thousands of writes/s; media streamed from disk. |
| Many concurrent video views / TB of video | Move `data/uploads` to object storage (R2, zero egress) behind the same `/media` URLs (adapter in `src/lib/media.ts`), or serve via a CDN domain. |
| Several admins / offices | Postgres (Drizzle schema is portable), sessions unchanged, run the worker as a separate container with a leader lock. |
| Many workshops using KitchenPro themselves | Multi-tenant: add `workshop_id` to projects/assets/links/posts, per-workshop branding on client pages, roles (owner/designer/production/sales) — the schema already keeps clients, companies and projects separate to make this a contained change. |
| Heavy Live 3D usage | Keep quotas per instance; move to Vagon/Streampixel or an auto-scaling AWS group; the dashboard only needs the "create session link" API to change. |

## Threats considered

- Guessing client pages: 96-bit tokens; enumeration of slugs reveals nothing without the token.
- Leaked share link: expiry, passcode, deactivate, regenerate token.
- Uploaded malware: no execution, no HTML/SVG served inline from uploads (SVG not in allow-list), `nosniff`.
- Telegram bot token leak: rotate at BotFather; the admin chat id check limits damage.
- Social tokens: stored only in `.env`; publishing is logged; dry-run by default.
- CSRF on admin actions: Next.js server actions are origin-checked; cookies SameSite=Lax.
