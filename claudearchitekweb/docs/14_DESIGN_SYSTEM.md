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
| accent-hover / accent-fg | #C13F18 / #FFF8F3 | #FF8F69 / #1A0C06 | accent button hover, text on accent |
| accent-soft / -fg | #F8E4DB / #9A2F0F | #3A1D12 / #FFB399 | tints |
| success / warning / danger | #2E7D4F / #A66A12 / #C0392B | #5FBF85 / #E0A94F / #F0705F | status only |
| success-soft / warning-soft / danger-soft | #E1EFE5 / #F6E9D2 / #F7E0DD | #16301F / #33250C / #3A1614 | status chip and notice grounds |
| inverse | ink on paper ↔ paper on graphite | | inverse blocks |
| stage | #141311 | #0E0D0C | the 3D stage; `.stage` rescopes line/fg/surface for dark UI on top of it |

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
- **Swatches**: material chips (`.swatch`) with real wood/colour fills and a mono label. Used in the viewer and as the material board on `/platform`.
- **Spec table**: two-column key/value list with mono keys (`.spec`). Used for packages, project facts, portal summary.
- **Inverse band**: full-bleed ink/paper block for the platform band and final CTAs (on the light homepage a deeper paper panel serves instead — see §13).
- **Dot grid**: `.grid-paper` background for hero and empty states (very subtle).

## 6. Components (src/components/ui.tsx)

Logo: `<BrandLogo />` (src/components/brand-logo.tsx) renders the brand wordmark (`/brand/logo.png`, its own blue) in both themes — the logo is the brand mark, not a UI element that flips with the page. The monochrome ink/paper PNGs remain in /public/brand for special cases.

Button (primary=ink, secondary=outline, brand=accent, soft, ghost, danger; sizes sm/md/lg; square 6 px), ButtonLink, Card (hairline, radius 10), Frame, Rule/Ticks, Index, SectionHeading (index, title, text, action), Stat (mono value), Badge/Pill/Tag (square chips), Field/Input/Select/Textarea (44 px, 6 px radius, accent focus ring), CheckList (en-dash markers, not check circles), Spec, Swatch, Empty, IconBox, Kbd, Divider, Skeleton.

**Button colour carries meaning.** `btn-primary` is **ink** and is the ordinary main action — save, send, next,
sign in. `btn-brand` is the **terracotta accent** and is rationed: one per screen at most, on the action that is the
point of the page. On the public site that is the closing call to action; in the admin it is "Generate post pack",
the one action that costs an AI call, so an ordinary Save must never shout louder; in the client portal it is
"Open the Web Viewer" (and the AR button on the model). `btn-secondary` is the outline companion, `btn-danger` a
soft red that fills on hover. Everything else is `btn-ghost` or `btn-soft`.

**Form state.** `Field` renders the error inside the same `<label>` as the control, so a screen reader reads the
problem together with the field name; pair it with `aria-invalid` on the control, which `.input[aria-invalid="true"]`
turns red. `.choice` (the card-shaped radio/checkbox row used by the wizard, the contact form and the portal decision
panel) has a `has-[:focus-visible]` outline. One-of-many choices use a round ring that fills; genuine checkboxes stay
square. `Swatch` puts the 44 px hit area on the button and the selected ring on the 36 px chip
(`button[aria-pressed="true"] > .swatch`), so the state never depends on colour alone.

## 7. Layout rules

- `container-x` is the one horizontal rhythm of the public site: fluid, 1520 px max, outer padding `clamp(20px, 4vw, 72px)` — header, every page, the phone menu and the footer share it, so the logo never jumps between pages. `container-narrow` (`max-w-3xl`) is for long text: privacy, the 404, article-width blocks.
- Inner content grids use 12 columns on lg.
- Hero: text left (5–6 cols), image right (6–7 cols) or full-bleed image band; ticks under the hero.
- Sections: `section` = 80/112/128 px vertical rhythm (`py-20 sm:py-28 lg:py-32`); every section starts with index + rule.
- Cards only when there is a real group of items; otherwise use rules and columns.
- Images: 4:3 / 16:10 with captions; portfolio tiles are large (2-up), not 3-up thumbnails.
- Mobile: same hierarchy; index + title stack; frames go edge-to-edge (-mx-5) where useful.

## 8. Motion

