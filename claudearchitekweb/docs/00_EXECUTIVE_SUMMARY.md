# Executive summary

**Date:** 10 September 2026 (v3) · **Branch:** `claude` · **Folder:** `claudearchitekweb/`

## Corrected positioning (v2)

ArchiTek Soft **does not sell or manufacture furniture**. It helps furniture makers, showrooms and their customers choose colours, materials, form and configuration with confidence in interactive 3D, before production. The **Web Viewer** link is the default deliverable for every client; **Live 3D (Pixel Streaming)** is a premium B2B presentation with a time quota. Every page, package and CTA was rewritten with this in mind (see `12_OFFERS_AND_POSITIONING.md`).

## What changed in v3 — design

The v2 visual layer was audited page by page (screenshots in light/dark, desktop/mobile) and judged generic: blue SaaS accent, rounded white cards with icon squares everywhere, one centred column, small imagery. It was replaced by a coherent design system, **"Atelier"** (`14_DESIGN_SYSTEM.md`): warm paper / graphite palette with one oxide accent, serif display type (Source Serif 4 + Noto Serif Armenian) over a grotesk body and mono details, hairlines and index numbers instead of boxes, media in captioned frames with corner marks, material swatches, a monochrome wordmark, restrained motion. The public site keeps its multi-page structure with a compact homepage; the admin, client portal and Web Viewer were restyled with the same tokens.

## What changed in v2

- Design system rebuilt: semantic tokens, Manrope + Inter + Noto Sans Armenian, intentional **light and dark modes** (toggle in header/admin, cookie + system preference), stronger hierarchy and spacing, mobile-first layouts (sheet menu, sticky CTA bar, card-style tables in the admin, bottom tab bar).
- **Admin in Armenian** by default (English switch in the top bar), plain wording for CRM, projects, clients, SMM, analytics, settings, tasks, media, client pages.
- **Web Viewer**: interactive demo on the home page and `/viewer` (rotate, colour swatches, AR), per-project `/v/<slug>` viewer, client page primary action.
- **Performance**: Turbopack dev, image optimisation, trimmed client payloads, lazy charts, SQLite tuning, caches; measured before/after in `13_PERFORMANCE.md`.
- **Infrastructure plan** with costs and migration thresholds: `11_INFRASTRUCTURE_PLAN.md`.

## What was asked (v1)

A complete, testable web ecosystem for ArchiTek Soft: a simple, beautiful, professional client website that presents the platform (internally powered by the KitchenPro tool, which is never named publicly) first (with a clear B2B / B2C split and a separate section for other business solutions), plus a private dashboard with client analytics (companies vs individuals), CRM, order/project management, render/video upload, individual client links, Pixel Streaming links, and a sales + SMM automation system with Telegram approval before publishing.

## What was built

One Next.js application (TypeScript, SQLite) that runs locally with a double-click and deploys to a small server with Docker. Nothing touches the production website until you decide.

**Client website** (Armenian default, Russian, English)
- Home: one promise ("see the kitchen in 3D before it is built"), proof strip, "Who are you?" split into *I make furniture* (B2B) and *I'm ordering a kitchen* (B2C), KitchenPro in three verbs (See · Choose · Build), three steps, "what you need to start" checklist, other solutions, real portfolio, FAQ, contact.
- Dedicated pages: KitchenPro, For business, For home, Other solutions, How it works, Portfolio (+ detail), Contact, **Start a project** (a 4-step intake wizard with file upload that creates a lead, notifies you in Telegram and shows the client a request number).
- First-party, cookie-free analytics (no consent banner needed).

**Client pages** (`/p/slug?k=token`) — the deliverable a client receives: greeting, project stage, Live 3D button, Web 3D, AR (QR for phone), sketch→3D slider, 4K gallery, video, PDF, materials, and **Approve / Request change / Question** which land in the CRM and in your Telegram. Expiry, passcode, view tracking.

**Admin dashboard** (`/admin`)
- Overview KPIs and charts; global search.
- CRM: leads (list + board), individuals, companies with contacts, activities timeline, tasks, lead → project conversion in one click.
- Projects/orders with KitchenPro stages (request → survey → design → configuration → approval → production prep → production → installation → handover), money fields, deliverable links (Live 3D instance creation against your existing `live.architeksoft.com` backend, viewer URL, AR models).
- Media library: drag-and-drop upload of renders, videos (auto thumbnails, duration), PDFs, GLB/USDZ; assign to projects; branded poster generator (1:1, 4:5, 16:9, 9:16).
- Client pages manager: create, copy, send, expire, see views and actions.
- SMM studio: pick a project and its media → AI writes one core idea and a variant per platform (Facebook, Instagram, LinkedIn, Telegram, YouTube, TikTok) in the chosen language → edit → schedule → at the scheduled time (minus lead time) the bot sends you the post, media and buttons **Approve & publish / Edit / Tomorrow / Skip** in Telegram → after approval it publishes through the platform adapters and reports links back. Daily brief in Telegram at 09:00.
- Analytics: website, CRM funnel, revenue, client-page views, SMM output. Settings: brand, SMM rules, Telegram, integrations status, Live 3D, security.

**Runs without any key.** Add keys progressively: Anthropic (AI copy), Telegram bot (approvals), Meta (Facebook + Instagram), LinkedIn, YouTube.

## Key decisions (and why)

| Decision | Why |
|---|---|
| One Next.js app + SQLite instead of several services | Simplest thing that carries the whole scope; one folder, one process, one backup file. Postgres is a later switch, not a rewrite. |
| Armenian URLs without prefix, `/ru`, `/en` | Matches the current site's audience; clean canonical URLs. |
| B2B and B2C as two explicit doors on the home page | Research showed the current site is a catch-all; the two audiences need different promises, CTAs and forms. |
| KitchenPro as a *service you deliver today* + a *platform you open in stages* | Honest positioning: the spec describes the full platform; today's sales are delivered by your team. |
| Telegram-first approvals and notifications | Free, instant, no approval process, already your channel. Email is optional. |
| Native Meta + Telegram publishing first; LinkedIn/YouTube behind OAuth; TikTok manual | Matches what a solo business can actually get approved (see research). A unified API (Zernio/Upload-Post/Post Bridge) is documented as an alternative. |
| First-party analytics | No cookies, no GDPR banner, portal opens tracked server-side. |

## Things found during the study that need your attention

1. **`live.architeksoft.com` TLS certificate expired on 17 July 2026** — browsers warn before your only interactive demo. Renew (Let's Encrypt auto-renew in the docker-compose there).
2. The current site's e-mail link is broken (`https://architeksoft@gmail.com` instead of `mailto:`), the "Write to us" button points to `#`, and `architekmain.carrd.co` returns 404.
3. A Gemini API key is hard-coded in `dashboard/server.js` and committed to GitHub — rotate it.
4. `website/.env` contains real AWS keys; it is git-ignored (good) — keep it that way and consider IAM roles on the server.
5. Public presence is thin: LinkedIn ~1k followers is the strongest asset; Instagram/Facebook small and stale; YouTube has 76 videos but very few views. The SMM system is designed to fix cadence and consistency, not chase likes.

## Where to go next

Open `docs/09_ROADMAP.md`. Short version: (1) run locally and click through, (2) add your Telegram bot and Anthropic key, (3) connect Facebook/Instagram, (4) deploy to a €10 VPS as `new.architeksoft.com`, (5) switch DNS when you are happy.
