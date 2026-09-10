# Client website

> v2 (10 Sept 2026): positioning corrected (we do not make or sell furniture), Web Viewer section and `/viewer` page added, packages restructured (Pilot / Studio / Showroom+; Decision package), design system v2 with light/dark modes and mobile-first layouts. Details in `12_OFFERS_AND_POSITIONING.md`.

## Goals

- A visitor understands **in ten seconds** what ArchiTek Soft does, whether it is for them, and what to do next.
- KitchenPro is the headline; other solutions are one clear section, not competing headlines.
- B2B and B2C each get their own door, promise, proof, and form.
- Armenian first, Russian and English complete. Calm, minimal, professional; the work speaks.

## Information architecture


## Information architecture (v3 — multi-page)

The site is a multi-page corporate/product website, not a single long landing page. The homepage is a compact entry point
that answers "what is this, who is it for, where do I go" and hands the visitor to a dedicated page. Detail lives once,
on its own page, and is never repeated on the homepage.

```
Header:  KitchenPro · Solutions ▾ · How it works · Work · About · Contact · [hy/ru/en] [theme] [Start]
         Solutions ▾  →  For business · For home · Web Viewer · Live 3D · Other industries
Footer:  Solutions (KitchenPro + the five above) · Company (How it works, Work, About, FAQ, Contact, Privacy) · Contact

/                 entry point (hero, proof, KitchenPro intro, B2B/B2C doors, Viewer/Live entry, 3 works, where next)
├── /kitchenpro   the product
├── /for-business B2B offer + packages            ─┐
├── /for-home     B2C journey                      │ "Solutions" group
├── /viewer       Web Viewer demo (interactive 3D) │
├── /live-3d      Live 3D premium demo             │
├── /solutions    other industries                ─┘
├── /how-it-works process, timeline, what you need
├── /portfolio    works (+ /portfolio/[slug])
├── /about        company
├── /faq          questions
├── /contact      channels + short form
└── /start        intake wizard
```

Rules applied: one H1 per page; every homepage block ends with a link to its dedicated page; the interactive 3D demo is
loaded only on `/viewer` (and project pages), the homepage shows a poster card instead; FAQ content is shared between
`/faq` and the dictionaries (single source).

| URL (hy) | ru / en | Purpose | Primary CTA |
|---|---|---|---|
| `/` | `/ru`, `/en` | **Compact entry point** (6 short blocks): what ArchiTek Soft is + value + before/after, proof strip, KitchenPro intro (3 pillars → /kitchenpro), B2B / B2C doors, Web Viewer + Live 3D entry cards, 3 featured works, "where next" links + contact | Start a project / Try the Web Viewer |
| `/kitchenpro` | | The maker platform: problem → solution, 8 capabilities, workflow 0–6 (the maker produces), B2B/B2C views, honest status | Discuss your project |
| `/viewer` | | Web Viewer: live demo (rotate, colour swatches, AR), features, Web Viewer vs Live 3D table | Get my Web Viewer link |
| `/for-business` | | B2B: pains, offer, how we start (pilot), packages (Project / Studio / Factory) | Order a pilot project |
| `/for-home` | | B2C: benefits, 4 steps, what you need, price note | Start in 5 minutes |
| `/solutions` | | Real estate, showrooms, AR/VR, custom software | Discuss your case |
| `/how-it-works` | | 4 stages with outputs, timeline, **what you need** checklist, comparison vs standard render | Start |
| `/portfolio`, `/portfolio/[slug]` | | Real projects with gallery, video, live link | Start |
| `/contact` | | Telegram / WhatsApp / phone / e-mail + short form (B2B/B2C toggle) | Send |
| `/start` | | **Intake wizard** (4 steps): Who → Project → Files → Contact | Send request |
| `/live-3d` | | Live 3D (Pixel Streaming) as a premium B2B demo: who it is for, how a session works, quota/pricing note, link to compare with Web Viewer | Book a Live 3D demo |
| `/about` | | Who we are, what we do (and do not do), approach, technology, key facts | Contact |
| `/faq` | | All questions (home FAQ + extended), sticky contact card | Start a project |
| `/privacy` | | Privacy note | — |

Header: KitchenPro · For business · For home · Other solutions · Work · How it works · Contact · language switch · **Start a project**.

## Customer journeys

### B2C (household ordering a kitchen)
1. Lands from Instagram/Facebook reel or search → home hero → "I'm ordering a kitchen".
2. `/for-home`: sees benefits (true scale, choose yourself, AR in my room, clear price), 4 steps, checklist of what to send.
3. `/start?segment=b2c`: room type, approximate dimensions, style, appliances, budget bracket, deadline → photos/sketch upload → phone + preferred channel → done in 5 minutes. Gets a request number and a link to the portfolio while waiting.
4. You receive the lead in Telegram and the admin; call/Telegram within 15 minutes (promise on the site).
5. Within 24–48 h you send the **client page**; the client explores, comments, approves from the phone.

### B2B (furniture maker, showroom, studio, developer)
1. Lands from LinkedIn/referral → "I make furniture" or `/for-business`.
2. Reads pains → offer → **pilot project** (one real order → 3D link + cut list in 48 h) → packages.
3. `/start?segment=b2b`: company, type, volume per month, service of interest, message → contact.
4. Lead tagged B2B; company + contact created on conversion; project stages track the pilot; the client page becomes *their* customer's page (branding toggle is on the roadmap).

## Copy principles (applied in the dictionaries `src/lib/i18n/*.ts`)

- Short sentences, one idea each. No hype words, no invented numbers.
- Verbs over nouns: See · Choose · Build. Send · Get · Approve.
- Every section ends with one action.
- Technology (Unreal Engine 5, Blum, EGGER) appears as proof, never as the headline.
- The visitor never has to read to know what to do: the next step is always a button.

## Design system

- Tokens in `src/app/globals.css` (`@theme`): warm paper background, near-black ink, one brand blue, rounded-2xl cards, soft shadows, Inter + Noto Sans Armenian.
- Utilities: `container-x`, `card`, `eyebrow`, `h-display`, `h-section`, `lead`, `btn-primary/secondary/brand/ghost`, `input`, `label`, `badge`.
- Components: `src/components/ui.tsx` (Button, ButtonLink, Card, Badge, Field, Input, Select, Textarea, SectionHeading, CheckList, Empty), `src/components/site/*` (header, footer, contact channels, before/after slider, FAQ, portfolio grid, lightbox, forms, wizard, tracking).

## Content you can change without code

- Brand data (phones, Telegram, e-mail, address, hours, social links): Admin → Settings → Brand.
- Portfolio items: Admin → Portfolio (trilingual title/summary, category, images, video, live link, featured).
- Page copy: edit `src/lib/i18n/hy.ts` (and ru/en). Keys are grouped by page.

## SEO & sharing

- Per-locale metadata and `hreflang` alternates, `robots.txt`, `sitemap.xml`, Open Graph image (`/brand/share.jpg`).
- Suggested next: named case studies, a "cut list / CNC" landing page in hy/ru, Google Business Profile, directory listings (see research).

## Measuring

Built-in analytics (Admin → Analytics): page views, unique visitors (daily-rotating hash), CTA clicks, form starts/submits, conversion, sources (referrer/UTM), locales, B2B vs B2C submissions. Use UTM links in social posts (`?utm_source=instagram&utm_campaign=aren`) — the SMM composer can add them.
