# Roadmap

Everything below lives on branch `claude`, in `claudearchitekweb/`. Nothing here has touched the production website.

## Done in v1 (the first build)
- Trilingual client website with KitchenPro focus, B2B/B2C journeys, intake wizard, contact, portfolio, solutions, how-it-works, privacy, analytics, SEO basics.
- Client pages with Live 3D / Web 3D / AR / gallery / video / PDF / approvals and tracking.
- Admin: overview, leads (list + board), clients, companies, projects with KitchenPro stages, tasks, media library with thumbnails and poster generator, client pages manager, Live 3D integration, SMM studio (composer, editor, scheduling, Telegram approval, publishing adapters, logs), analytics, settings, portfolio management.
- Worker: scheduler, Telegram bot (approve/edit/postpone/skip, chat detection, status, daily brief), notifications for leads and client feedback.
- Docs, Docker deployment, one-click local start, demo seed with real assets.

## Done in v2 (10 Sept 2026)
- Positioning corrected everywhere (not a furniture seller/maker); Web Viewer default, Live 3D premium.
- Design system v2, light/dark modes, mobile-first layouts, Armenian admin.
- `/viewer`, `/v/<slug>`, home Web Viewer demo.
- Performance: Turbopack dev, image pipeline, payload trimming, lazy charts, DB tuning, caches (see `13_PERFORMANCE.md`).
- Infrastructure plan with costs and thresholds; proposed B2B/B2C offers.

## Done in v3 (design)
- The "Atelier" design system replaced the generic v2 visual layer across the public site, the admin, the client portal and the Web Viewer: paper/graphite palette with one oxide accent, serif display type, hairlines and index numbers instead of boxed cards, media in captioned frames (`14_DESIGN_SYSTEM.md`).

## Done in v4 (17 Sept 2026)
- **Local file inbox**: a drop folder on the PC (`data/inbox/`, moved with `INBOX_DIR`) becomes a suggested post — texts per platform, media attached, a slot proposed, suggested in Telegram and on the Inbox panel of Admin → Social media. Imported only after 30 seconds of quiet, scanned by the worker every 60 seconds, also runnable as `npm run inbox`; originals are moved to `_imported/` or `_failed/`, never deleted (`15_INBOX_WORKFLOW.md`).
- **Owner guide for the first test post** — dry run today, then what each platform needs to go live (`16_FIRST_TEST_POST.md`).
- **Quality pass over the whole system**, code and interface, at desktop and phone sizes in all three site languages and both admin languages; every confirmed defect fixed or recorded with a reason. Report: `17_QA_AUDIT_2026-09.md`. The visible changes:
  - branded, translated 404 for unknown addresses; a mistyped admin URL stays inside the admin shell;
  - expired or deactivated client links answer **410 Gone** while still showing their own "no longer available" card;
  - a file that belongs to a private client page is served only to someone holding that link, and a failed access check now denies instead of allows;
  - a Content-Security-Policy on every response, built per request;
  - admin lists on a phone are one tappable row per record (leads, clients, companies, projects, client pages, portfolio) instead of a multi-line card;
  - 40 px minimum tap targets, money that no longer breaks mid-currency, readable revenue axis ticks, inline validation messages on every admin form, and no "publish now" on a post with every platform switched off.
- **Deployment story for the drop folder**: `INBOX_DIR` inside the container, `INBOX_HOST_DIR` bind-mounted from the host, documented in `08_DEPLOYMENT.md` and `deploy/.env.production.example`.
- Verified against a production build (`next build` + `next start`): type check, lint and build clean, 96 public and 175 admin page loads plus 80 portal checks with no server error, no console error, no hydration error and no sideways scrolling at 390 px.
- Every document in `docs/` and the README brought in line with the code.

## Next 2 weeks (you)
1. Run locally, click through with real project data; edit copy in `src/lib/i18n/hy.ts` where you want different wording.
2. Do the first test post as a **dry run**, both ways — composer and inbox — following `16_FIRST_TEST_POST.md`. Nothing leaves the machine while no platform is connected.
3. Create the Telegram bot (`TELEGRAM_BOT_TOKEN`), bind your chat (Settings → Telegram → "Detect chat"), and run one full approval cycle: schedule → bot message → Approve & publish.
4. Add `ANTHROPIC_API_KEY` if you want the AI to write the copy; without it the built-in trilingual templates do, and the composer says which one is in use.
5. Replace demo portfolio with 5–6 real projects (with client permission), add named case studies.
6. Decide packages/prices for the B2B page (placeholders today).
7. Renew the `live.architeksoft.com` certificate; rotate the committed Gemini key.

