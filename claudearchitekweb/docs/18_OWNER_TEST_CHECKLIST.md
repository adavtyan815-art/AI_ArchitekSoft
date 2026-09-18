# 18 — Owner test checklist

A tick-box acceptance test of everything delivered in the September 2026 audit round (docs/17): the
public website, the admin panel, the client pages, social-media publishing, the local file inbox,
and the production build. Every line is something you do and what you should see.

**How to use it.** Work top to bottom. Tick `[x]` when the result matches; when it does not, write
the section number, what you did and what you saw in the **Findings** table at the end. You need no
API keys: without them every integration runs as a dry run and says so.

**Time.** About 2½ hours for sections 0–16. Section 14 (production build) and section 15 (going
live) are separate sittings.

**What you need.** The PC with the project, Chrome, and a phone on the same Wi-Fi (or Chrome's
device toolbar at 390 px wide). Optional: the Telegram app for section 13.

---

## 0. Before you start

- [ ] Start the system: double-click `start_local.bat` (or run `npm run dev` in `claudearchitekweb`).
      The browser opens by itself once the server answers.
- [ ] Open http://localhost:3100/admin/login and sign in with your admin account.
- [ ] Switch the admin to English with **Eng** in the top bar. The labels below are the English ones;
      switch back to **Հայ** at the end and repeat any screen you like — every label has an Armenian
      version.
- [ ] Write down the current value of **Settings → Telegram → admin chat id** (usually empty). You
      will restore it in section 16.

**Rules for the whole test**

| Rule | Why |
|---|---|
| Name everything you create `QA-…` | Section 16 finds and removes it by that prefix |
| Delete test records with the admin's own **Delete** buttons | They also remove linked tasks, timeline rows, files and cached images |
| Do not edit or rename the demo records (Aren, Walnut kitchen …) | Use a new `QA-` record instead |
| Never run `npm run db:reset` or `npm run db:seed` | They replace the demo database, which has no copy in git |

---

## 1. Look, theme and phone layout (5 min)

- [ ] **Light / dark**: the sun/moon button in the site header and in the admin top bar switches the
      theme; reload — the choice is kept.
- [ ] **Phone width**: on a phone (or Chrome at 390 px), open the home page, `/start`, `/admin`,
      `/admin/leads`, `/admin/projects`, `/admin/media`, `/admin/pages`, `/admin/tasks`. On **none** of
      them can the page be dragged sideways.
- [ ] **Admin bottom bar (phone)**: four tabs — Overview, Leads, Projects, Social — plus **More**.
      The bar stays pinned to the bottom on every admin page, including long lists.
- [ ] **More sheet**: opens with the other modules (Media, Clients, Companies, Tasks, Client pages,
      Live 3D, Portfolio, Analytics, Settings); the page behind it does not scroll; **Esc** or the
      close button closes it. On a page reached through More (e.g. Tasks), **More** is highlighted.
- [ ] **Tap targets (phone)**: buttons, footer contact rows and footer links are comfortably
      finger-sized — nothing needs a second try to hit.

## 2. Public website (20 min)

### 2.1 Pages and languages

- [ ] Open each page in Armenian (no prefix), then with `/ru` and `/en` in front: `/`, `/platform`,
      `/for-business`, `/for-home`, `/viewer`, `/live-3d`, `/solutions`, `/how-it-works`,
      `/portfolio`, one portfolio item, `/about`, `/faq`, `/privacy`, `/contact`, `/start`.
      Every page loads and every text is in the chosen language.
- [ ] The language switch in the header keeps you on the same page.
- [ ] **Portfolio item**: the gallery opens in a lightbox; arrow keys move; closing returns you to the
      thumbnail you clicked.
- [ ] **Home showcase**: the sketch → 3D slider drags with mouse and finger; arrow keys move the
      slider when it has focus.
- [ ] **Web Viewer page**: colour swatches change the model; each swatch is easy to tap on a phone.
- [ ] **AR demo** `/demo/ar`, then `/demo/ar?lang=ru` and `?lang=en`: the model opens; the captions
      follow the `lang` value.