- `reveal` / `reveal-stagger`: content is visible by default. `RevealObserver` (site layout, re-run on every route change) arms only elements below the viewport (`.reveal-armed`) in the same tick it observes them and marks `.is-in` on entry; it un-arms on route change. If JS never runs, hydrates late, or an observer never fires, the page is complete. Earlier the CSS hid every `.reveal` as soon as the inline script set `data-js` and the observer ran only once per layout mount — sections stayed missing after client-side navigation and until hydration on slow loads.
- Hover: image scale 1.02 (600 ms), link underline slides in, button arrow nudges 2 px, cards get `line-strong`.
- No bouncing, no parallax, no auto-playing carousels. Reduced motion respected.

## 9. Admin

Same tokens, denser: 13.5 px table text, mono numerals right-aligned, hairline rows, sticky header. Page title in
serif (`PageHeader`, with mono crumbs above and a muted subtitle below). Buttons square. Charts use accent + ink +
muted only. The building blocks live in `src/components/admin/shell.tsx`; these are the rules they encode.

**Shell and navigation.** Desktop: a 232 px sidebar on the paper surface with a hairline on the right, items grouped
under mono labels (Work · Clients · Content · System), the active item marked by an ink bar on the left plus a
surface-2 fill. Phone: a bottom tab bar of **four modules plus "More"** — Overview, Leads, Projects, Social, then
everything else behind the More sheet. Four plus More gives about 78 px per column at 390 px, which is what the
Armenian labels need; with six columns three of them were ellipsised. "More" is highlighted while the current route
is one of the modules it hides, and its sheet behaves as a dialog: focus moves in, Tab is trapped, Escape closes,
the background does not scroll and focus returns to the button.

**Tabs.** Two components, both wrapping `ScrollStrip`:

| | Used for | Shape |
|---|---|---|
| `Tabs` | sections of one record (`?tab=`) — project detail, Settings | underline strip on a `border-b` rail |
| `PillTabs` | list filters with counts (status, stage, type, kind, state) | underline items inside `FilterBar`, each a link with its own href |

`ScrollStrip` is the horizontal container: it keeps its own scrollbar instead of widening the page, brings the
`[aria-current="page"]` item into view on mount without scrolling the window (on a phone the Settings tabs are wider
than the screen, so the active tab could sit entirely off-screen), and fades the edge that still has content so the
row reads as scrollable rather than cut off. It is always `min-w-0`; `PillTabs` also sets `w-full`, because
`FilterBar` is a wrapping flex container that several pages turn into a column — without a definite width the strip
is sized to its content (1183 px on Projects) and the page itself scrolls sideways, pushing the fixed bottom tab bar
off screen.

**Spec strip instead of stat cards.** `SpecStrip` + `StatCard`: mono label, large tabular value, mono hint; the
hairlines are the 1 px gaps over a `bg-line` ground. Two columns on phones, 3 / 4 / 5 from `sm`. **Odd-count rule:**
an empty cell would show up as a solid grey block the size of a figure, so the last card spans the gap instead — on
phones whenever the count is odd, and at `sm`–`lg` for a five-card strip in three columns. A `StatCard` with an
`href` turns the whole figure into a link to the list it counts.

**Lists on phones are rows, not key/value cards.** Below `md` a responsive table turns every column into its own
labelled line, so one record costs six to nine lines and a short list runs several screens. `CompactList` /
`CompactRow` replace it: the record's name, one mono context line (code · segment · updated) and one status chip, in
a 56 px row that is itself the link. Everything truncates, so a 120-character name without spaces cannot widen a
390 px page. Pair it with the real table — `<CompactList>` for phones, the `table-admin` inside a `max-md:hidden`
wrapper from `md`. Leads, clients, companies, projects, client pages and portfolio all use the pair. Where a
`.table-responsive` phone card is still the right shape (dense secondary tables), the cards are compact and a cell
carrying several blocks stacks them full width under the label instead of squeezing them into narrow columns. A card
that scrolls a wide table sideways also gets `contain: paint` from `md` up: `overflow-x: auto` alone is not enough,
because the table's sticky header cells still count towards the document's scrollable area and gave the page its own
horizontal scrollbar behind a table that was already scrolling itself.

**StatusBadge, never colour alone.** One square chip carries the state, and `STATUS_TONES` maps every value the
product uses — lead statuses, project stages, client types, post statuses, integration states, b2b/b2c — onto one of
six tones (neutral, brand, success, warning, danger, dark). Pass `label` to show the localised name; the word is
always there, the tone only reinforces it.