## Platform credentials (the step between dry run and real publishing)
Nothing here is code work — it is accounts, apps and tokens. Each platform is independent: a connected one publishes, the rest keep simulating. Names are the environment variables in `.env`; `16_FIRST_TEST_POST.md` says where to obtain each one.

| Platform | Needs | Notes |
|---|---|---|
| Telegram — approvals | `TELEGRAM_BOT_TOKEN` + an admin chat id (`TELEGRAM_ADMIN_CHAT_ID`, or Settings → Telegram → "Detect chat") | Do this one first: it is free and it is how you approve everything else. |
| Telegram — channel | `TELEGRAM_CHANNEL_ID` | Independent of the approval chat; the bot must be an administrator of the channel. |
| Facebook | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` | Meta app review for page publishing. |
| Instagram | `META_IG_USER_ID` + the same `META_PAGE_ACCESS_TOKEN` | Also needs `APP_URL` to be a real public https address: Instagram fetches the media by URL, so it cannot work from localhost. |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN` | The URN must be the literal `urn:li:organization:<numeric id>`; a placeholder is rejected on purpose so the app never believes it is connected. `LINKEDIN_API_VERSION` defaults to `202606` and has to be bumped roughly once a year. |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | `YOUTUBE_PRIVACY` defaults to `private`; an unverified Google Cloud project keeps uploads private whatever you set. |
| TikTok | — | By design it never publishes automatically: unaudited API posts stay private, so the system only prepares the caption and you upload by hand. Its status permanently reads "manual". |

## Domain and go-live
1. Rent the VPS, point `new.architeksoft.com` at it, set `SITE_HOST` (Caddy requests the certificate for it) and `APP_URL` to the real https address.
2. Set a real `APP_SECRET` (32+ random characters) and an `ADMIN_PASSWORD` of 12+ characters — on a server the app refuses to create the owner account with a missing, placeholder or default password.
3. Create the host drop folder (`INBOX_HOST_DIR`) before the first `docker compose up`, so the bind mount does not create it as root.
4. Put `deploy/backup.sh` on a host cron.
5. Run through `08_DEPLOYMENT.md`'s go-live checklist, live with `new.architeksoft.com` for a while, then switch DNS.

## Next 1–2 months (build)
- Client page branding per B2B partner (their logo/colours on the pages they send to their customers).
- Public demo Live 3D link with a small quota on the home page; a USDZ model next to the GLB on `/demo/ar` for iOS Quick Look (the AR demo itself is live, and projects already carry both model roles).
- Auto-draft a showcase post when a project reaches "handover".
- E-mail sequences for leads (Resend): confirmation to the client, reminder if no answer in 48 h. Today `RESEND_API_KEY` only sends *you* the inbox suggestion; nothing is e-mailed to a client.
- 2FA for admin; multiple admin users with roles (the users table already carries `owner | manager | viewer`, but there is no user management screen).

## Known remaining items from the quality pass
Small, deliberate leftovers — recorded so they are not rediscovered as surprises.
- A few links on a phone are still under the 40 px tap-target minimum: the header wordmark (34 px, every page), two in-content arrow links on the home page (22–23 px), and the AR viewer's own control buttons (36 px, inside the third-party model component). The footer, which was the reported defect, is fixed.
- On a 404 page the language switcher prefetches the same address in the other two languages, which are 404 as well. Harmless — it only shows as two "failed to load resource" lines in the browser console, on that page.

## Later (product)
- KitchenPro self-service portal for makers (workshop standard, price lists, publishing configurable versions to their customers) — the schema (companies, contacts, projects, links) is ready to grow into it.
- Quotation editor (line items from the model, customer vs internal versions) and deposit payments (Idram/ArCa/Stripe).
- Machine exports (cut list CSV/DXF) attached to projects automatically from the design tool.
- Postgres + object storage when volumes require it; multi-tenant mode.
