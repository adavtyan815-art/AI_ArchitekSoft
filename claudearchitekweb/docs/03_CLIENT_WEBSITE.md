# Client website

> v3 (17 Sept 2026): the forms, the SEO surface, the 404 answer and the accessibility behaviours are
> described as the code implements them. The positioning correction of v2 stands (we do not make or sell
> furniture); packages are Pilot / Studio / Showroom+ (see `12_OFFERS_AND_POSITIONING.md`), and the visual
> system lives in `14_DESIGN_SYSTEM.md`.

## Goals

- A visitor understands **in ten seconds** what ArchiTek Soft does, whether it is for them, and what to do next.
- The platform (interactive 3D for furniture: choose, present, produce) is the headline; other solutions are one clear section, not competing headlines. **KitchenPro is the name of a third-party tool we use internally and is never presented as our product on the public site.**
- B2B and B2C each get their own door, promise, proof, and form.
- Armenian first, Russian and English complete. Calm, minimal, professional; the work speaks.

## Information architecture (multi-page)

The site is a multi-page corporate/product website, not a single long landing page. The homepage is a compact entry point
that answers "what is this, who is it for, where do I go" and hands the visitor to a dedicated page. Detail lives once,
on its own page, and is never repeated on the homepage.

```
Header:  Platform · Solutions ▾ · How it works · Work · About · Contact · [hy/ru/en] [theme] [Start]
         Solutions ▾  →  For business · For home · Web Viewer · Live 3D · Other industries
Footer:  Solutions (Platform + the five above) · Company (How it works, Work, About, FAQ, Contact, Privacy) · Contact

/                 first screen = statement + showcase; then proof, platform intro, B2B/B2C doors, 3 works, where next
├── /platform     the product (/kitchenpro redirects here, 308)
├── /for-business B2B offer + packages            ─┐
├── /for-home     B2C journey                      │ "Solutions" group
├── /viewer       Web Viewer demo (interactive 3D) │
├── /live-3d      Live 3D premium demo             │
├── /solutions    other industries                ─┘
├── /how-it-works process, timeline, what you need
├── /portfolio    works (+ /portfolio/[slug])
├── /about        company
├── /faq          questions
├── /privacy      privacy note
├── /contact      channels + short form
└── /start        intake wizard
```

Rules applied: one H1 per page; every homepage block ends with a link to its dedicated page; the interactive 3D demo is
loaded only when its showcase tab is opened (and on `/viewer` / project pages); FAQ content is shared between
`/faq` and the dictionaries (single source).

The Armenian site has no prefix, Russian and English are prefixed (`localePath()` in `src/lib/i18n/index.ts`):
`/for-home`, `/ru/for-home`, `/en/for-home`. `/kitchenpro` and `/{ru,en}/kitchenpro` are permanent redirects to
`/platform` (`next.config.ts`).

| URL (hy) | ru / en | Purpose | Primary CTA |
|---|---|---|---|
| `/` | `/ru`, `/en` | **First screen = product console**: the showcase stage (sketch → 3D comparison, Web Viewer, Live 3D walkthrough) with a rail beside it — headline, one paragraph, three mode labels (manual selection only), two CTAs; fullscreen and ← → keys. Then the platform band, B2B / B2C doors, featured works, "where next" links + closing CTA | Start a project / Try the Web Viewer |
| `/platform` | | The maker platform (old `/kitchenpro` URL redirects): problem → solution, capabilities, workflow, B2B/B2C views, honest status | Discuss your project |
| `/viewer` | | Web Viewer: live demo (rotate, colour swatches, reset, AR), features, Web Viewer vs Live 3D table | Get my Web Viewer link |
| `/for-business` | | B2B: pains, offer, how we start (pilot), packages (**Pilot / Studio / Showroom+**) | Order a pilot project |
| `/for-home` | | B2C: benefits, 4 steps, what you need, price note | Start in 5 minutes |
| `/solutions` | | Real estate, showrooms, AR/VR, custom software | Discuss your case |
| `/how-it-works` | | 4 stages with outputs, timeline, **what you need** checklist, comparison vs standard render | Start |
| `/portfolio`, `/portfolio/[slug]` | | Real projects with gallery, video, live link. Category filters are a list of links with `aria-current="page"`, not a tab widget. An unknown slug answers 404 | Start |
| `/contact` | | Telegram / WhatsApp / phone / e-mail + short form (B2B/B2C toggle) | Send |
| `/start` | | **Intake wizard** (4 steps): Who → Project → Files → Contact | Send request |
| `/live-3d` | | Live 3D as a premium B2B demo: who it is for, how a session works, quota/pricing note, link to compare with Web Viewer | Book a Live 3D demo |
| `/about` | | Who we are, what we do (and do not do), approach, technology, key facts | Contact |
| `/faq` | | All questions (home FAQ + extended), sticky contact card | Start a project |
| `/privacy` | | Privacy note | — |
| *(any other address)* | | **404** in the site's own rhythm: eyebrow + code, serif headline, two buttons (home, start) and a hairline index of five places worth going instead | Home / Start a project |

