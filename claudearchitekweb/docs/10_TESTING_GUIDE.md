# Testing guide

Two ways to re-test this system:

- **Part A — the 30-minute walkthrough.** Click through it yourself. No API keys needed; every
  integration says exactly what it *would* do.
- **Part B — the headless method.** A script drives a real Chrome and checks dozens of pages in a
  minute. Used for the September 2026 audit (docs/17_QA_AUDIT_2026-09.md); repeat it after any change.

Read **§0 Data rules** first. The local database is the owner's demo copy and there is no backup of
it in git.

---

## 0. Data rules

| Rule | Why |
|---|---|
| Name everything you create `QA-…` (lead, client, project, post, portfolio item, share link, uploaded file) | So a sweep for `QA-` finds everything a test left behind |
| Delete what you created, through the admin's own Delete buttons | The delete actions also clear linked rows, files and cached image variants |
| Never run `npm run db:reset` or `npm run db:seed` on the demo database | `db:reset` drops and re-seeds; the demo data (9 projects, 8 clients, 11 leads, 6 posts, 3 client pages …) is not recoverable |
| Never edit or rename a seeded record to test something | Use a new `QA-` record instead |
| Put any Setting you change back the way you found it | Above all **Settings → Telegram → admin chat id**: a value left there sends every future approval to that chat |
| Never change the admin password from a test | The password lives only in the database; `.env` seeds it once and is then ignored |
| Keep scripts, logs and screenshots outside the project folder | A stray `.mjs` in the repo ends up in the Docker image |

To start from a clean database instead, copy `.env` to a scratch folder, point `DATABASE_PATH` and
`UPLOAD_DIR` at new paths there, and run `npm run db:seed` against **that** copy.

---

# Part A — the walkthrough

Start with `start_local.bat` (or `npm run dev`) and open http://localhost:3100.
Admin: http://localhost:3100/admin/login.

## A0. Look and feel (2 min)

- Toggle **light / dark** with the sun/moon button in the header (site) and the top bar (admin). Both
  modes are designed separately: dark uses graphite surfaces and hairlines, not inverted colours.
- Shrink the window to phone width (390 px): sheet menu, sticky "Start a project" bar, card-style
  admin tables, bottom tab bar in the admin. **Nothing may scroll sideways** — that is the one layout
  rule the audit checked on every page.
- Admin language: **Հայ / Eng** in the admin top bar (Armenian by default). The admin dictionary is
  hy + en only; the public site is hy / ru / en.

## A1. Client website (5 min)

| Step | URL | What to look for |
|---|---|---|
| Home in Armenian | `/` | Promise + sketch→3D slider, proof strip, KitchenPro intro, two doors (business / customers), Web Viewer + Live 3D cards, 3 works |
| Web Viewer page | `/viewer` | Full demo + Web Viewer vs Live 3D table |
| Live 3D page | `/live-3d` | Premium demo: audience, session flow, quota note |
| Platform | `/platform` | Problem → solution, capabilities, stages 0–6 |
| B2B / B2C | `/for-business` · `/for-home` | Different promise, proof and CTA for each audience |
| Other solutions | `/solutions` | Real estate, showrooms, AR/VR, custom |
| How it works · About · FAQ · Privacy | `/how-it-works` · `/about` · `/faq` · `/privacy` | Company, approach, technology, facts; FAQ has a sticky contact card |
| Portfolio | `/portfolio` → open a project | Gallery lightbox, video, "Open 3D" when a live link exists |
| Russian / English | `/ru` · `/en` | The language switch keeps the page; all text translated |
| **Unknown address** | `/nonsense`, `/en/nonsense`, `/portfolio/nope` | The site's own 404: header + footer, translated headline, 7 links back. HTTP status **404**, not 200 |
| Design check | any page | Serif headlines (also in Armenian), mono index numbers and captions, hairlines instead of boxes, monochrome logo |
| AR demo | `/demo/ar` | Opens the model viewer; `?lang=ru` / `?lang=en` switch the captions |

## A2. Order intake → CRM → Telegram (5 min)

1. `/start` → **I'm ordering a kitchen** → fill the room, upload `public/demo/sketch.jpg`, add a
   phone, send.
2. You get a request number. In the server window: `[telegram:dry-run] sendMessage …` — with a bot
   token this arrives in Telegram instead.
3. Admin → **Leads**: the new lead is first, with the uploaded file. Open it → **Convert to project**
   → a project `AT-2026-00xx` is created with the client and the file.
