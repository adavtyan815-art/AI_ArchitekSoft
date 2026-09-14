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

## 13. Homepage v7 "the drafting table" and the ambient layer (v3.2)

**Why v6 was replaced.** The v5/v6 homepage boxed everything (glass headline card, live card, dock, tiles),
dropped the brand serif for a heavy sans, repeated the "01" index device on every element, stacked effects
(glass, halos, drifting glows, spotlight borders, gradient CTA) and treated dark as inverted light. It read as
a generic 2024 template and as a different site from the editorial pages.

**Direction.** The homepage is the strongest expression of the Atelier system, not an exception to it.
Scoped to `.home-x` in `src/app/(site)/[locale]/home.css`:

- One horizontal rhythm: on the homepage the shell gets `.site-wide` (the layout reads `x-pathname`, set by
  the middleware), which widens `container-x` to 1560 px max with 4 vw outer margins (20–72 px) for the
  header, every section, the phone menu and the footer alike — the logo sits on the eyebrow's left edge and
  the header CTA on the canvas's right edge. At 1440 the content spans 1325 px, at 1920 1416 px. The hero
  splits 8/13, bands 5/7.
- Header: transparent at the top of the page; once scrolled it takes the page colour (opaque) with a
  hairline and a faint shadow, so nothing passing underneath can show through the navigation. Translucent
  variants (92–97 % with blur) were tried and rejected: high-contrast content such as ink buttons still
  ghosted through. The phone sheet is opaque too.
- First screen: serif display headline on the open page (8 cols, 2.3–3.4 rem, balanced to three lines in
  Armenian at 1440) beside the showcase canvas (13 cols, ≈775 px at 1440), the one object that carries
  depth (14 px radius, hairline ring, one soft shadow, corner marks). Under it a hairline **mode strip** (three labels, no indices, one sliding ink
  indicator measured to the label, 420 ms; fullscreen behind a hairline at the end of the strip) and one
  **caption line** naming the selected mode with its link (no counter, no toolbar: the strip already shows
  the state). Intro + CTAs + note sit under the headline on desktop and under the canvas on phones.
  Entrance: the headline group and the copy group rise once, the canvas fades in.
- Then (the proof-numbers strip was removed: vague values, generic device): the platform as a **tonal
  band** with a numbered rule list and the material board, two audiences as **framed images with caption
  bars** and text below (plain frames; corner marks stay on the showcase and the work tiles), selected
  work (shared grid), a **rule list** for "where next" and a closing band with the page's one accent button.
- Motion is limited to what carries meaning: two entrances (headline group, copy group) plus the canvas
  fade, indicator slide, one scroll reveal (staggered for grids), image scale and arrow nudge on hover.

**Armenian display type.** Noto Serif Armenian has long ascenders and descenders, so `:lang(hy)` rules in
`globals.css` give every display and section heading more leading (1.12 / 1.14) and near-zero tracking
(−0.008 em / −0.006 em); Latin and Cyrillic keep the tighter serif settings. Headlines are balanced so no
line is orphaned.

**Phones are their own composition** (`@media (max-width: 639px)` in home.css): eyebrow → three-line
headline → the stage full-bleed and square (the product is the screen) → the mode strip with 44 px
targets and no fullscreen button → one caption line → intro → a single outline CTA (the sticky bottom
bar already carries "start a project") → note. No drafting grid on phones, 18–36 field points. Short
(< 700 px) and landscape (< 520 px) rules tighten the top so the stage is reached sooner. Inside the phone
stage the Web Viewer uses compact chips and a smaller toolbar so nothing overlaps.

**Light vs dark are designed separately.** Light: ink on paper, fine 96 px line grid, ink bands
(`--band-*` = ink/paper). Dark: paper on warm graphite (#131211), 24 px dot grid, one still warm light at the
top of the viewport (`--desk-light`), and graphite panels with a hairline ring where light uses ink bands.

**Ambient layer** (`src/components/site/ambient.tsx`, rendered once in the site layout, public pages only):
the survey mesh. Points drift with depth, connect to neighbours within 136 px with hairlines and lean
towards a fine pointer. Each point has a drift position and a displacement: within 170 px the cursor
pulls a point up to 22 px towards itself (nearer and deeper points more), the displacement is a damped
spring, so points ease back when the cursor moves on or leaves, and links are computed on the displaced
positions so the mesh visibly reacts. A faint thread in the same ink/paper colour joins disturbed points
to the cursor. Every twelfth point is an accent cross mark (a survey station) — the accent is reserved
for those. Time-based motion (7–20 px/s scaled by depth), paused when the tab is hidden, 18–36 points on
phones vs 44–110 on desktop. The cursor pulls points within 230 px by up to 38 px (smoothstep falloff), the
displacement settles in about 0.4 s. Under `prefers-reduced-motion` the autonomous drift runs at 35 % and
the user-initiated cursor response stays at half strength without threads (Windows reports "reduce"
whenever OS animation effects are off, so a dead field there would read as a bug). No glows.

| Token | Light | Dark | Use |
|---|---|---|---|
| grid-line / grid-dot | ink 3.4 % @ 120 px / — | — / paper 8.5 % @ 32 px | line grid (light) or dot grid (dark) |
| desk-light | — | warm 11 % | still radial light at the top, dark only |
| field-node / field-accent | 23,21,15 / 217,73,31 | 239,235,227 / 255,122,77 | point + cross mark colour |
| field-node-a / line-a / mouse-a | .40 / .13 / .30 | .50 / .16 / .34 | alphas (dark a touch more present) |
| header-bg | paper 97 % | graphite 96 % | `glass` utility (phone action bar); the header itself uses the opaque page colour |
| band-bg / band-fg | #17150F / #F4F2ED | #1B1916 / #EFEBE3 | tonal bands on the homepage |

Site-wide additions in `globals.css`: `.reveal-stagger` (children rise one after another; `RevealObserver`
watches both classes), `.mobile-sheet` (opaque phone menu), `html.theme-transition` (450 ms cross-fade set
by the theme toggle) and `.site-shell .btn-*` (hairline of light + 1 px lift on the public site; admin
buttons stay flat). The header is transparent at the top of the page and turns to glass once scrolled. The
`glass-card` / `glass-strong` utilities remain available but the homepage no longer uses them.
