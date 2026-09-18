# Security and scalability

## Built in

| Area | Implementation |
|---|---|
| Admin auth | bcrypt password hashes (cost 10); opaque 256-bit session tokens stored as `sha256(token)`; HttpOnly, SameSite=Lax, Secure in production; 14-day expiry; middleware cookie gate on `/admin` plus a server-side `requireUser()` in the shell layout and in every server action (route handlers use `getSessionUser()` and answer 401). Expired sessions are swept on each successful sign-in. |
| Sign-in hardening | The attempt is counted *before* the bcrypt compare, so guesses fired in parallel cannot slip past the limit. An unknown e-mail is compared against a dummy hash, so both answers cost one bcrypt round. Inputs are capped at 254 characters (e-mail) and 200 (password). Failed sign-ins are logged with the address and a control-character-stripped user agent. |
| Password change | Settings → Security requires the current password, a new one of 8–200 characters, and a confirmation that matches; five wrong current-password attempts per user in 15 minutes lock the form for the rest of that window. A successful change revokes every other session of that account and keeps the browser that made the change signed in. |
| Client links | Readable slug + 96-bit random token in the URL (`newToken(12)`); optional passcode of 6–24 characters for new links; expiry up to 10 years; deactivate and regenerate; view events store a keyed hash of the address only. An expired or deactivated link answers **410 Gone**, an unknown slug **404**. |
| Passcode cookie | `pp_<linkId>` holds `hmac(APP_SECRET, "passcode\|<linkId>\|<code>")`, not the code and not a bare hash of it: the sha256 of a short code is reversed instantly, and an HMAC bound to the link cannot be replayed on another client page. Changing `APP_SECRET` or regenerating the link simply asks the visitor for the code again. |
| Client file access | Project files that are not marked "may appear on the website" are served only to the signed-in owner, to a visitor holding a live link of that project (the `pk` cookie the middleware writes from `?k=`, plus the passcode cookie when the link has one), or to a platform fetching a file attached to a post on its way out (view only). `?download=` follows *that link's* own permission. Gated responses are `Cache-Control: private` with `Vary: Cookie`. Every check fails closed: a lookup that throws denies the file, and an unreadable library answers 503 rather than guessing. |
| Uploads | Allow-list by **extension**, not by the MIME the client declares; the bytes must then agree with that type (`MediaTypeError`, nothing is written). Random file names, stored outside `public/`, served with `nosniff`, path traversal blocked on write and on read. 100 MB per file in the admin and the inbox, 50 MB per file and 8 files per request on the public route. SVG is not on the list. Every ffmpeg child has a kill timer (120 s transcode, 20 s probe). |
| Public forms | zod schemas with an explicit shape (unknown keys are dropped), a length cap on every field, a bounded request body, a honeypot field (`website` — a filled one gets a friendly fake success), and per-address rate limits. `/api/track` accepts only `page_view`, `cta_click` and `form_start`; `form_submit`, `portal_view` and `portal_action` are written server-side, so the dashboard's lead and conversion figures cannot be inflated from outside. |
| Client IP | Read from `X-Real-IP` only — our own proxy overwrites it on every request, whereas the left-most `X-Forwarded-For` entry is whatever the client chose to send. `deploy/Caddyfile` sets `header_up X-Real-IP {client_ip}` behind `trusted_proxies` (the Cloudflare ranges) and strips `CF-Connecting-IP`. Without that header every visitor shares one rate-limit bucket. |
| Headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()` (camera for AR) from `next.config.ts`; `X-Robots-Tag: noindex, nofollow` on `/p` and `/v`; no `X-Powered-By`. |
| Content-Security-Policy | Per request, with a fresh 128-bit nonce from the middleware. `script-src` is `'self' 'nonce-…' 'sha256-…' 'strict-dynamic' 'wasm-unsafe-eval' https:` — the one inline script the app writes itself (the pre-paint theme script) is allowed by hash, `'strict-dynamic'` covers what Next's own bootstrap loads, and `'self' https:` are only there for browsers that ignore `'strict-dynamic'`. `base-uri 'none'`, `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'self'` are the directives that matter most here: no planted `<base>`, no plugin document, no form posting the visitor's answers elsewhere, no clickjacking. `style-src` keeps `'unsafe-inline'` (inline `style={{…}}` and the global-error boundary's own `<style>`). Dev adds `'unsafe-eval'` and `ws:`; production has neither. `/api/*` gets a flat `default-src 'none'` constant instead of a nonce; `/media` is deliberately left without one, because it hands the browser PDFs, video and GLB files for built-in viewers, never HTML, and always sends `nosniff`. |
| Body sizes | Server actions 2 MB (`serverActions.bodySizeLimit` in `next.config.ts`). `/api` and `/media` are outside the middleware matcher, so an upload body is never cloned by it; the two upload routes enforce their own limits (100 MB per file in the admin; 50 MB per file and 8 files per request on the public route) and check `Content-Length` before buffering. |
| Secrets | Only in `.env` (git-ignored); `.env.example` documents them. `APP_SECRET` keys the passcode cookies and the visitor/IP hashes — a production boot with a missing, placeholder or under-32-character value prints one warning, and Settings → Security shows it. In production the owner account is **not** created when `ADMIN_PASSWORD` is missing, a placeholder, the development default or shorter than 12 characters; the boot log says so. |
| Analytics | No cookies; the visitor hash is `sha256(APP_SECRET \| Yerevan day \| ip \| ua)` truncated to 24 characters, so it rotates daily; client-page events use `hmac(APP_SECRET, …)` of the address for the same reason. No third-party scripts. |
| Telegram | Only the bound admin chat can press approval buttons or edit text; while no chat is bound the buttons are refused outright. Binding a new chat needs `/setadmin <code>`, where the code is derived from `APP_SECRET` (`setAdminCode()`, 10 hex characters) and shown in Settings → Telegram. Everything a user typed is HTML-escaped before it goes into a message. |
| Audit trail | The `activities` timeline records who did what to a lead, client, company, project or post (`logActivity`), `share_events` records every client-page view and action with a keyed address hash, and every publish result is stored per variant with its external id and URL or its error. Failed sign-ins go to the server log. (`audit_log` exists in the schema but nothing writes to it yet.) |

## Rate limits and quotas

In-memory, per process (`src/lib/rate-limit.ts`), keyed as listed. A limiter with a lock escalates: the first lock
is 1 minute, the second 5, the third and later 15; strikes are forgotten after a quiet day. Answers are `429` with
`Retry-After`.

| What | Key | Limit | Lock |
|---|---|---|---|
| Admin sign-in | e-mail **and** address | 5 per 15 min | 1 / 5 / 15 min |
| Change password (wrong current) | user id | 5 per 15 min | rest of the window |
| Client-page passcode | link id **and** address | 5 per 15 min | 1 / 5 / 15 min |
| `POST /api/leads` | address | 10 per min | — |
| `POST /api/track` | address | 120 per min | — |
| `POST /api/upload/public` | address | 20 per min | — |
| Public upload bytes | address | 300 MB per day | — |
| Public upload bytes | whole server | 5 GB per day | — |
| `POST /api/portal/<slug>/feedback` | link id **and** address | 10 per hour | — |
| `POST /api/portal/<slug>/event` | link id **and** address | 60 per hour | — |

## What is not protected

Worth knowing before the site goes public — none of these is an accident:

- **No second factor.** One password protects the whole dashboard. 2FA/passkeys are on the roadmap; until then
  Cloudflare Access in front of `/admin` is the cheap second gate.
- **The sign-in lock is keyed by e-mail as well as address**, so someone who knows the owner's e-mail can lock the
  account for 1–15 minutes. Accepted: the alternative is letting a botnet spread its guesses across addresses.
- **A client who may view a document can still save it.** `allowDownload` controls the `Content-Disposition`
  attachment; the browser's own PDF viewer has a save button. A truly non-downloadable document does not exist.
- **Rate limits are per process.** Two app containers mean two independent buckets; Cloudflare's own rate limiting
  is what covers that case today.
- **Opaque uploads are not inspected.** `.dwg`, `.dxf`, `.zip`, `.csv` are served with their own type and
  everything else on the list (`.skp`, `.max`, `.rar`, `.7z`, `.xlsx`) as `application/octet-stream`, always with
  `nosniff`. They are never executed and never rendered, but they are not scanned for malware either.
- **There is one level of admin.** `users.role` exists (`owner | manager | viewer`) but nothing reads it for a
  decision, and there is no UI to create further users — a signed-in session can do everything.
- **`is_public` means "may appear on the website", not "may appear on the client page."** A client page shows the
  project's files regardless of that flag — the link itself is the access control there.
- **iOS AR Quick Look** fetches a USDZ outside the page context. If that request does not carry the `pk` cookie, the
  AR button on a client page will not open a non-public model; public models are unaffected.

## Do before production

1. Set a long random `APP_SECRET`, a real `ADMIN_PASSWORD` (12+ characters), `APP_URL=https://…`,
   `NODE_ENV=production`. Check the boot log: it names any weak value.
2. Put the app behind Caddy (automatic HTTPS) and Cloudflare (proxy + WAF + rate limiting). Keep the
   `header_up X-Real-IP {client_ip}` line and the `trusted_proxies` list in `deploy/Caddyfile` — without it the
   per-address limits throttle every visitor together. Optionally Cloudflare Access in front of `/admin`.
3. Backups: Litestream (`deploy/litestream.yml`) streams the SQLite file to Cloudflare R2/B2 continuously; test a
   restore once. `deploy/backup.sh` mirrors `data/uploads`; it refuses to run when the database or the uploads
   folder is missing and aborts a run that would delete more than `MAX_DELETE` (50) remote files, so raise that
   deliberately after a large clean-up. Give the bucket a lifecycle rule that expires `uploads-deleted/` after
   30–90 days.
4. Bind the Telegram admin chat from the phone that will approve posts (`/setadmin <code>`), and check that
   Settings → Telegram shows it as connected.
5. Rotate the Gemini key that is committed in `dashboard/server.js`; never commit `.env`.
6. Keep the `live.architeksoft.com` certificate renewed (it expired on 17 Jul 2026); consider IAM roles instead of
   long-lived AWS keys there and hash its admin password (its login compares plain text).
7. Add 2FA/passkeys for the admin if more than one person uses it (SimpleWebAuthn / TOTP) — listed in the roadmap.

## Scalability path

| Load | What to do |
|---|---|
| 1 admin, hundreds of clients, tens of GB of media | Current setup on one €10–20 VPS. SQLite in WAL mode handles thousands of writes/s; media streamed from disk. |
| Many concurrent video views / TB of video | Move `data/uploads` to object storage (R2, zero egress) behind the same `/media` URLs (adapter in `src/lib/media.ts`), or serve via a CDN domain. Note that gated project files cannot sit behind a shared cache as they are — they would need signed URLs. |
| Several admins / offices | Postgres (the Drizzle schema is portable), sessions unchanged, run the worker as a separate container (`RUN_WORKER_IN_APP=false` on the web service) with a leader lock, and move the rate limiters and the settings/portfolio caches to a shared store. |
| Very large CRM tables | Company and client de-duplication loads the candidate rows and compares them in JavaScript, because SQLite's `lower()` folds ASCII only. Right for tens to low thousands of rows; past that, add stored `name_key`/`phone_key` columns with indexes rather than changing the comparison. |
| Many workshops using KitchenPro themselves | Multi-tenant: add `workshop_id` to projects/assets/links/posts, per-workshop branding on client pages, roles (owner/designer/production/sales) — the schema already keeps clients, companies and projects separate to make this a contained change. |
| Heavy Live 3D usage | Keep quotas per instance; move to Vagon/Streampixel or an auto-scaling AWS group; the dashboard only needs the "create session link" API to change. |

## Threats considered

- **Guessing client pages:** 96-bit tokens; enumerating slugs reveals nothing without the token, and the media route
  refuses the project's files to anyone who does not hold a live link.
- **Leaked share link:** expiry, passcode, deactivate, regenerate token. A regenerated token invalidates the `pk`
  cookies that carried the old one.
- **Brute-forcing a passcode:** counted per link and per address before the answer goes out, so attempts fired in
  parallel are all counted; new passcodes must be at least 6 characters (links created earlier keep theirs).
- **Uploaded malware:** no execution, no HTML/SVG served inline from uploads (neither is on the allow-list), content
  sniffing rejects a file whose bytes do not match its type, `nosniff` on every response.
- **Disk exhaustion through public uploads:** per-request, per-address-per-day and whole-server-per-day byte
  budgets, plus fixed width and quality ladders so `?w=`/`?q=` cannot fill `.cache` with variants.
- **Telegram bot token leak:** rotate at BotFather; the bound-chat check limits damage, and `/setadmin` needs a code
  derived from `APP_SECRET`.
- **Social tokens:** stored only in `.env`; publishing is logged per variant; dry-run by default.
- **CSRF on admin actions:** Next.js server actions are origin-checked; cookies are SameSite=Lax; `form-action
  'self'` in the CSP.
- **XSS:** React escapes by default, no user text is rendered as HTML, and the CSP has no `'unsafe-inline'` for
  scripts — an injected `<script src="…">` cannot run without the request's nonce.