4. Repeat as **I make furniture** (B2B): a company is created on conversion.
5. Also try `/contact`: shorter form, same pipeline.
6. Error cases worth one minute: submit the wizard with a whitespace-only name, and attach a file
   over the public limit (50 MB per file, at most 8 files; the admin library allows 100 MB). Both
   must answer with a readable message on the form — never a blank page or "Application error".

## A3. Client page (5 min)

1. Admin → Projects → *Aren* → tab **Client page** → copy the link → open it in a private window.
2. Check: greeting, stage stepper, **Open the Web Viewer** (primary), AR (QR), Live 3D shown as
   premium only when set, sketch→3D slider, gallery, video, PDF, materials.
3. Press **I want a change**, write a sentence, send. Admin → Projects → Aren → **Feedback** shows
   it; the server log shows the Telegram dry-run.
4. Admin → Client pages: the views count increased.
5. The four negative states, each a `QA-` link on a `QA-` project:
   - wrong token → 404 with the branded card;
   - unknown slug → 404;
   - **Deactivate** the link → the "this link is closed" page;
   - a link with a passcode → the gate; a wrong code is rejected, and five wrong codes lock that link
     (per address) for 1 minute, then 5, then 15 — the answer is HTTP 429 with the remaining seconds.
6. With **allow download** off, the Download buttons disappear **and** a direct `/media/…?download=1`
   URL is refused. That pair is the whole point of the flag; check both.

## A4. Media and posters (3 min)

Admin → Media: drag a render in; the thumbnail appears; assign it to a project; change Kind and
Project on the detail page and save twice in a row (the second save must not undo the first). In the
SMM composer generate a **branded poster** (4:5) from a render. Delete the `QA-` asset when done.

## A5. SMM: generate → approve → publish, dry run (7 min)

1. Admin → Social media → **New post** → project Aren → select 2 renders + the video → goal *Showcase*,
   language *hy*, platforms Facebook/Instagram/LinkedIn/Telegram → Generate.
2. Read the variants. Without a key they come from the built-in templates; with `ANTHROPIC_API_KEY`
   or `GEMINI_API_KEY` set, that provider writes them and the notice says which one answered. Edit a
   line.
3. **Save**, then **Send for approval**. Without Telegram the post becomes *awaiting approval* and the
   notice says so; with Telegram you get the media, text and buttons on the phone.
4. **Approve**, then **Publish now** → each platform row shows `simulated` with the exact env
   variables it is missing. With real keys they publish and return links.
5. Untick every platform: **Publish now** disappears. It must not be possible to publish a post with
   no enabled platform.
6. Admin → Analytics: the SMM section counts the post. Delete the `QA-` post afterwards.

The post statuses you should see along the way: `draft` → `awaiting_approval` → `approved` →
`publishing` → `published` (or `partially_published` / `failed`); `cancelled` is a dead end and a
published post can no longer be sent back for approval.

## A6. Local file inbox (5 min)

The drop folder is `data/inbox/` (`INBOX_DIR` moves it). Full description: docs/15_INBOX_WORKFLOW.md.

```bash
npm run inbox -- --example     # creates a ready-made example folder
npm run inbox -- --dry-run     # lists what would be imported, changes nothing
npm run inbox                  # imports and sends the suggestion
npm run inbox -- --quiet       # imports without the Telegram / e-mail suggestion
```

Then: copy a folder `QA-walnut kitchen/` with two renders and an optional `post.txt` into
`data/inbox/`, wait for the scan (or run `npm run inbox`), and check that

- the folder moved to `_imported/<date time> QA-walnut kitchen/` — your files are never deleted;
- a draft post exists in Admin → Social media with the images attached and a proposed slot;
- the **Inbox** panel on that page shows the folder path and the last run;
- a folder holding **only** unsupported files and no brief lands in `_failed/` with an `error.txt`
  beside it. An unsupported file next to valid renders does not fail the folder — it is skipped and
  reported on the post (see docs/15_INBOX_WORKFLOW.md §2).

Delete the `QA-` draft post and its assets afterwards.

## A7. Telegram for real (10 min, optional)

@BotFather → token → `.env` → restart. Open the bot, send the `/setadmin <code>` line printed in
**Settings → Telegram** (the code is derived from `APP_SECRET`). Settings → Telegram → **Send test
message**. Redo A5: approve from the phone, then **Edit text** → reply with new text → the preview
comes back → approve. **Approve** only approves; publishing still follows the schedule you set.

Afterwards, clear the admin chat id field again if it was empty when you started.

## A8. Production build check

```bash
npm run build
npm start
```

