# Research findings (9 September 2026)

Legend: **[V]** verified directly · **[S]** secondary source · **[U]** could not verify.

## 1. The repository (`D:\ArchiTek_Soft\AI_ArchitekSoft`)

| Folder | What it is | State |
|---|---|---|
| `website/` | The **live.architeksoft.com** backend: Node/TypeScript/Express + Socket.io + MongoDB Atlas + AWS SDK. Creates per-client Pixel Streaming *instances* (EC2 g4dn.2xlarge), with display/real hour quotas, expiry dates, heartbeat and 60-second grace period, admin panel (`admin.html`), Docker + nginx with Let's Encrypt. Client link shape: `https://live.architeksoft.com/?instanceUuid=<uuid>` → launcher page → `player.html` on the EC2 IP. | Working in production. `.env` holds real AWS keys (git-ignored). Login compares the password in plain text against `ADMIN_PASSWORD_HASH` (not hashed). |
| `dashboard/` | Local Express prototype (port 3456): projects → client "portals" (`/p/:slug`), Gemini copy generation for 4 platforms, Sharp poster generator (3 styles), Facebook publish stub, posts calendar. | Prototype; a Gemini key is hard-coded in `server.js` (committed). |
| `landing_page/` | New multi-page static site (hy/ru/en): glassmorphism dark/light theme, WebGL configurator, before/after, videos. | Uncommitted edits; served by `dashboard/server.js`. |
| `carrd_raw_archive/` | Export of the **current production site** (Carrd). | Reference. |
| `media_library/` | Real assets: 3 renders (WD1-3), hand sketch, preview video, `Aren.pdf` (production drawings), logo. | Reused as demo data here. |
| `docs/` | `PROJECT_CONTEXT.md` (4-pillar pipeline, B2B authority positioning, Armenian language), `ARCHITECTURE.md`, `10_KitchenPro_ProductSpec.md` (the full product/business spec). | Foundation of this work. |

**KitchenPro spec in one line:** design once with real materials and hardware; the same model produces what the customer needs to decide (3D, configuration, price) and what the workshop needs to build (drawings, cut list, edge banding, drilling, nesting, BOM, purchase lists) with the workshop's own production standard. Stages 0–6 from request to handover. Users: makers (B2B), their customers (B2C), suppliers.

## 2. The live website (architeksoft.com) [V]

- Carrd export; sections: hero "Your idea — accessible on any device", Why choose us, Team/Vision/Mission, Trusted-by logos (unlabeled), Digital solutions, **ArchiTek Kitchen** (furniture stores: try colours, open drawers, select modules), **ArchiTek Real Estate**, Custom solutions, Contact (041 184909 / 098 484909, Telegram @ArchiTek_Soft, WhatsApp, email).
- **Missing:** pricing/packages, an order form (button points to `#`), demo link, video embeds, named case studies, FAQ, blog, SEO basics, any mention of KitchenPro / CNC / Unreal Engine.
- **Bugs:** e-mail link is `https://architeksoft@gmail.com`; "Showcase your future project" → `architekmain.carrd.co` → 404.
- **live.architeksoft.com:** TLS certificate **expired 17 Jul 2026**; the page is the instance launcher ("ՄՈՒՏՔ 3D ՍՐԱՀ").

## 3. Public presence [V unless marked]

| Channel | Facts |
|---|---|
| LinkedIn `/company/architek-soft` | "The Future is in Our Code", Software Development, 2–10 employees, HQ 12 Shinararneri str, Vanadzor; **1,068 followers**; recent posts about AWS Activate delays and GPU pixel-streaming infra. Strongest channel. |
| YouTube `@ArchiTekSoft` | 30 subscribers, 76 videos, 9–84 views each; series "Wood Dreams", "Amur prof", an Armenian step-by-step 3D kitchen guide. Right content, no distribution. |
| Instagram `@architek_soft` | 133 followers; Armenian captions, English hashtags; feed looks ~1 year stale [U exact dates]. Bio says "demo via DM" (friction). |
| Facebook `/ArchiTekSoft` | Exists ("ArchiTek Soft \| Vanadzor"); details behind login wall. |
| Telegram `t.me/ArchiTek_Soft` | A personal account, not a channel. |
| Directories / news / app stores / GitHub | Nothing. Severe name collision in search ("Architek" = unrelated companies in JP/RU/CA). |

## 4. Competitors and analogues [S]