**Notice is the save feedback.** Server actions redirect back with `?notice=…&tone=ok|error`, and `<Notice>` renders
it as a `role="status"` hairline row with a square dot, green or red. `NoticeUrlCleanup` then drops the two
parameters with `history.replaceState` — keeping tab, filter and search parameters — so a reload does not repeat the
message; `router.replace` is deliberately not used, because it re-runs the server component and the message would
disappear while it is still being read. While an action runs, `SubmitButton` shows a pending label through
`useFormStatus` and stays disabled; `ConfirmSubmit` asks first, and a destructive confirmation names what else goes
with the record (linked tasks and timeline entries).

**Empty states end in one action, and with a filter on that action is "Clear filters".** Title, one line of text, one
button. When a search or a filter is active, clearing it is the useful next step and the create button is not: the
page header already carries "New …", and offering it twice invites an accidental record.

**Tap targets.** 44 px for anything that is really a control (`.btn` is `h-11`; `btn-icon` is 40 × 40), and 40 px
minimum for links inside dense rows — crumbs, tab strips, compact rows and list links all carry `min-h-10` or more.
Measured at 390 × 844 with touch emulation, not assumed.

**Sticky bars clear the tab bar.** `FormActions` keeps a form's primary action reachable on a phone (sticky above the
tab bar, static from `sm`). A fixed editor bar sits at `ABOVE_TAB_BAR` = `calc(59px + max(0.75rem,
env(safe-area-inset-bottom)))`, and `useStickyBarSpace()` gives `<main>` the matching bottom padding for as long as
such a bar is mounted, restoring the layout's own padding on unmount.

**RelTime for relative timestamps.** "5 min ago" is read from the clock at render time and the dev server renders a
page twice; when the two passes land on opposite sides of a minute boundary React reports a hydration mismatch on a
page that is in fact correct. `<RelTime>` carries `suppressHydrationWarning` on that one text node (and
`PageHeader` does the same for a subtitle that bakes one in). Use it instead of calling `relTime()` straight into JSX.

**Numbers, money and dates.** Mono, tabular, right-aligned (`td.num`). Money prints as `6,750,000 AMD` — the ֏ sign
has no glyph in Source Serif 4 or JetBrains Mono. Dates, times and file sizes are formatted in Asia/Yerevan and take
the interface language. Titles that can be user content wrap with `[overflow-wrap:anywhere]`.

**Armenian in dense UI.** `html:lang(hy)` gives table headers and responsive-card labels `font-size-adjust:
from-font`, matching the Armenian fallback to the mono x-height so a mixed-script table header does not look like two
sizes; Latin and Cyrillic are untouched.

## 10. Client pages and viewer

**`PortalChrome` is the shell of every client-page state** on `/p` and `/v`: a thin brand bar, the content, a footer.
The **pages** render it, never the segment layout — a layout never receives the `?k=` key, so it cannot tell a link
holder from someone guessing a slug. The logo is a plain span, not a link: a private client page must not send the
client to the marketing site. Beside it, the tagline only when Settings stores it per language and has one for this
page's language (a non-localised string is hidden rather than printed in English on an Armenian page), the language
tag and the theme toggle. The footer carries "powered by" and the studio's website at a 44 px tap height, and clears
the fixed phone bar (`max-lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))]`) when the page renders one.

**`PortalState`** is the message card for a link that is not open: centred type on grid paper, a hairline, and the
contact rows underneath. A link that ran out and a link the studio switched off get **different sentences**; an
unknown slug and a wrong key answer identically (404), so neither can be used to probe for real slugs.

**Passcode gate.** A narrow centred panel: mono hint, serif title, one code field — 56 px tall (`h-14`), centred mono
at 2xl with `0.4em` tracking and upper-cased input. The keyboard is the normal one (`inputMode="text"`,
`autoCapitalize="characters"`, autocorrect off, `autocomplete="one-time-code"`): a numeric keypad makes letters
untypeable on iOS. A format hint sits under the field through `aria-describedby`, a wrong code refocuses and selects
the field, and three states have three messages — wrong code, could not reach the server, and locked for *m* minutes
after five wrong tries. Below the form, a "did not get a code?" block with the contact channels.

**Project sheet.** Mono project code, serif title, and the cover render as a hero frame directly under it (16/10 on
phones, 16/9 from `sm`) with a caption line, so the client sees their furniture on the first screen. Then the stage
ruler — 11.5 px labels, only the current stage and its two neighbours drawn, the rest kept in the accessibility tree
as sr-only text — framed media, and the decision panel. Decision options are the wizard's round radio rings and they
follow the stage: past approval only "I want a change" and "I have a question" are offered. Choosing "I approve"
visibly relabels the message box as "Comment (optional)", so a half-written change request cannot be sent unnoticed
as an approval comment. Earlier questions show a status word next to the date.