- [ ] **No technology names**: nowhere on the public site do you see engine, cloud or framework names
      (the site describes what it does, not how it is built).

### 2.2 The 404 page

- [ ] Open `/nonsense`, `/en/nonsense` and `/portfolio/does-not-exist`. Each shows the site's own
      "not found" page with the header, footer and links back, in the right language — not a plain
      black-on-white page.

### 2.3 Start wizard (`/start`)

- [ ] Press **Next** on step 1 without choosing: the message "Choose one of the options" appears and
      the first card gets focus. On a phone the message appears **in the bottom bar**, where you can
      see it.
- [ ] Choose **I'm ordering furniture** (B2C) → room, dimensions, style, budget → **Next**.
- [ ] Files step: attach `public/demo/sketch.jpg`. "I have no files right now" is a full-width
      button, not a small link.
- [ ] Contact step: press **Send** with an empty name → the name field turns red with its own
      message and gets focus.
- [ ] Fill name `QA-Wizard B2C`, a phone, a Telegram handle in the **Telegram** field, tick consent,
      **Send**. You see "Request sent", a **request number** with a copy button, and the channel you
      picked.
- [ ] Repeat once as **I make or sell furniture** (B2B) with company `QA-Wizard Co`.
- [ ] `/start?segment=b2b` opens with the business card already chosen.

### 2.4 Contact form (`/contact`)

- [ ] Send with an empty name → a field-level error, not "something went wrong".
- [ ] Send `QA-Contact` with a phone and a Telegram handle → confirmation with a request number.
- [ ] In Admin → Leads, open this lead: the Telegram handle is in the **Telegram** field, not in the
      phone field.

### 2.5 Tracking

- [ ] Click two "Start a project" buttons on the home page, then open Admin → Analytics → 7 days:
      **CTA clicks** and **form submits** have increased.

## 3. Admin sign-in and shell (10 min)

- [ ] Sign out. On the login page, try a wrong password with the admin in Armenian: the error is in
      Armenian, and the e-mail you typed is still there.
- [ ] While signed out, open http://localhost:3100/admin/leads?view=board, then sign in: you land on
      the **leads board**, not the Overview.
- [ ] While signed in, open `/admin/login?next=/admin/tasks`: you go straight to Tasks.
- [ ] Open `/admin/does-not-exist`: a "not found" page **inside** the admin, with the sidebar.
- [ ] **Global search** (**Ctrl+K**): the hint reads `Ctrl K`. Try:
  - [ ] `Davit Sargsyan` (first + last name) → the client is found;
  - [ ] `անի` (lower case Armenian) and `мария` (lower case Russian) → matches are found;
  - [ ] a file caption or file name from Media → the file is found;
  - [ ] `%` and `_` → no results (they are not wildcards);
  - [ ] `QA-zzqq` → a "Nothing found" row;
  - [ ] ↓ / ↑ move through results, **Enter** opens one, **Esc** closes the list.
- [ ] Switch Հայ ↔ Eng on a form with unsaved text (e.g. Leads → New): the page switches language and
      keeps what you typed.

## 4. Overview and analytics (10 min)

- [ ] Overview: each of the eight cards is a link to the list it counts (click the card, not the
      number).
- [ ] The leads chart shows 30 days including days with no leads (no gaps in the axis).
- [ ] Money: totals in different currencies are shown side by side (`1,500,000 ֏ · 5,000 USD`),
      never added together. On a phone the amount and currency stay together.
- [ ] Upcoming posts: a post whose time has already passed is marked as overdue.
- [ ] A client-feedback item opens the project's **Feedback** tab.
- [ ] Analytics: switch 7 / 30 / 90 days; every panel follows, including "top client pages".
- [ ] The revenue chart is labelled by project start month, with the currency shown.
- [ ] On a phone, the "Top pages" and "Top client links" tables are compact two-column tables, not
      long key/value cards.

## 5. Leads (15 min)