The desktop navigation is shown from 1280 px; between 768 and 1279 px the full-height sheet menu serves it (the six
Armenian items do not fit at 1024 px). The header is transparent at the top of the page and takes the page colour once
scrolled. `/demo/ar` sits outside the locale tree: it is the page a QR code opens on a phone, shows its three language
blocks together and only its controls follow `?lang=hy|ru|en`.

### The 404 answer

There are two boundaries, because an address that matches no route never reaches the `(site)/[locale]` layout:

| File | Answers | Chrome |
|---|---|---|
| `src/app/not-found.tsx` | an address that matches no route at all | brings header, footer and the phone bar itself |
| `src/app/(site)/[locale]/not-found.tsx` | `notFound()` from inside a site page (an unknown portfolio slug) | comes from the layout |

Both render the shared `src/components/site/not-found-view.tsx`. The language comes from the `x-locale` header the
middleware sets from the URL — the same value `<html lang>` uses, so the two can never disagree — and the copy is the
`notFound` block of `src/lib/i18n/{hy,ru,en}.ts`. The status is 404 in all three languages. `/admin` has its own
catch-all inside the admin shell and `/p` / `/v` answer their own 404, so neither reaches this page.

## Customer journeys

### B2C (household ordering a kitchen)
1. Lands from Instagram/Facebook reel or search → home hero → "I'm ordering furniture".
2. `/for-home`: sees benefits (true scale, choose yourself, AR in my room, clear price), 4 steps, checklist of what to send.
3. `/start?segment=b2c`: room type, approximate dimensions, style, appliances, budget bracket, deadline → photos/sketch upload → phone + preferred channel → done in 5 minutes. Gets a request number (with a copy button) and a link to the Web Viewer while waiting.
4. You receive the lead in Telegram and the admin; call/Telegram within 15 minutes (promise on the site).
5. Within 24–48 h you send the **client page**; the client explores, comments, approves from the phone.

### B2B (furniture maker, showroom, studio, developer)
1. Lands from LinkedIn/referral → "I make or sell furniture" or `/for-business`.
2. Reads pains → offer → **pilot project** (one real order → 3D link + cut list in 48 h) → packages.
3. `/start?segment=b2b`: company, activity, projects per month, service of interest, message → contact.
4. Lead tagged B2B; company + contact created on conversion; project stages track the pilot; the client page becomes *their* customer's page (branding toggle is on the roadmap).

`?segment=b2b` / `?segment=b2c` preselects step 1 of the wizard; any other value leaves the step unanswered.
UTM parameters present on the `/start` URL are forwarded with the lead.

## Copy principles (applied in the dictionaries `src/lib/i18n/*.ts`)

- Short sentences, one idea each. No hype words, no invented numbers.
- Verbs over nouns: See · Choose · Build. Send · Get · Approve.
- Every section ends with one action.
- Technology (Unreal Engine 5, Blum, EGGER) appears as proof, never as the headline.
- The visitor never has to read to know what to do: the next step is always a button.

## The two forms

Both write through `POST /api/leads`, which is the only public write path. Nothing is sent to a third party from the
browser.

