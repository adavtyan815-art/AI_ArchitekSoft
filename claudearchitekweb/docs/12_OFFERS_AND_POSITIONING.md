# Positioning, offers and packages (proposal)

*Corrected understanding: ArchiTek Soft is a technology and visualisation partner. It does not sell or manufacture furniture. It helps furniture makers, showrooms and (in B2C cases) end customers choose colours, materials, form and configuration with confidence, in interactive 3D, before anything is produced or ordered.*

## 1. The one sentence

**"See the furniture before it is made."** Everything on the site supports it: the client decides in 3D; the maker produces what was approved.

Secondary lines used across the site:
- "We do not make furniture. We make the decision easy and exact."
- "Web Viewer for every customer. Live 3D for showrooms."
- "The most expensive furniture mistakes happen at the moment of choice. We move the choice into 3D, where changing is free."

## 2. Web Viewer vs Live 3D (product architecture)

| | **Web Viewer** | **Live 3D (Pixel Streaming)** |
|---|---|---|
| What | Light 3D model (GLB/USDZ) in the browser via model-viewer; rotate, zoom, switch colours, AR on phones | Unreal Engine 5 streamed from a GPU server; cinematic light, walkthrough, material switching |
| Who | **Every client** — it is the default deliverable and it is included | **Businesses**: showroom screens, presentations, key customers |
| Cost to run | ~0 (static files, CDN) | GPU minutes ($0.03–0.10/min managed, or your own AWS g4dn) |
| Access | Permanent link `/v/<slug>?k=…` inside the client page `/p/<slug>` | Time-quota + expiry link from `live.architeksoft.com`, shown as a premium button |
| Where on the site | Home section "Try it right now", `/viewer` page, every client page | For business page, solutions (real estate sales offices), FAQ |

Rule of thumb: **Web Viewer scales with clients; Live 3D scales with revenue.** Keep Live 3D inside paid business packages and demos you schedule.

## 3. B2B offers (proposed)

Audience: furniture makers (1–30 people), kitchen studios, showrooms, design studios, developers.

| Package | For whom | Includes | Pricing logic (to fill) |
|---|---|---|---|
| **Pilot** | First real order of a new partner | 1 project in 3D, Web Viewer link + AR, 2 colour options, 48 h | Fixed low price or free for a signed intent; the goal is to get the first customer approval in their pipeline |
| **Studio** (monthly, featured) | Showrooms and studios with 4–10 projects/month | Up to 10 projects/month, branded Web Viewer links (their logo on the client page), unlimited colour options, control panel (client pages, approvals, views), priority turnaround | Monthly retainer; overage per project |
| **Showroom+** | Manufacturers and showrooms | Everything in Studio + Live 3D presentation hours (quota), showroom mode (screen/website embed), KitchenPro documents (cut list, hardware), team access | Higher monthly retainer + Live 3D hours bundle; document exports as add-on per project |

Why this ladder works commercially:
1. **Pilot removes risk** for a maker who has never bought visualisation; you get a real case study.
2. **Studio is recurring revenue** aligned with their order volume; the branded link makes you invisible to their customer (they keep the relationship, you keep the retainer).
3. **Showroom+ monetises Live 3D correctly** — hours are the cost driver, so they are sold as a quota, not unlimited.

Add-ons for any tier: extra colour/layout option, on-site survey, rush 24 h, production documents, embed on their website, a public showroom link with a small monthly quota.

Sales motion: LinkedIn (EN) + direct outreach to makers with a pilot offer; Instagram/Facebook (HY/RU) showcases feed the makers' customers who then ask their maker for "the 3D link".

## 4. B2C offer (proposed)

Audience: households ordering a kitchen or storage furniture from any maker.

**Decision package** (one fixed price by room):
- 3D model of your room at your dimensions
- 2 colour/material options
- Web Viewer link + AR
- 4K images
- **Decision sheet for the maker** (approved option with images, dimensions, decor codes: e.g. EGGER H1180 ST37) — any maker understands it

Add-ons: extra option, on-site survey (Yerevan), production documents if the maker wants a cut list.

Positioning safeguard on every B2C page: **"We do not sell or make furniture. The furniture is made by the maker you choose; on request we recommend partners."** This turns a possible objection ("are you a furniture shop?") into the value proposition (independent, on the client's side) and opens a partner-referral revenue line with makers.

Price logic: fixed by room size (small / medium / large) and number of options; documents priced separately. State the exact figures once decided; the site already has the slots (`homeSegment.packageItems`, `addons`, `pricingNote`).

## 5. Client journeys after the correction

**B2C:** Instagram reel → home → "I am ordering furniture" → `/for-home` (benefits, not-a-seller note, decision package) → `/start?segment=b2c` (5 minutes) → Telegram/CRM lead → 24–48 h → client page `/p/…` with Web Viewer → approve → decision sheet → the client orders from their maker (or a partner you recommend).

**B2B:** LinkedIn / referral → `/for-business` → Pilot → `/start?segment=b2b` → project → branded client page for *their* customer → approval → (optional) KitchenPro documents → Studio retainer → Showroom+ with Live 3D hours.

## 6. What changed in the product because of this

- Dictionaries (hy/ru/en) rewritten: no line implies manufacturing or selling.
- Home: "How we help" (colour & material / form & layout / presentation & approval), Web Viewer demo section, Live 3D framed as premium B2B.
- New `/viewer` page and `/v/<slug>` per-project Web Viewer; client page primary action = Web Viewer, Live 3D secondary/premium.
- Packages renamed and restructured (Pilot / Studio / Showroom+; Decision package + add-ons).
- Admin stage labels: "Documents to the maker", "Production (at the maker)".
- Intake wizard services: Web Viewer links, Live 3D presentation for the showroom, production documents, etc.