- [ ] Your `QA-` leads from section 2 are at the top of Admin → Leads, each with its request number.
- [ ] Search a lead by its request number (with and without `#`).
- [ ] Search a phone number without spaces (e.g. `99000777` for `+374 99 000 777`) → found.
- [ ] Filter B2B / B2C: the status tab counts change with the filter and the search.
- [ ] Board view (`?view=board`): a long name wraps inside its card and does not spill over the
      other columns.
- [ ] **New lead** with a name of only spaces → the form answers "name is required"; nothing is
      created, no error page.
- [ ] New lead `QA-Manual` with no phone, e-mail or Telegram → refused (at least one is required).
- [ ] Estimated value `1.2.3` → refused; `1 500,50` → accepted as 1500.50.
- [ ] Edit the wizard lead: the room type the visitor chose is still selected; save without changes
      → nothing is lost.
- [ ] **Assigned to** is a picker (admin users + Nobody). Change it → the timeline records it.
- [ ] Change status to **lost** with a reason, then back to **contacted** → the lost reason is gone.
- [ ] **Convert to project** on the B2C wizard lead → a project `AT-2026-00xx` opens with the client,
      the budget in the quote and the uploaded sketch in its media. Click Convert again → it opens the
      same project, no duplicate.
- [ ] Convert the B2B lead → a company `QA-Wizard Co` is created with the contact.
- [ ] Open tasks: create a task linked to a lead (section 6) → it appears in the lead's **Open tasks**
      panel.

## 6. Clients, companies, tasks (15 min)

- [ ] Clients: create `QA-Client` → set Status VIP, Language English, Source Telegram → **Save**.
      The dropdowns show exactly what you saved. Change only the city → **Save** again → status,
      language and source are **unchanged** (this used to revert).
- [ ] Do the same on a `QA-Company` (type, status).
- [ ] A website typed as `example.am` is saved as `https://example.am`; `javascript:alert(1)` is
      refused.
- [ ] Every save shows a confirmation message at the top.
- [ ] Tasks: add `QA-Task` due today → shown as open, not overdue.
- [ ] Add a task with the date `2026-02-30` (type it if the date picker allows) → a date error on the
      form; the Tasks page keeps working.
- [ ] Link a task to `QA-Client` → it shows on the client's page under **Open tasks**; overdue tasks
      say "overdue" in words.
- [ ] On a phone, the three task counters sit in one row with no empty grey box.
- [ ] Delete `QA-Company`: the confirm text says contacts become individuals and linked tasks and
      timeline are removed; after deleting, its contact is listed under **Individuals**.

## 7. Projects (15 min)

- [ ] Projects list on a phone: the stage row scrolls inside itself; the page does not widen.
- [ ] **New project** with a title of only spaces → inline error, nothing created.
- [ ] Open your `QA-` project from section 5. **Overview**: change Status and Stage → **Save** →
      "Saved"; change only Materials → **Save** → status and stage are unchanged.
- [ ] Quote `1.2.3` → refused; a negative amount → refused.
- [ ] **Media** tab: upload a render; set it as **Cover**; try to set a JPEG as the **PDF** role →
      refused. The eye toggle is labelled as "show on website".
- [ ] **Deliverables**: a viewer URL that is not `http(s)` is refused.
- [ ] **Timeline**: add a note → it appears; a note of only spaces → refused.
- [ ] **Client page** tab: covered in section 9.
- [ ] Delete the `QA-` project (after section 9): its files become unassigned **and private**.

## 8. Media and portfolio (15 min)

- [ ] Media: drag in a small `QA-render.jpg` → a thumbnail appears.
- [ ] The upload hint says **100 MB**; a file over 100 MB is refused with a clear "too large" message.
- [ ] A text file renamed to `.png` is refused.
- [ ] Open the file: change **Kind** and **Project** → **Save**; change only the caption → **Save** →
      kind and project are unchanged.
- [ ] Select two files → **Assign** to a project → a message confirms it and the selection is
      cleared (a second click cannot unassign them).
- [ ] On a phone, `/admin/media` fits the screen and the checkboxes are easy to tap.
- [ ] Portfolio: **Create from project** on a project → the new item is **hidden** (Published
      unticked), contains only public files and has an empty summary.
- [ ] Rename it `QA-Portfolio`, tick **Published**, save → it appears on `/portfolio`. A private file
      picked for it does **not** appear on the public page.