### Start wizard (`/start`, `src/components/site/start-wizard.tsx`)

Four steps, labelled from `dict.start.stepLabels`: **Who you are → The project → Files → Contact**. Progress is a mono
counter (`Step 01 / 04`) over four rules: done = accent, current = ink, ahead = surface.

| Step | Fields | Notes |
|---|---|---|
| 1 · Who you are | `segment` (b2c / b2b) | Two choice cards with a radio ring; **nothing is preselected** and an instruction line says so. "Next" without a choice shows "Choose one of the options" and focuses the first card. |
| 2 · The project (b2c) | `roomType` (kitchen, wardrobe, living, bedroom, bathroom, office, apartment, other), width / depth / height, style, appliances, `budget` (b1–b4, na), deadline | Dimensions are three numeric inputs with their own labels. |
| 2 · The project (b2b) | company name, activity (manufacturer, studio, retailer, developer, architect, other), projects per month (v1–v4), `service` (kitchenpro, showroom, live, cnc, real_estate, custom), message | |
| 3 · Files | drag-and-drop or picker | Optional. "I have no files right now" is a real full-width secondary button (350 × 44 px on a phone), not a text link. |
| 4 · Contact | name\*, phone\*, **telegram**, email, preferred channel (phone, telegram, whatsapp, email), consent\* | Telegram is its own plain-text field with an `@` placeholder; phone keeps `inputMode="tel"` and a `+374` placeholder. |

Uploads go to `POST /api/upload/public` and the returned ids travel with the lead:

| Limit | Value | Enforced by |
|---|---|---|
| Files per request | 8 | endpoint (`MAX_FILES`); the wizard sends one request per selection, not per file |
| Files per lead | 20 | wizard + `LeadSchema.files` (`.max(20)`) |
| Size per file | 50 MB | endpoint; an oversized file is marked in the list and never leaves the browser |
| Requests per IP | 20 / 60 s | `createLimiter("public-upload")` |
| Bytes per IP per day | 300 MB | `createQuota("public-upload-bytes")` |
| Bytes for the whole site per day | 5 GB | `createQuota("public-upload-total")` — the disk cannot be filled from outside |
| Accepted types | images, `.pdf .dwg .dxf .skp .max .zip .rar .7z .glb .usdz .mp4 .mov` | endpoint (`unsupported_type`), wizard `accept` attribute |

If the endpoint names the one file it refused (too large, unsupported), that row is marked and the rest of the batch is
sent again, so one bad file never fails a whole selection. Each answer has its own localised message: too large, this
file type is not accepted, too many uploads (429), the daily upload limit is used up (`quota_exceeded`).

**Validation and where the error appears.** Step 1 blocks on a missing segment. "Send" blocks on an empty name or
phone (the field gets `aria-invalid` and a red border, the error text sits under its own label, and focus and the scroll
go to the first offending field), on a missing consent tick and while an upload is still running. On a phone the
message is rendered **inside the sticky bottom bar** — the only part of the wizard always on screen — and the desktop
copy of it is `hidden` there, so a screen reader reads it once. A 429 from the lead endpoint says "Too many requests.
Please try again in a minute."; a rejected `files` array says the files could not be attached.

On success the form is replaced by a `role="status"` panel: a "Request sent" kicker, the request number at display size
with a copy button, the channel the visitor picked, and a link to the Web Viewer.

### Contact form (`/contact`, `src/components/site/contact-form.tsx`)

One screen: segment toggle (B2C / B2B, same radio ring as the wizard), name\*, phone\*, company (B2B only), **Telegram**,
e-mail, message. Telegram has its own box for a real reason: typed into the phone field, a handle is stored as a phone
number and nobody can call or message it. A blank name gets a field-level error rather than "something went wrong"; the
API's own `issues` array is read for the same purpose. On success the form is replaced by the confirmation and the
request number, and focus moves there.

### What the server enforces (`src/app/api/leads/route.ts`)

