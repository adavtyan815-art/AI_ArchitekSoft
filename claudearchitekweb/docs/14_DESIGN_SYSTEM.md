# 14 — Design system v3: "Atelier"

## 1. Critical audit of v2 (why it looked like a template)

Screenshots of every page (light/dark, desktop/mobile) were taken before this pass. Verdict:

| Area | What was wrong |
|---|---|
| Identity | Cobalt-blue accent + white rounded cards + icon-in-a-soft-square = the default look of every SaaS starter. Nothing said "3D for furniture makers". |
| Typography | Manrope/Inter are competent but characterless; Armenian fell back to Noto Sans Armenian, so mixed-script headlines looked like two different sites. Eyebrows in blue caps on every block. |
| Layout | One 1200 px column, equal-width card grids, everything centred. No asymmetry, no scale contrast, no editorial rhythm. Sections were separated by whitespace only. |
| Imagery | Renders (the strongest asset) were shown small, inside 24 px rounded boxes with drop shadows. No full-bleed, no captions, no material context. |
| Components | Same card everywhere: icon → title → text. Check-circle lists. Pill buttons. Contact "channel cards" with icon circles. Footer = 4 generic columns. |
| Motion | Scroll reveal started from 20 % opacity and left whole sections ghosted in some renderers. Otherwise no micro-interactions. |
| Admin | Stock dashboard: black active pill in a sidebar, eight identical stat cards with small numbers, generic table. Charts were near-empty at first paint. |
| Client pages | Functional but bland: stepper in a card, oversized gallery box, decision options as three more icon cards. |
| Web Viewer | A card with a grey stage; swatches as small circles; no "product" feel. |
| Dark mode | Blue-black; accent turned to periwinkle; images dimmed. Correct, not designed. |

## 2. Direction

ArchiTek Soft sits between architecture, furniture-making and 3D software. The system borrows from
**technical drawings and material sample boards**: warm paper, ink, hairlines, index numbers, ticks,
corner marks on frames, real material swatches, and one warm signal colour.

Principles: images lead; type does the branding; structure through rules and indices, not boxes;
one accent per screen; small radii; hairlines instead of shadows; restrained, purposeful motion.

## 3. Tokens

Palette (light → dark):

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #F4F2ED paper | #121110 graphite | page |
| surface | #FBFAF7 | #191816 | cards, inputs |
| surface-2 / 3 | #EDEAE3 / #E3DFD6 | #211F1C / #2A2724 | insets, hovers |
| line / line-strong | #DDD8CE / #B9B3A6 | #2B2925 / #45413B | hairlines |
| fg / fg-2 / muted / faint | #17150F / #3B3831 / #6B675E / #9A958A | #EFEBE3 / #CFC9BE / #9A948A / #6E6961 | text |
| accent | #D9491F oxide | #FF7A4D | links, index numbers, live dots, one CTA per screen |
| accent-soft / -fg | #F8E4DB / #9A2F0F | #3A1D12 / #FFB399 | tints |
| success / warning / danger | #2E7D4F / #A66A12 / #C0392B | #5FBF85 / #E0A94F / #F0705F | status only |
| inverse | ink on paper ↔ paper on graphite | | inverse blocks |

Radii: 4 (chips, images inside cards), 6 (buttons, inputs), 10 (cards), 14 (large media). No pills except tags.
Shadows: none in light except `shadow-lift` for floating layers; dark uses 1 px inner rings.

## 4. Type

| Role | Font | Notes |
|---|---|---|
| Display / headings | **Source Serif 4** (Latin, Cyrillic, opsz) + **Noto Serif Armenian** | 500–600, tight leading, -0.02em. The serif is the brand voice. |
| Body / UI | **Inter** + **Noto Sans Armenian** | 16/1.65 body, 15 in dense UI, 13.5 admin tables |
| Labels / numbers / codes | **JetBrains Mono** | eyebrows, indices ("01"), project codes, prices, table numerals, captions |

Scale: display `clamp(2.6rem, 5.6vw, 4.6rem)`; section `clamp(1.9rem, 3.2vw, 2.75rem)`; card title serif 1.3rem or sans 1.05rem in dense UI; eyebrow mono 11 px / 0.14em; caption mono 11–12 px.