Open http://localhost:3100 — the same system in production mode (worker included when
`RUN_WORKER_IN_APP=true`). Two things only show up here: the Content-Security-Policy is stricter
(no `unsafe-eval`, no websockets) and there is no dev overlay, so a real error is visible.

---

# Part B — the headless method

## B1. What you need

- **Chrome**, already installed: `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- **puppeteer-core**, installed *outside* the project so it never reaches the build:

  ```cmd
  mkdir %TEMP%\at-qa
  cd %TEMP%\at-qa
  npm i puppeteer-core
  ```

  Version 23.x was used here. It downloads no browser of its own — it drives the Chrome above.

  Write the test scripts in that folder as `.mjs` files.
- The dev server (`npm run dev`) or a production server (`npm run build && npm start`) on port 3100.
  Prefer the production server for anything about hydration or CSP; see §B5.

## B2. The shared helper

Every script starts from one small helper module. This is the version the audit used — keep it, it
encodes the pitfalls below:

```js
// lib.mjs
import puppeteer from "puppeteer-core";

export const BASE = "http://localhost:3100";
export const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
export const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

export async function launch() {
  return puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox"],
  });
}

/** One isolated context per scenario: session, admin_lang and theme cookies never leak. */
export async function newPage(browser, vp = DESKTOP) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page._ctx = ctx;
  await page.setViewport(vp);
  page.issues = [];
  page.on("console", (m) => { if (m.type() === "error") page.issues.push({ type: "console-error", text: m.text() }); });
  page.on("pageerror", (e) => page.issues.push({ type: "pageerror", text: String(e) }));
  page.on("response", (r) => { if (r.status() >= 500) page.issues.push({ type: "http5xx", text: `${r.status()} ${r.url()}` }); });
  return page;
}

export async function login(page, { lang } = {}) {
  if (lang) await page.setCookie({ name: "admin_lang", value: lang, domain: "localhost", path: "/" });
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle0" });
  await page.type('input[name="email"]', "admin@architeksoft.com");
  await page.type('input[name="password"]', "architek2026");
  await Promise.all([
    page.waitForFunction(() => !location.pathname.startsWith("/admin/login") || !!document.querySelector('[role="alert"]')),
    page.click('form button[type="submit"]'),     // scoped — see §B3
  ]);
}