- [ ] Untick Published → its public address answers the 404 page; the admin "Public page" button is
      not offered for a hidden item.
- [ ] Delete `QA-Portfolio` and `QA-render.jpg`.

## 9. Client pages (20 min)

Use your `QA-` project. Open links in a **private (incognito) window** so you see what the client
sees.

- [ ] Project → **Client page** → create a link (language hy). Copy it and open it: greeting, stage
      stepper, **Open the Web Viewer**, gallery, materials, and the cover image near the top.
- [ ] Phone: the sticky bottom bar shows the full button labels; the page footer is not hidden
      behind it.
- [ ] **Feedback**: choose "I want a change", write a sentence, switch to "I approve" → the text you
      typed does not silently go with the approval. Send a change request → it appears under the
      project's **Feedback** tab and in Overview.
- [ ] A long pasted link in feedback wraps; the phone page does not widen.
- [ ] Approve twice → the second approval is refused politely.
- [ ] On a project at the production stage, "I approve this option" is no longer offered.
- [ ] Admin → Client pages: the view count went up.
- [ ] **Wrong key** (change one letter after `k=`), **no key**, **unknown slug** → the branded "not
      found" page.
- [ ] **Passcode link**: create a second link with a 6-character passcode. A 4-character passcode is
      refused.
  - [ ] The gate explains the code format and offers a way to contact you.
  - [ ] Five wrong codes → "Too many attempts. Try again in 1 min." The right code works after the
        wait.
- [ ] **Downloads off**: on a third link untick **Allow download**. The Download buttons disappear,
      and pasting a file address with `?download=1` into a fresh private window is refused.
- [ ] **Deactivate** a link → it shows the "this link is closed" page (not the 404 page). A link
      whose expiry date has passed shows the same page. An expiry of 0 or a negative number of days
      is not accepted as "already expired" — it means no expiry.
- [ ] Viewer switched off on a link → `/v/…` sends you back to the client page.
- [ ] AR: on a computer the AR button shows a QR code; on a phone it offers AR directly.

## 10. Social media — the first test post, dry run (25 min)

### 10.1 Composer

- [ ] Admin → Social media: the connections row shows every platform as **dry run** (TikTok as
      **manual**) and the copywriter in use (**template** without an AI key).
- [ ] **New post**: the platforms come from Settings, and the date is pre-filled with the next
      posting slot (Tue/Thu/Sat 11:00 by default).
- [ ] Choose project Aren and 2 renders only, tick YouTube → you are warned that YouTube needs a
      video. Then add the video, goal **Showcase**, language hy, all six platforms.
- [ ] Generate a **poster** 4:5 from a render → it becomes the first image.
- [ ] Change the project → media from the old project is removed and the page says so.
- [ ] **Generate** → the editor opens with one card per platform.

### 10.2 Editor

- [ ] Each card has Enabled, format, text, call to action, hashtags with an *n*/40 counter. Only
      YouTube and LinkedIn show a headline.
- [ ] Telegram's counter drops to 1024 once media is attached.
- [ ] The template copy talks about the project's real type (living room for Aren), not "kitchen",
      and has no duplicated hashtags.
- [ ] Edit a text and do **not** save → Save shows the "unsaved" dot.
- [ ] **Improve with AI** without a key → a clear refusal, not the same text returned.
- [ ] Rename the post `QA-First post` → **Save** → "Saved".

### 10.3 Approval and publish

- [ ] **Send for approval** (with the unsaved edit from above) → the edit is saved first; the post
      becomes **awaiting approval**; the message says Telegram is not configured.
- [ ] **Approve** → **approved**.
- [ ] **Publish now** → a confirmation dialog, then every card shows **Simulated** in a neutral
      colour with a "Last dry run" note naming the exact missing settings. The post is
      **published** (all simulated). Nothing claims a real publication.
- [ ] The post now appears under **Published**; it can no longer be sent for approval or cancelled.
- [ ] **Duplicate** it → a new draft. Untick every platform on the copy → **Publish now** disappears.
      From the hub, the same post's publish action is refused with "No platform is enabled".