## 5. Signature elements (use them, sparingly)

- **Index + rule**: every site section opens with `01 — Title` (mono index, hairline rule above). `SectionHeading` renders it.
- **Frame**: media sits in `.frame` — 1 px hairline, 8 px radius, mono caption bar below, optional corner marks (`.frame-marks`). Caption bars (`figcaption` or `.frame-bar`) use `contain: inline-size`, so a nowrap/truncated caption can never widen the frame on phones.
- **Ticks**: `.ticks` renders a ruler line (repeating small marks) as a divider in heroes and stat rows.
- **Swatches**: material chips (`.swatch`) with real wood/colour fills and a mono label. Used in the viewer and as decoration on KitchenPro.
- **Spec table**: two-column key/value list with mono keys (`.spec`). Used for packages, project facts, portal summary.
- **Inverse band**: full-bleed ink/paper block for the KitchenPro block and final CTAs.
- **Dot grid**: `.grid-paper` background for hero and empty states (very subtle).

## 6. Components (src/components/ui.tsx)

Logo: `<BrandLogo />` (src/components/brand-logo.tsx) renders the monochrome wordmark (ink on paper / paper on graphite). The two-tone blue PNG is kept for print and social only.

Button (primary=ink, secondary=outline, accent, ghost, danger; sizes sm/md/lg; square 6 px), ButtonLink, Card (hairline, radius 10), Frame, Rule/Ticks, Index, SectionHeading (index, title, text, action), Stat (mono value), Badge/Pill (square chips), Field/Input/Select/Textarea (44 px, 6 px radius, accent focus ring), CheckList (en-dash markers, not check circles), Spec, Swatch, Empty, Skeleton.

## 7. Layout rules

- Container 1240 px, 24/40 px gutters; inner content grids use 12 columns on lg.
- Hero: text left (5–6 cols), image right (6–7 cols) or full-bleed image band; ticks under the hero.
- Sections: `section` = 88/120 px vertical rhythm; every section starts with index + rule.
- Cards only when there is a real group of items; otherwise use rules and columns.
- Images: 4:3 / 16:10 with captions; portfolio tiles are large (2-up), not 3-up thumbnails.
- Mobile: same hierarchy; index + title stack; frames go edge-to-edge (-mx-5) where useful.

## 8. Motion

- `reveal` (IntersectionObserver, `data-reveal`): 0 → 1 opacity, 10 px rise, 500 ms, once. Never hides content when JS is missing.
- Hover: image scale 1.02 (600 ms), link underline slides in, button arrow nudges 2 px, cards get `line-strong`.
- No bouncing, no parallax, no auto-playing carousels. Reduced motion respected.

## 9. Admin

Same tokens, denser: 13.5 px table text, mono numerals right-aligned, hairline rows, sticky header. Page title in serif. Stat cards → "spec strip" (label, mono value, delta). Sidebar: mono group labels, active item = ink bar on the left + surface-2 fill. Buttons square. Charts use accent + ink + muted only.

## 10. Client pages and viewer

Portal = a project sheet: project code (mono), serif title, stage ruler, media in frames, decision panel with three clear actions. Viewer: dark stage (`#141311`) with dot grid, model centred, swatch bar with material chips, mono toolbar, corner marks.

## 11. What was redesigned in this pass (v3)

| Surface | Files | Result |
|---|---|---|
| Foundation | `globals.css`, `app/layout.tsx`, `components/ui.tsx`, `components/brand-logo.tsx`, `components/reveal.tsx` | New tokens, fonts, primitives, monochrome logo, JS-safe scroll reveal |
| Site chrome | `components/site/{header,footer,contact-channels,faq,before-after,portfolio-grid,mobile-cta}.tsx` | Underline nav with an editorial Solutions panel, statement footer, rule-list contacts, indexed FAQ |
| Public pages | all of `app/(site)/[locale]/**` | Compact homepage + 13 dedicated pages rebuilt on index/rule/frame/spec patterns |
| Web Viewer | `components/site/viewer-demo.tsx`, `app/v/[slug]`, `components/portal/viewer-shell.tsx`, `app/demo/ar` | Dark stage, grid floor, corner marks, mono toolbar, material swatches |
| Client portal | `app/p/[slug]/**`, `components/portal/*` | Project sheet: mono code, serif title, stage ruler, framed media, decision rows |
| Admin | `app/admin/**`, `components/admin/**` | Hairline shell, spec strip stats, mono tables, square controls, recoloured charts |