- **Desktop furniture CAD** bought by Armenian workshops: Bazis-Mebelshik (≈90–260k ₽ per seat, perpetual), PRO100 (≈35–60k ₽; vendor suspended sales to Russia → grey market), K3-Мебель (65k ₽), KitchenDraw (€3.90/h), Polyboard/OptiCut ($2.8–5.3k), Mozaik ($125–325/mo), Cabinet Vision (from ≈$195/mo), Cabinet Planner ($70 once).
- **Web configurators for sellers:** BPlanner (4,430 ₽/mo, embeddable, exports to Bazis/CNC) — the closest analogue to "ArchiTek Kitchen as a product"; Planoplan (1,890–3,590 ₽/mo); Roomle/Threekit (enterprise, €850+/mo).
- **Armenia:** no local company offers an online 3D kitchen configurator or pixel-streamed showroom. Kitchen makers (Futura, ORDER Kitchen, Grigoryan, Domus, Best Style) advertise manual "3D project by designer" — they are **customers**, not competitors. Render studios sell static images only.
- **Pixel streaming cost benchmarks:** Vagon $0.025–0.047/min, Eagle 3D $0.10/min, Arcware ≈€0.15/min; a 15-minute client session ≈ $0.40–2.25 of GPU time. Self-managed g4dn.xlarge on-demand $0.53–0.66/h + egress $0.09/GB.

## 5. Social publishing feasibility (for a solo business)

| Platform | Own-account feasibility | Approval hurdle | Notes |
|---|---|---|---|
| Telegram channel | Very easy | None | Also the approval/notification hub. Free. |
| Facebook Page | Easy | None for your own page (Meta Standard Access when the token owner is an app admin) | Non-expiring Page token. |
| Instagram Business | Easy–medium | Same as Facebook | Media must be **JPEG on a public HTTPS URL**; 50–100 posts/24h. |
| LinkedIn company page | Medium–hard | Community Management API vetting (legal entity, business e-mail) | 60-day tokens. Personal profile posting is self-serve. |
| YouTube | Medium | OAuth verification + API compliance audit; otherwise uploads are **private** | Shorts = vertical ≤60 s + #Shorts. |
| TikTok | Hard | Full app audit; unaudited posts are private | Kept manual in this system. |
| Unified APIs | — | They hold the approvals | Zernio (2 accounts free, then $6/acct), Upload-Post (free 10/mo, $24), Post Bridge (~$29+), Ayrshare ($149+). |

AI copy cost is negligible (a 300-token post ≈ $0.003–0.006).

## 6. Hosting (from the research report, USD, Sept 2026)

- **VPS:** Hetzner CAX21 (4 Arm/8 GB) €10.49, CPX22 €19.49; DigitalOcean $24 (2/4 GB); Lightsail $12–24. Vercel cannot run the worker and limits uploads to 4.5 MB → not suitable as-is.
- **Object storage for videos:** Cloudflare R2 $0.015/GB, **$0 egress** (best); Backblaze B2 $0.007/GB.
- **Managed pixel streaming:** Vagon Streams (per-minute, REST API for per-visitor links) is the best fit if you outgrow the self-managed AWS setup; Streampixel €99/mo flat for steady use.
- **Analytics:** built-in first-party here; Plausible ($9/mo) or self-hosted Umami if you want a second opinion.
- **Estimated monthly cost at low usage:** ~$16–25 without streaming; ~$65–75 with 20 h/month of pixel streaming.

## 7. Ten recommendations that shaped the design

1. Two clear doors: **B2B (makers, showrooms, developers)** and **B2C (households)**; stop the "digital solutions for everyone" catch-all.
2. Name the outcome, not the tech: "See the kitchen in 3D before it is built" — UE5/pixel streaming as proof below the fold.
3. Publish packages (Project / Studio / Factory) even without hard prices; add prices when ready.
4. Fix funnel basics first: intake form, correct e-mail link, dead links, renew the `live.` certificate.
5. Put a self-serve demo on the home page (public tokenised Live link with a small quota) and an AR demo.
6. Turn anonymous logos into named case studies with permission ("Wood Dreams", "Amur prof").
7. Own the cut-list/CNC angle in Armenian and Russian — nobody in the region markets it.
8. Fix SEO collision: always "ArchiTek Soft Armenia" / "KitchenPro"; register on spyur.am, list.am, EIF/VTC, Google Business Profile.
9. SMM by channel: LinkedIn (EN, B2B), Instagram/Facebook (HY+RU, reels of link → configurator → cut list), YouTube guides re-cut into Reels; convert the Telegram account into a channel.
10. Lead with B2B economics of streaming (cost per client session ≈ price of a brochure) and an embeddable widget for showroom websites as the recurring-revenue product.