### 10.4 Scheduling (needs the worker running, i.e. the normal start)

- [ ] Duplicate once more, schedule it **3 minutes ahead**, **Send for approval**, **Approve**. With
      auto-publish on (Settings → Social media), within about a minute of the time the post becomes
      **published** — exactly once (one set of variant results).
- [ ] A time in the past is refused when you set it.
- [ ] Hub tabs: Queue, Calendar (try `?month=2026-13` → current month shown), Drafts, Published, All
      all load; a post in the past is marked overdue on the Overview.

## 11. Local file inbox (20 min)

The drop folder is `claudearchitekweb\data\inbox\`. Full guide: docs/15_INBOX_WORKFLOW.md.

- [ ] Admin → Social media → **File inbox** panel shows the folder path and "empty".
- [ ] `data\inbox\README.txt` exists and explains the folder in Armenian and English.

**Automatic path (no clicks)**

- [ ] Create folder `data\inbox\QA-walnut kitchen\`, copy 2 renders from `public\demo\` into it, and
      a `post.txt` saved from Notepad:

      ```
      language: hy
      platforms: facebook, instagram, telegram
      project: AT-2026-0003
      ---
      Walnut kitchen for a family in Yerevan.
      ```

- [ ] Within about a minute the panel first shows **Still copying**, then the folder disappears from
      the panel and a draft appears at the top of the list with a **from inbox** badge.
- [ ] The folder moved to `data\inbox\_imported\<date time> QA-walnut kitchen\` with all your files.
- [ ] Open the draft: the banner names the folder and the suggested slot; **Use suggested slot**
      fills in the schedule. The notes say the description was not used (no AI key) and keep your
      text.
- [ ] Continue as in 10.3: Save → Send for approval → Approve → Publish now → all simulated.

**Button and terminal paths**

- [ ] Copy a second folder `QA-Առանց նամակի` (Armenian name, no `post.txt`, one render) and press
      **Import now** → imported; the draft uses generic "project" wording.
- [ ] In a terminal in `claudearchitekweb`: `npm run inbox -- --example`, then
      `npm run inbox -- --dry-run` (shows WAITING, then READY after 30 s), then `npm run inbox` →
      "OK post …" with the slot and the new folder location.
- [ ] Save a `post.txt` as **Unicode** in Notepad (UTF-16) with `schedule: auto` → the post is
      created as **scheduled**, not draft.

**Edge cases**

- [ ] A folder with one render plus `plans.zip` → the post has the render; the zip is reported as
      skipped in the notes.
- [ ] A folder with only a `.docx` and no brief → moved to `_failed\` with an `error.txt` saying why.
- [ ] A brief with an unknown key (`sparkle: yes`) → the post is created; the key is reported as a
      warning.
- [ ] Open a render from an inbox folder in an image editor (keep it open) → the panel reports the
      folder as **blocked** ("a file in this folder is open in another program"); close it → it is
      imported on the next check.
- [ ] Click **Import now** at the same moment the automatic import runs → one post only, and no red
      "still being copied" error.

## 12. Settings, Live 3D, Security (15 min)

- [ ] **Brand**: clear the company name → "Company name is required", and the other fields keep what
      you typed. Enter `not-an-email` → refused. Put everything back and save.
- [ ] **Social media**: posting time `25:99` → refused; untick every posting day → refused. Restore.
- [ ] **Telegram**: no webhook address is offered; while no admin chat is stored the `/setadmin`
      code is shown; **Send test message** without a bot token says nothing was sent and why.
- [ ] **Integrations**: every platform with its status and the exact variable names it needs; the
      AI provider; `APP_URL`, database and upload paths; worker mode.
- [ ] **Live 3D** tab: a backend URL starting `http://` (not localhost) is refused.
- [ ] Admin → Live 3D → create a session without credentials → a clear dry-run message with the
      would-be link (never "NEXT_REDIRECT"); nothing is written to a project.
- [ ] **Security**: a password change with a wrong **current** password is refused; a new password of
      7 characters is refused. (Change it for real only if you mean to — it signs out your other
      sessions.)