Verification: 100 full-page screenshots (every page × light/dark × desktop/mobile) before and after; console sweep over 35 routes with zero errors or warnings; no horizontal overflow at 390 px on any public page; `tsc` and `next build` clean.

Known limits: long Armenian display words can still break mid-word below 640 px (`overflow-wrap`), the admin "client pages" table scrolls horizontally at 1440 px, and headless captures of the 3D demo render the GLB without proper shading (real browsers are fine).

## 12. Interactive showcase (home, first screen)

`src/components/site/showcase.tsx` — the product console. On wide screens the stage (16:10) takes 8 of 12 columns
and a rail beside it carries the headline, one paragraph, the **selector** and the CTAs; on phones the headline
comes first, then the stage, the selector as a segmented row, then the intro. Three demonstrations: **01 sketch →
finished picture** (comparison slider), **02 Web Viewer** (rotate, change colour; AR on phones), **03 Live 3D**
(10 s cinematic walkthrough clip). **Selection is manual only** — three option buttons (the selected one is filled
ink with the accent index and a left accent bar, larger on wide screens), ← → keys; no automatic switching. A
caption bar under the stage names the active demonstration and links to its page. **Fullscreen** on the stage
(hidden where the API is missing). **Performance**: the 3D library and model load only when 02 is opened
(tap-to-load on phones), the clip (≈450 KB, 720p, muted) only when 03 is opened. Media lives in
`public/demo/showcase-*`; the sample model is a placeholder and should be replaced with a real export.

## 13. Homepage v6 and the ambient layer (v3.1)

The homepage carries the contemporary interpretation of the identity, scoped to `.home-x` in
`src/app/(site)/[locale]/home.css`: sans display type (the serif stays as an accent), a split first screen
with a large floating canvas + glass control dock, two glass cards beside it (headline; "now showing" +
CTAs; on phones the intro paragraph moves under the canvas so the product is on the first screen), drafting
corner marks on the stage, glass stat tiles, a dark glass platform canvas, image-card doors, glass work tiles,
link cards with a spotlight border and a gradient CTA. Restore point before this direction: commit `fba965e`.

**Ambient layer** (`src/components/site/ambient.tsx`, rendered once in the site layout, public pages only):
a living field of connected points on a canvas, two slow atmospheric glows (oxide + slate) and a faint
drafting grid. Points drift with depth, connect to neighbours within 132 px and lean towards a fine pointer;
motion is time-based, paused when the tab is hidden, thinner on phones, and a single still frame under
`prefers-reduced-motion`. Colours come from tokens so light and dark are tuned separately:

| Token | Light | Dark | Use |
|---|---|---|---|
| glass / glass-strong | white 64 % / 84 % | #1f1e1c 62 % / 86 % | translucent surfaces (`glass-card`, `glass-strong`) |
| glass-line / glass-hi | ink 9 % / white 90 % | white 10 % / white 7 % | hairline + top highlight |
| glow-1 / glow-2 | oxide 13 % / slate 15 % | oxide 17 % / slate 13 % | the two drifting glows |
| grid-line | ink 5.5 % | white 4.5 % | drafting grid |
| field-node / field-accent | 23,21,15 / 217,73,31 | 239,235,227 / 255,122,77 | point + accent point colour |
| field-node-a / line-a / mouse-a | .55 / .17 / .40 | .62 / .20 / .46 | alphas |

Site-wide additions in `globals.css`: `.glass-card`, `.glass-strong`, `.spot` (pointer-following accent
halo on the hairline, fed by the same pointer listener), `.cad` corner marks, `.reveal-stagger` (children rise
one after another; `RevealObserver` watches both classes), `.mobile-sheet` (near-opaque phone menu),
`html.theme-transition` (450 ms cross-fade set by the theme toggle) and `.site-shell .btn-*` (ink gradient +
lift for primary, glass for secondary — admin buttons stay flat). The header is transparent at the top of the
page and turns to glass once scrolled; the Solutions panel is glass-strong.