/** Notices are removed from the URL after they render, so poll for the element. */
export async function noticeText(page) {
  for (let i = 0; i < 10; i++) {
    const t = await page.evaluate(() => {
      const el = document.querySelector('[role="status"], [role="alert"], [data-notice], .notice');
      return el ? el.innerText.trim() : null;
    });
    if (t) return t;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** The layout rule: no horizontal scrolling, on any page, at 390 px. */
export async function layoutAudit(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}
```

## B3. The four pitfalls

1. **Scope every form selector to the page.** `page.click('button[type="submit"]')` hits the admin
   top bar's **language-switch** button, not your form, and silently posts `setAdminLangAction`. The
   test then reads as a failure that is not there. Always use `'main form button[type="submit"]'`
   (or `'form button[type="submit"]'` on the login page, which has no shell).
2. **Poll for notices, do not read the URL.** A server action redirects back with
   `?notice=…&tone=…`; the `Notice` component renders the text and then removes the parameters from
   the address bar. Read the DOM, with a short poll (`noticeText` above).
3. **Auto-accept dialogs before clicking a delete.** Deletes go through a `confirm()`:
   `page.on("dialog", d => d.accept())`.
4. **Write one small script per scenario.** Under three minutes each, its own `.json` output. A
   single monolithic script has to be re-run from the start after every failure, and the login at the
   top of it burns most of the time.

Other useful details: the theme toggle is the header button containing a `lucide-sun` /
`lucide-moon` icon and sets `data-theme` on `<html>`; the language switch is
`header form button[name=lang][value=en|hy]`; the global search opens with **Ctrl+K**
(`Cmd+K` on macOS) and shows a "nothing found" row rather than an empty dropdown.

## B4. What each script should assert

For every page load, desktop **and** phone:

| Check | How |
|---|---|
| No 5xx | the `response` listener above |
| No "Application error" / "Internal Server Error" | `document.body.innerText` |
| No console error, no uncaught page error | the `console` / `pageerror` listeners |
| No React hydration message | filter the issues for `/hydrat/i` |
| No horizontal overflow at 390 px | `layoutAudit()` |
| Bottom tab bar pinned (admin, phone) | `position: fixed` and its rect bottom equal to the viewport height |
| Tap targets ≥ 40 px (phone) | measure every `a`/`button` rect height |

Then the module's own behaviour: create → check the notice → edit → save twice → check nothing
reverted → delete → check it is gone.

## B5. Dev server vs production server

Test in **production** (`npm run build && npm start`) when the subject is:

- **hydration** — the Next 15.5 dev server with Turbopack streams RSC segments in a way that
  produces hydration-mismatch noise whose diff names dev-only nodes (`SegmentViewNode`,
  `SegmentTrieNode`). Those are not product bugs and they do not occur under `next start`;
- **Content-Security-Policy** — dev adds `unsafe-eval` and `ws:`/`wss:` for hot reload, production
  has neither;
- **performance** — dev compiles on demand, so the first hit of every route is slow.

Everything else behaves the same on both.

## B6. Modules and what to cover

Nine modules, the same split the audit used. Each needs desktop 1440×900 and phone 390×844, and the
admin ones need both admin languages (hy, en).

| Module | Routes | Cover |
|---|---|---|
| Auth + shell | `/admin/login`, every admin page | Empty / wrong / unknown login, the generic error message, `?next=` deep link, logout, sidebar + bottom bar, language, theme, global search (latin, Armenian, Cyrillic, `%`, `_`) |
| Overview + analytics | `/admin`, `/admin/analytics` | KPI cards, the 7/30/90-day ranges, empty states, money formatting on a phone |
| Leads | `/admin/leads` (+ `?view=board`), `/new`, `/:id`, and public `/start`, `/contact` | Create, edit, status change, convert to project, delete; required-field errors; wildcard characters in search |
| Clients, companies, tasks | `/admin/clients`, `/admin/companies`, `/admin/tasks` | Create, save twice, delete (and what the confirm text promises to delete); an unparseable due date must not break the Tasks page |
| Projects | `/admin/projects`, `/new`, `/:id` (overview, media, client, deliverables, feedback, timeline) | Stage filter, stage change, the six tabs, timeline note, delete |
| Media + portfolio | `/admin/media`, `/admin/media/:id`, `/media/<path>`, `/admin/portfolio`, `/portfolio` | Upload, kind filter, bulk assign (then a second click must not unassign), delete; publish/hide a portfolio item and check the public URL follows |
| SMM | `/admin/smm` (`calendar`, `drafts`, `published`, `all`), `/admin/smm/new`, `/admin/smm/:id` | The whole lifecycle in A5, plus the poster generator and the inbox panel |
| Settings + Live + client pages | `/admin/settings?tab=brand\|smm\|telegram\|integrations\|live\|security`, `/admin/live`, `/admin/pages` | Every tab saves and reloads with the saved value; Security rejects a wrong current password; Live 3D shows "not configured" without credentials |
| Client portal | `/p/<slug>`, `/v/<slug>`, `/api/portal/*` | Everything in A3, from a cookie-less browser |

## B7. Lint, types, build, performance

```bash
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit
npm run build        # next build
npm run perf         # node scripts/perf.mjs  — needs a server on 3100
```

All four must be clean before a release. `npm run perf` accepts a base URL and a run count
(`npm run perf -- http://localhost:3100 5`) and reads two optional variables:

- `PERF_SHARE_URL` — a client page to time, e.g. `/p/aren-living?k=…`;
- `PERF_COOKIE` — an admin session cookie, so the `/admin` rows measure real pages instead of the
  redirect to the login form.

Rows that measured the wrong thing (a redirect, a non-200, a client page too small to be the real
page) are marked and left out of the averages. Compare the result with the table in
docs/13_PERFORMANCE.md — and measure a production server, not `npm run dev`.

## B8. Finishing a test run

1. Delete every `QA-` record through the admin UI (that also removes the files and the cached image
   variants).
2. Check nothing is left: type `QA-` into the admin global search (**Ctrl+K**), then open Leads,
   Clients, Companies, Projects, Tasks, Media, Portfolio, Social media and Client pages — no `QA-`
   row anywhere. The search does not cover every table, so the list walk is the real check.
3. Put back any Setting you changed; the Telegram admin chat id must end as an empty string unless it
   had a value when you started.
4. Delete the `QA-` folders under `data/inbox/_imported/` and `data/inbox/_failed/` if you used the
   inbox.

## What to write down while testing

- Wording you want changed (page + sentence) — the copy lives in `src/lib/i18n/hy.ts` (and `ru.ts`,
  `en.ts`); the admin dictionary is `hy` + `en`.
- Packages and prices for `/for-business`.
- Which social platforms to connect first (recommendation: Telegram channel + Facebook/Instagram).