- [ ] Any settings tab: after a rejected save, what you typed is still in the form and the wrong
      field is marked.

## 13. Telegram for real (optional, 15 min)

Needs `TELEGRAM_BOT_TOKEN` in `.env` and a restart. Details: docs/16 §3.

- [ ] Send the bot `/setadmin <code>` (code from Settings → Telegram) → the chat is bound; the code
      panel disappears.
- [ ] `/status` → the counts of posts awaiting approval and scheduled.
- [ ] Settings → Telegram → **Send test message** → arrives.
- [ ] Send a `QA-` post for approval → the phone gets the media, text and buttons. **Approve** only
      approves (it respects the schedule). An old approval message's buttons answer "Too late".
- [ ] **Edit** → reply to the bot's prompt with new text → the updated preview comes back.
- [ ] Submit a `QA-` lead on `/start` → the new-lead message arrives.
- [ ] With the bot, drop a `QA-` inbox folder → the suggestion arrives with **Send for approval**.

## 14. Production build (separate sitting, 15 min)

- [ ] Stop the dev server. In `claudearchitekweb`: `npm run lint`, `npm run typecheck`,
      `npm run build` → all finish without errors.
- [ ] `npm start` → open http://localhost:3100. Repeat quickly: home in three languages, sign in, every
      admin module, one client page. No error pages; in Chrome DevTools → Console, no red errors
      (the occasional development-only "hydration" warning must **not** appear here).
- [ ] The server window shows `[worker] started` — the scheduler and inbox run inside the app.
- [ ] The window also warns if `APP_SECRET` is missing or short — expected on this PC; it must be
      fixed before a real deployment (section 15).
- [ ] Stop `npm start` and go back to `start_local.bat` for daily use.

## 15. Before going live (separate sitting)

Follow docs/16_FIRST_TEST_POST.md §2 and §4. Tick each when done.

- [ ] `.env`: `APP_SECRET` set to 32+ random characters; `APP_URL` is the real `https://` address;
      `ADMIN_PASSWORD` is not the demo one.
- [ ] Decide the open questions in docs/17 §4 (upload limit and Cloudflare, `/setadmin`, Telegram
      approve behaviour) — or accept the defaults.
- [ ] Telegram: bot token, admin chat bound, channel id set, bot is a channel admin.
- [ ] Facebook: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`.
- [ ] Instagram: `META_IG_USER_ID` (+ the same page token) and a public `https` `APP_URL`.
- [ ] LinkedIn: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN` as `urn:li:organization:<number>`.
- [ ] YouTube: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` (uploads stay
      private until Google verifies the app).
- [ ] TikTok: nothing to set — posted by hand from the prepared caption.
- [ ] Optional AI copywriter: `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`.
- [ ] After a restart, Admin → Social media shows each configured platform as **connected**.
- [ ] Publish one `QA-` post to **one** platform first, open the returned link, then delete the test
      post on that platform (docs/16 §4.3).

## 16. Clean-up (10 min)

- [ ] Delete every `QA-` record with the admin's Delete buttons: leads, clients, companies, projects
      (and their links), tasks, media files, portfolio items, social posts.
- [ ] Check each list — Leads, Clients, Companies, Projects, Tasks, Media, Portfolio, Social media,
      Client pages — shows no `QA-` row. (Global search does not cover every table; the lists do.)
- [ ] Delete the `QA-` folders under `data\inbox\_imported\` and `data\inbox\_failed\`.
- [ ] Settings → Telegram → admin chat id is back to what you wrote down in section 0 (tick
      **Clear the admin chat id** if it should be empty).
- [ ] Any other Setting you changed is back.

---

## Findings

| # | Section | What I did | What I saw | What I expected |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## Sign-off

| Part | Date | Result (pass / issues) | Initials |
|---|---|---|---|
| 1–2 Look + public website | | | |
| 3–8 Admin modules | | | |
| 9 Client pages | | | |
| 10–11 Social media + inbox | | | |
| 12–13 Settings + Telegram | | | |
| 14 Production build | | | |
| 15 Ready to go live | | | |