**`StickyActions`** is the phone-first bottom bar with the two things a client actually does; it is hidden from `lg`,
where the same actions sit inline in the page. The Web Viewer button is the page's one accent button; the second is
outline and becomes "Message" once the project has moved past approval. The bar carries short labels — the Armenian
sentence "Բացել Web Viewer-ը" does not fit a 203 px button — with the full sentence as the accessible name.

**Viewer.** Dark stage (`#141311`) with dot grid, model centred, mono toolbar, corner marks. A client's own model is
never repainted, so `/v` passes no swatches and draws no swatch bar; the demo viewer on the public site keeps the
material chips and a reset control. The gallery lightbox is a named dialog: it traps Tab, swipes sideways between
images, ignores pinch, and Escape returns focus to the thumbnail that opened it.

## 11. What was redesigned in this pass (v3)

| Surface | Files | Result |
|---|---|---|
| Foundation | `globals.css`, `app/layout.tsx`, `components/ui.tsx`, `components/brand-logo.tsx`, `components/reveal.tsx` | New tokens, fonts, primitives, monochrome logo, JS-safe scroll reveal |
| Site chrome | `components/site/{header,footer,contact-channels,faq,before-after,portfolio-grid,mobile-cta}.tsx` | Underline nav with an editorial Solutions panel, statement footer, rule-list contacts, indexed FAQ |
| Public pages | all of `app/(site)/[locale]/**` | Compact homepage + 13 dedicated pages rebuilt on index/rule/frame/spec patterns |
| Web Viewer | `components/site/viewer-demo.tsx`, `app/v/[slug]`, `components/portal/viewer-shell.tsx`, `app/demo/ar` | Dark stage, grid floor, corner marks, mono toolbar, material swatches |
| Client portal | `app/p/[slug]/**`, `components/portal/*` | Project sheet: mono code, serif title, stage ruler, framed media, decision rows |
| Admin | `app/admin/**`, `components/admin/**` | Hairline shell, spec strip stats, mono tables, square controls, recoloured charts |
| Not found | `app/not-found.tsx`, `app/(site)/[locale]/not-found.tsx`, `components/site/not-found-view.tsx` | The public 404 in the site's own rhythm: index + eyebrow, serif headline, two buttons and a hairline list of where to go instead, in all three languages |

Verification: 100 full-page screenshots (every page × light/dark × desktop/mobile) before and after; console sweep over
35 routes with zero errors or warnings; no horizontal overflow at 390 px on any public page; `npm run typecheck`,
`npm run lint` and `npm run build` clean. The release pass repeated it against a production server: 174 page loads
(public, admin, portal × desktop and 390 × 844 phone) with no console error, no uncaught page error and no horizontal
overflow.

Known limits: long Armenian display words can still break mid-word below 640 px (`overflow-wrap`); a wide admin table
scrolls sideways **inside its own card** from `md` up (it is contained, so the page itself does not scroll, and below
`md` the compact rows replace it); the header brand-logo link is 34 px tall on a phone, below the 40 px rule the rest
of the site keeps; and headless captures of the 3D demo render the GLB without proper shading (real browsers are fine).

## 12. Interactive showcase (home, first screen)

`src/components/site/showcase.tsx` — the product console. On wide screens the stage takes the right-hand columns and
the headline, one paragraph and the CTAs sit beside it; on phones the headline comes first, then the stage
full-bleed and square, then the strip and the intro (see §13). Three demonstrations: **sketch → finished picture**
(comparison slider), **Web Viewer** (rotate, change colour; AR on phones), **Live 3D** (10 s cinematic walkthrough
clip). **Selection is manual only** — a hairline **mode strip** of three labels with one sliding ink indicator
measured to the label (420 ms), a roving tabindex and ← → keys; no automatic switching, no counter. One **caption
line** under it names the selected mode and links to its page. **Fullscreen** sits at the end of the strip on fine
pointers and as a control on the stage on touch devices (§13). **Performance**: the 3D library and model load only
when the Web Viewer mode is opened (near-viewport on desktop, tap-to-load on phones), the clip (≈450 KB, 720p,
muted) only when Live 3D is opened; the inactive panels are `inert`, so their controls are out of the tab order and
the slider inside keeps its own arrow keys. Media lives in `public/demo/showcase-*`; the sample model is a
placeholder and should be replaced with a real export.

## 13. Homepage v7 "the drafting table" and the ambient layer (v3.2)

