# Testing guide — a 30-minute walkthrough

Start with `start_local.bat` (or `npm run dev`). Everything below works with **no API keys**; integrations show what they *would* do.

## 0. Look and feel (2 min)
- Toggle **light / dark** with the sun/moon button in the header (site) and the top bar (admin). Both modes are designed separately: dark uses graphite surfaces and hairlines, not inverted colours.
- Shrink the window to phone width: sheet menu, sticky "Start a project" bar, card-style admin tables, bottom tab bar in the admin.
- Admin language: **Հայ / Eng** switch in the admin top bar (Armenian by default).

## 1. Client website (5 min)
| Step | URL | What to look for |
|---|---|---|
| Home in Armenian | http://localhost:3100 | Compact entry page: promise + sketch→3D slider, proof strip, KitchenPro intro, two doors (business / customers), Web Viewer + Live 3D entry cards, 3 works, "where next" links. Detail lives on the dedicated pages below |
| Web Viewer page | /viewer | Full demo + Web Viewer vs Live 3D table |
| Live 3D page | /live-3d | Premium demo: audience, session flow, quota note |
| About | /about | Company, approach, technology, facts |
| FAQ | /faq | All questions + sticky contact card |
| Design check | any page | Serif headlines (also in Armenian), mono index numbers and captions, hairlines instead of boxes, monochrome logo; toggle light/dark and resize to a phone — nothing should look like a generic template |
| Russian / English | /ru · /en | Language switch keeps the page; all text translated |
| Platform | /platform | Problem → solution, capabilities, stages 0–6 |
| B2B / B2C | /for-business · /for-home | Different promise, proof and CTA for each audience |
| Other solutions | /solutions | Real estate, showrooms, AR/VR, custom |
| Portfolio | /portfolio → open a project | Gallery lightbox, video, "Open 3D" when a live link exists |
| Mobile | shrink the window to phone width | Menu, cards, wizard usable with a thumb |

## 2. Order intake → CRM → Telegram (5 min)
1. Open http://localhost:3100/start, choose **I'm ordering a kitchen**, fill the room, upload `public/demo/sketch.jpg`, add a phone, send.
2. You get a request number. In the server window you see `[telegram:dry-run] sendMessage …` — with a bot token this arrives in Telegram.
3. Admin → **Leads**: the new lead is first, with the uploaded file. Open it → **Convert to project** → a project `AT-2026-000x` is created with the client and the file.
4. Repeat as **I make furniture** (B2B): a company is created on conversion.

## 3. Client page (5 min)
1. Admin → Projects → *Aren* → tab **Client page** → copy the link (or use the one printed by the seed) → open it in a private window.
2. Check: greeting, stage stepper, **Open the Web Viewer** (primary), AR (QR), Live 3D shown as premium only when set, sketch→3D slider, gallery, video, PDF, materials.
3. Press **I want a change**, write a sentence, send. Admin → Projects → Aren → **Feedback** shows it; the server log shows the Telegram dry-run.
4. Admin → Client pages: views count increased. Try a wrong token and an expired link (set expiry in the past) to see the friendly screens.

## 4. Media and posters (3 min)
Admin → Media: drag a render in; the thumbnail appears; assign it to a project. In the SMM composer generate a **branded poster** (4:5) from a render.

## 5. SMM: generate → approve → publish (7 min)
1. Admin → SMM → **New post** → project Aren → select 2 renders + the video → goal *Showcase*, language *hy*, platforms Facebook/Instagram/LinkedIn/Telegram → Generate.
2. Read the variants (templates without a key; with `ANTHROPIC_API_KEY` Claude writes them). Edit a line; use *Improve with AI* if a key is set.
3. Set a schedule 10 minutes from now → **Send for approval**. Without Telegram it becomes "awaiting approval" in the admin; with Telegram you get the media, text and buttons.
4. Press **Publish now** → each platform shows `simulated` with the exact reason/setup note. With real keys they publish and return links.
5. Admin → Analytics: the SMM section counts the post.

## 6. Telegram for real (10 min, optional)
@BotFather → token → `.env` → restart. Open the bot, `/start`, `/setadmin`. Settings → Telegram → **Send test message**. Redo step 5: approve from the phone, then try **Edit text** → reply with new text → the preview comes back → approve.

## 7. Production build check
```bash
npm run build && npm start
```
Then open http://localhost:3100 — same system in production mode (worker included).

## What to write down while testing
- Wording you want changed (page + sentence) — copy lives in `src/lib/i18n/hy.ts` (and ru/en).
- Packages and prices for `/for-business`.
- Which social platforms to connect first (recommendation: Telegram channel + Facebook/Instagram).