`segment` is required and must be `b2b` or `b2c`; `name` 1–120 characters; `phone` ≤ 40, `email` ≤ 120, `telegram` ≤ 60,
`companyName` ≤ 120, `message` ≤ 4000, `files` ≤ 20 ids. **Phone format is deliberately not validated** — only presence
is required, so international and local spellings are all accepted. `website` is the honeypot: a filled one gets the same
`{ ok: true }` shape as a real submission and writes no row. The route is limited to **10 requests per 60 s per IP** and
answers 429 with `Retry-After`.

## Accessibility behaviours

- **Focus follows the content.** A wizard step change moves focus to that step's heading (never on first render); a
  success panel takes focus; the contact confirmation takes focus; the lightbox returns focus to the thumbnail that
  opened it.
- **Only what is on screen is reachable.** Inactive showcase panels, the closed phone sheet and the closed Solutions
  panel carry `inert`, so their controls are out of the tab order. The open sheet focuses its first link, traps Tab
  between sheet and toggle, closes on Escape and returns focus to the toggle.
- **Groups are named.** The segment, room, service and channel choices are `role="radiogroup"` with
  `aria-labelledby`; portfolio category filters are a `nav > ul > li` of links with `aria-current="page"`; the uploads
  list is `aria-live="polite"`; errors are `role="alert"` and successes `role="status"`.
- **Controls are big enough to hit.** Buttons are 44 px (`.btn` is `h-11`), and on phones footer contact rows, link
  columns and social links are full-width rows of at least 40 px. `.choice` cards show a `focus-visible` outline;
  `input[aria-invalid="true"]` turns red.
- **The Web Viewer is operable without colour.** A swatch button is at least 44 px wide, the selected chip carries a
  ring (`button[aria-pressed="true"] > .swatch`), and the swatch names and the model's alt text come from the
  dictionaries in all three languages. If the viewer library or the model fails to load, a localised message with a
  working retry replaces the stage.
- **Keys do not collide.** The showcase stage handles ← → only when it is itself the focus target, so the comparison
  slider inside it keeps its own arrow keys; the slider's grip has `touch-action: none` while the rest of the image
  keeps `pan-y`.
- **Reduced motion is respected** (`prefers-reduced-motion` rules in `globals.css`); the ambient field keeps a reduced
  autonomous drift so it does not look broken on Windows, where the flag is set whenever animation effects are off.

Verified in the release pass: 45 pages (15 routes × hy/ru/en) at 1440 × 900 and 390 × 844, plus `/demo/ar` in three
languages — 0 console errors, 0 uncaught page errors, one `<h1>` per page and no horizontal overflow at 390 px.

## Design system

Tokens, type, components and the page rhythm are specified in `14_DESIGN_SYSTEM.md`. In short: tokens in
`src/app/globals.css` (`@theme`), primitives in `src/components/ui.tsx`, site parts in `src/components/site/*`
(header, footer, contact channels, showcase, before/after slider, viewer demo, FAQ, portfolio grid, lightbox, forms,
wizard, mobile bar, ambient layer, tracking).

## Content you can change without code

- Brand data (phones, Telegram, e-mail, address, hours, social links): Admin → Settings → Brand.
- Portfolio items: Admin → Portfolio (trilingual title/summary, category, images, video, live link, featured).
  A portfolio item only shows files marked **public** in Media; a private file is left out of the page and out of the
  share image.
- Page copy: edit `src/lib/i18n/hy.ts` (and ru/en). Keys are grouped by page.

## SEO & sharing

- **Per-page metadata.** `pageMeta()` in `src/app/(site)/[locale]/meta.ts` builds title, description, canonical,
  `hreflang` alternates, Open Graph and Twitter tags for one page. It exists because three things are easy to get wrong
  per page: the alternates must point at *this* path in every locale, a nested route replaces the parent's `openGraph`
  object wholesale, and the OG title needs the brand suffix that the `%s — ArchiTek Soft` title template adds to
  `<title>`.
- **Canonical + hreflang.** Every page carries a canonical URL of itself and exactly three `alternate` links (hy, ru,
  en) pointing at the equivalent path.
