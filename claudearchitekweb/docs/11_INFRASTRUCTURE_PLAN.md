# Infrastructure and services plan — what to use now, what to use later, and when to switch

*Prices are Sept 2026 list prices in USD (EUR where the vendor bills in EUR), rounded. "Now" = 1 admin, tens of leads/month, up to a few hundred clients, a few GB of renders/videos. "Later" = several admins, thousands of client pages, tens of GB of media, partners using KitchenPro themselves.*

## 0. The principle

Run **one small server with one process and one database file** until a measurable limit is hit. Every service below is chosen so that the migration path is a configuration change, not a rewrite. Total at low usage: **≈ $20–30/month without GPU streaming**, ≈ $70–120 with a modest Live 3D budget.

## 1. Summary table

| Area | Now (recommended) | Why | Monthly | Later (when) |
|---|---|---|---|---|
| Hosting | 1 VPS: Hetzner CAX21 (4 vCPU Arm, 8 GB) or CPX22 x86; Docker Compose; Caddy | Runs web + worker + SQLite + media on one box; measured TTFB 7 ms warm | €10–20 | Split web/worker, add a second box or move to managed containers at >50 req/s sustained or >8 GB RAM need |
| Database | SQLite (WAL) in the app, Litestream backups | Zero ops, 1 file, thousands of writes/s; our whole dataset is MBs | $0 | Postgres (Hetzner/DO managed, $15–25) when you need multiple app instances, >10 concurrent writers, or analytics queries over millions of rows |
| Media storage | Local disk on the VPS volume (uploads/) | Simplest; `/media` route already resizes/caches | in VPS | Cloudflare R2 (S3-compatible, **$0 egress**, $0.015/GB) when uploads exceed ~50 GB or you serve many video views; keep the same `/media` URLs via an adapter |
| CDN / DNS / WAF | Cloudflare Free in front of the VPS | Caching of static assets, DDoS/WAF, DNS, free TLS at the edge | $0 | Cloudflare Pro ($20) only if you need image optimisation/WAF rules at scale |
| Backups | Litestream → R2/B2 (continuous), nightly rclone of uploads | Point-in-time restore of the DB for cents | ~$1–2 | Same tools; add cross-provider copy (B2) for media |
| Email | Resend free tier (3k/month) for notifications; Google Workspace for human mail | Cheap, reliable, no server config | $0 (Resend) / $7 (Workspace) | Resend Pro $20 at >3k emails/month; Postmark if you need dedicated IPs |
| Telegram | Bot API (long polling now, webhook later) | Free, instant, already your channel; approvals + notifications | $0 | Local Bot API server only if you need >50 MB uploads through Telegram (rare) |
| Social publishing | Native Meta (Facebook + Instagram) + Telegram channel now; LinkedIn/YouTube via OAuth next | Free APIs, no vetting for your own pages | $0 | Unified API (Zernio ≈$6/account, Upload-Post $24, Post Bridge ~$29) when you want TikTok/YouTube public without audits or manage partners' pages |
| AI | Anthropic Claude (Opus 5 default; Sonnet 5 / Haiku 4.5 cheaper) for copy | Negligible cost per post; Gemini fallback | <$5 | Same; add image generation ($0.04/img) if you want AI creatives |
| Authentication | Built-in (bcrypt + hashed sessions) | One admin; simple and secure | $0 | Add passkeys/TOTP (SimpleWebAuthn, free) at 2+ admins; Cloudflare Access (free ≤50 users) as a second gate |
| Analytics | Built-in first-party (no cookies) | Answers the business questions; no banner | $0 | Plausible ($9) or self-hosted Umami if you want marketing-grade dashboards; GA4 not recommended (consent) |
| Monitoring/logging | UptimeRobot free (uptime), Docker logs + `journalctl`, Better Stack free tier (logs) | Enough to know it is down and why | $0 | Grafana Cloud free / Sentry Developer ($26) when several people ship code |
| Domain/SSL | architeksoft.com at your registrar; DNS on Cloudflare; TLS by Caddy (Let's Encrypt) and Cloudflare edge | Automatic renewals (fixes the expired `live.` cert class of problem) | ~$15/yr | Same |
| Pixel Streaming | Keep your AWS `live.architeksoft.com` backend, on-demand g4dn.2xlarge ($0.75/h + egress), quotas per link | Already built; pay only while a session runs | $0 idle; ≈$1/h used | Vagon Streams ($1.5–2.8/h, REST API, no ops) when demand is irregular; Streampixel €99/mo flat at >60 h/month steady; auto-scaling AWS group only with dedicated ops |
| Workers / scheduled jobs | In-process worker (scheduler + Telegram) | One process, no queue needed at this volume | $0 | Separate `worker` container (compose profile exists) at heavy media processing; a queue (BullMQ + Redis $5) only if jobs exceed minutes |
| Image/video processing | sharp (images) + bundled ffmpeg (thumbnails) on the VPS | Free, already integrated | $0 | Offload video transcoding to the worker container or Cloudflare Stream ($1/1000 min stored + $1/1000 min delivered) when you host many client videos |
| Object storage for models (GLB/USDZ) | Same as media | Small files | $0 | R2 + CDN domain when partners embed viewers on their sites |
| Payments (optional, later) | — | Not needed for local testing | $0 | Idram/ArCa gateway or Stripe when deposits are collected online |

## 2. Detail per area

### Hosting
- **Now:** Hetzner CAX21 (€10.49) is enough for the whole stack; CPX22 (€19.49) if you prefer x86 for the native modules (both work; the Docker image is multi-arch). DigitalOcean $24 or Lightsail $12–24 are equivalent alternatives with simpler billing.
- **Why not Vercel:** cannot run the long-lived worker (Telegram polling, scheduler) and limits request bodies to 4.5 MB (uploads). Railway/Render can, but cost $30–60 for the same capacity.
- **What changes with more clients:** the app is I/O light; the first pressure point is media (disk) and video views (bandwidth: Hetzner includes 20 TB). Move media to R2 before buying a bigger box.
- **Switch when:** sustained CPU >70% or RAM >6 GB (check in Hetzner console) or you want zero-downtime deploys → add a second VPS behind Cloudflare load balancing (needs Postgres + R2 first).

### Database
- **Now:** SQLite with WAL, `synchronous=NORMAL`, 32 MB cache, mmap. Measured: dashboard queries < 5 ms. Backups by Litestream every 10 s.
- **Switch when:** you run more than one app instance, need concurrent admins across offices, or analytics tables pass ~5–10 million rows. Then: managed Postgres (Hetzner €15 / DO $15 / Neon serverless free–$19). The Drizzle schema is portable; migration = export/import script + connection string.

### Media storage and CDN
- **Now:** local disk; `/media/...?w=` serves resized AVIF/WebP with immutable caching; Cloudflare caches them at the edge.
- **Switch when:** uploads > ~50 GB, or partners embed viewers/videos on their own sites (traffic you do not control). Then: R2 bucket + `cdn.architeksoft.com`; presigned direct uploads from the browser (bypasses the 100 MB Cloudflare proxy limit). Cost: 100 GB ≈ $1.5/month, egress free.

### Backups
- **Now:** Litestream to R2 (or Backblaze B2) + nightly `rclone sync` of uploads. Test a restore once a quarter.
- **Later:** Postgres `pg_dump` nightly + WAL archiving; media replicated to a second provider if renders are irreplaceable.

### Email
- **Now:** Resend (free 3,000/month) for lead confirmations and internal notifications; domain verified with SPF/DKIM. Human mail stays on Google Workspace.
- **Later:** Resend Pro $20 (50k). Transactional volume here is tiny; you will not hit it soon.

### Telegram
- **Now:** long polling from the worker (works from a laptop and from the VPS, no public URL needed). Approval workflow, notifications, daily brief, channel publishing.
- **Later:** switch to a webhook for lower latency at scale (Caddy already terminates TLS). Local Bot API server only for >50 MB media through Telegram.

### Social publishing APIs
- **Now:** Meta Graph API for your own Facebook Page + Instagram Business (Standard Access, no App Review), Telegram channel. Non-expiring Page token.
- **Next:** LinkedIn Community Management (Development tier is enough; needs a registered business + vetting), YouTube Data API (uploads private until the compliance audit; fine for Shorts you make public in Studio).
- **Later / alternative:** a unified API (Zernio: first 2 accounts free, then $6/account; Upload-Post free 10 posts/month, $24; Post Bridge ~$29–34) when you want TikTok, public YouTube without audit, or to publish for partners' pages. Ayrshare ($149+) only if you become an agency.

### AI
- **Now:** Claude Opus 5 for post copy and rewrites (a post costs ~$0.03; 100 posts/month ≈ $3). Set `ANTHROPIC_MODEL=claude-sonnet-5` (~$0.006/post) or `claude-haiku-4-5` (~$0.003) to reduce further. Gemini Flash as fallback.
- **Later:** image generation for creatives (~$0.04/image), AI-assisted lead replies. No infrastructure change.

### Authentication and security
- **Now:** email + bcrypt password, hashed session tokens, HttpOnly cookies, share links with 96-bit tokens, expiry, passcodes, rate limits, security headers, Cloudflare in front.
- **Later:** passkeys/TOTP for admins (SimpleWebAuthn, free), Cloudflare Access on `/admin` (free for ≤50 users), role-based access when partners log in (KitchenPro self-service).

### Analytics
- **Now:** built-in first-party events (page views, CTA, forms, portal opens, SMM output) — no consent banner, no third-party scripts, data stays in your DB.
- **Later:** Plausible cloud $9/month or self-hosted Umami on the same VPS if marketing needs funnels/UTM dashboards beyond the admin; keep first-party for portal tracking.

### Monitoring and logging
- **Now:** UptimeRobot (free, 5-minute checks on `/api/health` and `/`), Docker logs with rotation, Telegram daily brief acts as a heartbeat.
- **Later:** Sentry (errors, $26 Developer) and Grafana Cloud free (metrics/logs) when more than one person deploys.

### Domain and SSL
- **Now:** Cloudflare DNS (free), proxied; Caddy auto-TLS on the VPS (Let's Encrypt), Cloudflare "Full (strict)". Renewals are automatic — the `live.architeksoft.com` certificate expiring on 17 July 2026 is exactly the failure this removes. Add an UptimeRobot SSL-expiry alert for every subdomain.

### Pixel Streaming
- **Now:** keep the existing AWS backend; instances start on demand and stop after inactivity; quotas per link. Idle cost ≈ $0 (stopped instance + EBS ~$8/month). A 1-hour session ≈ $0.75 + egress (~$0.3–0.6/h at 1080p).
- **Business rule:** sell Live 3D as **hours inside business packages** (e.g. 10 h/month in Showroom+), never unlimited; the dashboard shows used/limit hours per link.
- **Switch when:** you need many parallel sessions or no ops: Vagon Streams (per-minute, REST API creates per-visitor links, $1.5–2.8/h) — ideal for irregular demos; Streampixel (€99/month flat, 2 concurrent) — ideal if a showroom runs it daily; an AWS auto-scaling group only if you have someone to operate it.

### Background workers and scheduled jobs
- **Now:** in-process worker (60-second scheduler + Telegram polling). Restart-safe: pending approvals and schedules live in the DB.
- **Later:** `worker` compose profile (already defined) to move it to its own container; Redis + BullMQ ($5 Redis) only if jobs become long (video transcoding, bulk exports).

### Image and video processing
- **Now:** sharp for thumbnails/posters/resizes (fast, native), ffmpeg-static for video thumbnails/duration.
- **Later:** Cloudflare Stream ($1 per 1,000 minutes stored + $1 per 1,000 minutes delivered) if client videos are watched a lot; or transcode to 720p/1080p H.264 in the worker to cut bandwidth.

## 3. Migration thresholds at a glance

| Signal | Action |
|---|---|
| Uploads > 50 GB or video views > 1 TB/month | Move media to R2 + CDN domain |
| Second admin/office or partners logging in | Postgres + roles + passkeys |
| Sustained CPU > 70% / RAM > 6 GB | Bigger VPS (CAX31 €15) or split worker |
| More than ~10 Live 3D hours/month with irregular demand | Vagon Streams; > 60 h/month steady → Streampixel or reserved AWS |
| Posting for partner pages / TikTok needed | Unified publishing API |
| > 3,000 emails/month | Resend Pro |
| More than one developer deploying | Sentry + staging environment (`new.` subdomain already planned) |

## 4. Monthly cost scenarios

| Scenario | Items | ≈ $/month |
|---|---|---|
| **Start (now)** | Hetzner CAX21 €10.49, Cloudflare free, Resend free, R2 backups ~$1, AI ~$3, domain amortised $1 | **≈ $18** |
| Start + Live 3D demos (10 h) | + AWS g4dn 10 h ≈ $8 + egress ≈ $5 + EBS $8 | ≈ $40 |
| Growth (Studio partners, 100s of client pages, 100 GB media) | CPX32 €35, R2 $3, Postgres managed $15, Resend Pro $20, Sentry $26, Vagon 40 h ≈ $80 | ≈ $190 |
| Scale (KitchenPro self-service for makers) | 2× VPS + LB $60, Postgres $25, R2 $10, unified social API $24, monitoring $40, streaming 100 h ≈ $200 | ≈ $360 |

## 5. What to buy this week (in order)

1. Hetzner VPS + Cloudflare DNS for `new.architeksoft.com` (staging with real data).
2. Telegram bot (free) and Anthropic key.
3. Cloudflare R2 bucket for Litestream backups (cents).
4. Resend account + domain verification.
5. UptimeRobot monitors for `/api/health`, `/`, `live.architeksoft.com` (with SSL expiry alerts).
Everything else waits for the thresholds above.
