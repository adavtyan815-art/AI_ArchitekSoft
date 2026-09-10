# External services, what they need, what they cost (Sept 2026, USD)

| Service | Used for | Setup effort | Cost | Env vars |
|---|---|---|---|---|
| **Anthropic Claude** | Post copy, rewrites | Create API key | ~$0.003–0.03 per post; < $1/mo at your volume (Opus 5 default; Sonnet 5/Haiku 4.5 cheaper) | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Google Gemini (fallback) | Same | API key | Free tier / cents | `GEMINI_API_KEY` |
| **Telegram Bot API** | Approvals, notifications, daily brief, channel publishing | @BotFather → token; send /start; add bot as channel admin | Free | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_CHANNEL_ID` |
| **Meta (Facebook Page + Instagram Business)** | Publishing | Meta app (Standard Access is enough for your own Page/IG when you are the app admin); long-lived user token → non-expiring Page token; IG professional account linked to the Page | Free | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_USER_ID` |
| **LinkedIn** | Company-page publishing | Community Management API access form (registered business, business e-mail, page super-admin verification); 60-day tokens | Free | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN`, `LINKEDIN_API_VERSION` |
| **YouTube Data API** | Video/Shorts upload | Google Cloud project, OAuth consent (sensitive scope), refresh token; compliance audit for public uploads | Free (quota 10k units/day; 100 uploads/day) | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` |
| TikTok | — | Audited app required; kept manual | Free | — |
| Unified alternative | Instead of native LinkedIn/YouTube/TikTok | Sign-up | Zernio: 2 accounts free, then $6/account/mo · Upload-Post: free 10 posts/mo, $24/mo · Post Bridge ~$29–34/mo · Ayrshare $149/mo | (adapter to add) |
| **live.architeksoft.com** (your backend) | Creating Live 3D instances | Admin username/password of that backend | AWS g4dn.2xlarge ≈ $0.75/h + egress $0.09/GB while running; MongoDB Atlas free tier | `LIVE_BACKEND_URL`, `LIVE_ADMIN_USERNAME`, `LIVE_ADMIN_PASSWORD` |
| Managed pixel streaming (optional) | Replace self-managed AWS | Vagon Streams REST API | $0.025–0.047/min + $0.67/day app hosting; Streampixel €99/mo flat (2 CCU) | — |
| Resend (optional) | E-mail notifications | API key + verified domain | Free 3,000/mo | `RESEND_API_KEY`, `NOTIFY_EMAIL_*` |
| **Hosting** | App + worker + files | VPS with Docker | Hetzner CAX21 €10.49/mo (8 GB) or CPX22 €19.49; DigitalOcean $24; + Cloudflare free | see `08_DEPLOYMENT.md` |
| Object storage (optional) | Videos at scale, backups | Cloudflare R2 bucket + token | $0.015/GB-month, **$0 egress** | (Litestream config in `deploy/`) |
| Domain / DNS | `architeksoft.com` | Cloudflare (free plan) | ~$0 | — |
| Analytics (optional) | Second opinion next to built-in | Plausible cloud $9/mo or self-hosted Umami free | | — |

**Total at low usage:** ≈ $16–25/month for everything except GPU streaming; add ≈ $50/month per 20 hours of Live 3D sessions.

## Setup guides (short)

### Telegram (10 minutes)
1. Telegram → @BotFather → `/newbot` → copy the token into `.env` (`TELEGRAM_BOT_TOKEN`), restart.
2. Open your bot, press **Start**, then send `/setadmin` (first time) or `/chatid` and paste the id into Settings → Telegram.
3. Optional channel: create a channel, add the bot as admin with "Post messages", put `@channelname` into `TELEGRAM_CHANNEL_ID`.
4. Settings → Telegram → **Send test message**.

### Meta (Facebook + Instagram) (30–60 minutes)
1. developers.facebook.com → create an app (Business) → add *Facebook Login for Business*; you are the admin.
2. Graph API Explorer → permissions `pages_show_list, pages_read_engagement, pages_manage_posts, publish_video, instagram_basic, instagram_content_publish` → generate a user token → exchange for a long-lived token → `GET /me/accounts` → take the **Page access token** (does not expire) and Page id.
3. `GET /{page-id}?fields=instagram_business_account` → IG user id.
4. Put `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_USER_ID` in `.env`. Instagram fetches media by URL, so `APP_URL` must be public HTTPS.

### LinkedIn (days; vetting)
Apply for the Community Management API (Development tier is enough for your own page), authorise `w_organization_social`, get the organization URN (`urn:li:organization:<id>`), 60-day token; re-authorise every ~50 days (the daily brief can remind you).

### YouTube (1–2 hours + audit)
Google Cloud → enable YouTube Data API v3 → OAuth client (Desktop) → consent screen in *production* → get a refresh token with scope `youtube.upload` via the OAuth playground → `.env`. Uploads are **private** until the API compliance audit passes; set `YOUTUBE_PRIVACY=private` meanwhile and flip in Studio.

### Anthropic
console.anthropic.com → API key → `ANTHROPIC_API_KEY`. Model default `claude-opus-5`; set `ANTHROPIC_MODEL=claude-sonnet-5` or `claude-haiku-4-5` to reduce cost further.