**Why v6 was replaced.** The v5/v6 homepage boxed everything (glass headline card, live card, dock, tiles),
dropped the brand serif for a heavy sans, repeated the "01" index device on every element, stacked effects
(glass, halos, drifting glows, spotlight borders, gradient CTA) and treated dark as inverted light. It read as
a generic 2024 template and as a different site from the editorial pages.

**Direction.** The homepage is the strongest expression of the Atelier system, not an exception to it.
Scoped to `.home-x` in `src/app/(site)/[locale]/home.css`:

- One horizontal rhythm for the whole public site: `container-x` is fluid everywhere (1520 px max, 4 vw
  outer margins clamped to 20–72 px) for the header, every page, the phone menu and the footer, so the logo
  never jumps between pages and always sits on the content's left edge. At 1440 the content spans 1325 px,
  at 1920 1376 px. The hero splits 8/13, bands 5/7. The desktop navigation shows from 1280 px; between
  768 and 1279 the sheet menu serves (the six Armenian items do not fit at 1024).
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
targets → one caption line → intro → a single outline CTA (the sticky bottom bar carries "start a
project") → note. No drafting grid on phones, 18–36 field points. Short (< 700 px) and landscape
(< 520 px) rules tighten the top so the stage is reached sooner. Inside the phone stage the Web Viewer
uses compact chips and a smaller toolbar so nothing overlaps.

**Fullscreen on touch devices** is an overlay viewer, not the element-fullscreen API (iOS Safari has none):
a control on the stage opens `.hx-hero-canvas.is-overlay` — the stage fills the screen, the mode strip
sits inside the bottom safe area on the stage colour, a close control sits in the top safe area, scrolling
is locked, and Escape, the back gesture or the control exits (a history entry is pushed so "back" closes
it). Fine pointers keep native fullscreen from the strip. The comparison labels sit at the bottom corners
so the top corners are free for the Live chip and the control.

**Sticky phone bar** (`MobileCta`): 40 px buttons, appears only once the first screen (which has its own
call to action) is scrolled past, retires while the footer is in view, hidden on /start and /contact.

**Phone footer**: shorter statement, the contact rows (they are actions), a two-column link matrix and
social as one row — not the desktop columns stacked. **Phone menu**: full-height rows, no indices, a
segmented language switch, the start button at the bottom. **Start flow**: the choice cards stay
(they are the control); the outer panel is gone — the form sits on the open page under a hairline.

**Light band**: on the light page the platform and closing bands are a deeper paper panel (#EBE7DF) with a
hairline and ink type — separated and important without a black block; dark keeps the graphite panel.
**Audiences** are named symmetrically: Բիզնեսին / Անհատներին, Бизнесу / Частным клиентам, For business /
For individuals. **Start** sits in the page grid: the ask on the left (sticky), the form on the right behind
a vertical rule (a strong rule above it on phones). **Showcase default**: Web Viewer opens first (the model still loads lazily: near-viewport on desktop, tap on phones); no autoplay. The sketch source photo was rotated 90° clockwise and has been re-saved upright (1200 × 900), so it aligns with the render in the comparison. **Field on touch devices**: no pointer listeners without a fine pointer, and non-mouse pointer types are ignored, so scrolling never drags the mesh.
**Comparison slider**: pointer moves never go through React
state — every move (coalesced events included) writes a ref and one requestAnimationFrame paints a
`clip-path` on the "before" layer and the handle position, so nothing re-lays out the images and the divider
tracks the pointer 1:1 at any speed; a 44 px grip on the divider has `touch-action: none` (drag never
scrolls; the rest of the image keeps `pan-y`); ← → 1 unit, Shift ×10; aria values update on release.
**Header logo**: 40 px in the 76 px desktop header, 34 px in the 64 px phone header, preloaded and fetched at high priority so the brand mark is in the first frame; the phone footer has no
logo (the description opens the brand block). **Start, step 1**: an instruction line under the question and
radio rings on the cards, so "choose one" is read before anything is picked; nothing is preselected. **Live 3D on phones**: the 16:9 clip is framed on the furniture in the square stage
(bottom-anchored, 1.32×) so the scene's TV screen no longer fills the top as a black rectangle.
**No public admin link** in the footer.

**Background hierarchy**: from 1024 px the ambient layer is masked horizontally — full presence in the outer
margins, about half behind the content band — so long copy and photographs read effortlessly while the
margins keep the drafting atmosphere. No blur, no glass.

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
the user-initiated cursor response stays at three quarters of its strength without threads (Windows reports "reduce"
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