- **`og:locale`.** `hy_AM` / `ru_RU` / `en_US` plus `og:locale:alternate` for the other two (`OG_LOCALE` and
  `ogAlternateLocales()` in `src/lib/i18n/index.ts`). A bare language code is ignored by share-card scrapers, which then
  fall back to `en_US`.
- **`<html lang>`.** Set on a full load by `documentLang()` in `src/app/layout.tsx` — the validated `x-locale` header
  for the public site, the `admin_lang` cookie for `/admin`, otherwise `hy`; a forged header can never reach the markup.
  `<HtmlLang>` in the site layout keeps it in step after a soft locale switch.
- **Share image.** `/brand/share.jpg`, with `twitter:card = summary_large_image`. A portfolio page uses its own cover
  when it has a public one.
- **`/sitemap.xml`** (`src/app/sitemap.ts`, rendered per request so it carries the running server's `APP_URL`): 14
  static paths × 3 locales, each with the full `hreflang` set, plus one entry per published portfolio item.
  Armenian carries the full priority and ru/en 0.1 less. `lastModified` is set **only** where a real change date is
  known (portfolio items: the newest of the item row and the public files it shows) — a date that moves on every fetch
  teaches crawlers to ignore it. A database failure is logged and the static routes are still served.
- **`/robots.txt`** (`src/app/robots.ts`, also per request): `Allow: /`, `Disallow: /admin`, `Disallow: /api/`, plus the
  sitemap and host lines. Client pages (`/p/`, `/v/`) are deliberately **not** disallowed: they answer
  `noindex, nofollow`, and a crawler only honours that when it may fetch the page, while a disallowed URL can still be
  listed from an external link.
- Suggested next: named case studies, a "cut list / CNC" landing page in hy/ru, Google Business Profile, directory
  listings (see research).

## Measuring

Built-in, cookie-free and first-party: no third-party script runs on the site. A visitor hash is
`sha256(secret + Yerevan day + ip + user agent)` and rotates daily, so nobody is followed across days.

| Event | Written by | Carries |
|---|---|---|
| `page_view` | browser (`<Track>` in the site layout) | path, locale, referrer host (external only), utm source/medium/campaign |
| `cta_click` | browser (`TrackedCta`, `src/components/site/cta.tsx`, and the sticky phone bar) | locale, segment, `meta.label` (what the button is), `meta.href` |
| `form_start` | browser (first focus inside the wizard or the contact form) | locale, segment, `meta.form` = `start` \| `contact` |
| `form_submit` | **server** (`POST /api/leads`) | segment, locale, page path, utm |
| `portal_view`, `portal_action` | **server** (the portal routes) | — |

Only the first three are accepted from a browser (`POST /api/track`, 120 requests per minute per IP, body ≤ 8 KB);
everything that decides money is written by the server, so the lead and conversion figures cannot be inflated from
outside. A referrer on our own host counts as internal navigation, not a traffic source.

`TrackedCta` is the only way the CTA breakdown gets data — the hero and closing calls to action on `/`, `/platform`,
`/viewer`, `/live-3d`, `/for-business` and `/for-home`, plus the sticky phone bar, use it. Replacing one with a plain
`ButtonLink` silently removes it from the report.

Admin → Analytics shows page views, unique visitors, CTA clicks, form starts and submits, conversion, sources
(referrer/UTM), locales and B2B vs B2C over 7 / 30 / 90 days. Use UTM links in social posts
(`?utm_source=instagram&utm_campaign=aren`) — the SMM composer can add them.

## Public copy rule (confidentiality)

The public website explains **what ArchiTek Soft can do, not how it is built**. Copy, captions and spec lists use
customer-facing language (capabilities, results, benefits: "real-time", "cinematic", "opens from a link on any device",
"in your room at 1:1"). Engines, cloud providers, streaming implementation, file formats, frameworks and infrastructure
are never named on the site; they live in the internal docs (`02_ARCHITECTURE.md`, `06`, `11`). The admin, client
portal and viewer show no implementation names either. A sweep is part of every copy change: grep the dictionaries and
`src/app/(site)` for engine/cloud/format names before shipping. The release pass scans the rendered text and every meta
tag of all 45 public pages for those names and expects zero hits.
