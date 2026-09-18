# Dashboard, CRM, projects, media, client pages, Live 3D

Log in at `/admin`. The owner account is created once from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (locally `admin@architeksoft.com` / `architek2026` — a published testing default, never to be carried to a server: with `NODE_ENV=production` the app refuses to create the account with it). The password is changed afterwards in Settings → Security, not in `.env`. The admin is **Armenian by default** with an English switch in the top bar; light/dark theme toggle next to it. On phones the sidebar becomes a bottom tab bar and tables become cards.

Two rules hold across every module and are not repeated in each section:

- **Every save and every delete ends in a sentence.** Actions redirect back with `?notice=…&tone=ok|error`, the page renders it, and the parameter is removed from the address afterwards. A rejected form says which field is wrong, in the interface language, and writes nothing.
- **Every multi-row write is one SQLite transaction.** A failure half-way never leaves an orphan company, a client without a project, or files attached to nothing.

## Overview

Eight KPI cards; the whole card is a link to the list it counts, so the tap target is the card and not the number.

| Card | Figure | Hint under it |
|---|---|---|
| New leads | leads with status `new` | leads in the last 30 days, and how many of them are B2B |
| Active projects | projects with status `active` | how many are finished |
| Pipeline | quoted value of active projects, per currency | paid total, per currency |
| Posts awaiting approval | posts in `awaiting_approval` | scheduled, and published in the last 30 days |
| Companies | company rows | how many contacts belong to them |
| Individuals | clients of kind `individual` | — |
| Client pages | active share links | views in the last 30 days |
| Feedback / tasks | unresolved feedback / open tasks | — |

Panels: leads per day for the last 30 days (B2B vs B2C, zero-filled so the axis really shows 30 days) with lead sources and requested room types beside it (both last 30 days — they sit under a "leads" heading, so both are about leads, not projects), pipeline by stage (active projects), the six newest leads, five unresolved client feedback entries, and the next five posts (undated ones last, overdue ones marked).

Days are **Yerevan days**, not UTC days: a lead at 02:30 Yerevan belongs to that morning. Money is summed **per currency and never across currencies** — a total reads `1,500,000 ֏ · 5,000 USD`, never one merged number.

### Global search

`Ctrl+K` (`⌘K` on macOS), or the search field in the top bar. From two characters it queries `/api/admin/search` and returns at most 5 hits per type and 15 in total:

| Type | Matched on |
|---|---|
| Lead | name, phone, company name, e-mail, request number |
| Client | first + last name as one string, last name, phone, e-mail |
| Company | name |
| Project | title, code |
| Post | title, core text |
| Media file | original file name, caption, tags |

Matching is a literal, Unicode-aware substring test (a `lower_u` function registered on the SQLite connection), so `անի` finds `Անի` and `мария` finds `Мария`, and `%` or `_` in the query are ordinary characters.

## CRM

### Leads

Every request from the website (wizard or contact form) or entered by hand (phone, Instagram DM). Fields: segment (B2B/B2C), status, source, service, room, budget, estimated value + currency, message, structured details from the wizard, uploaded files, UTM, landing page, language, preferred channel, assigned to.

| List | Values |
|---|---|
| Status | `new` · `contacted` · `qualified` · `proposal` · `won` · `lost` |
| Source | `website` · `instagram` · `facebook` · `linkedin` · `telegram` · `whatsapp` · `phone` · `referral` · `youtube` · `other` |
| Segment | `b2b` · `b2c` |

**Request number.** The visitor is given the last six characters of the lead id in upper case (`A7F3C1`). The leads search finds a lead by it (with or without a leading `#`), and so does global search.

**Views.** Table with status tabs, or board grouped by status. The B2B/B2C filter and the search apply to both; the status tabs only narrow the table. The tab counts follow the segment filter and the search, so a filtered list and its tabs always agree. Lists stop at 500 rows and say `showing 500 of 812` instead of cutting silently.

**Search behaviour** (the same helper backs the leads, clients, companies and projects lists):

- every word of the query must appear in at least one searchable column, so `First Last` finds a person whose names live in two columns;
- `%` and `_` are matched literally;
- Armenian and Cyrillic words are also tried in lower, upper and title case, because SQLite's `LIKE` folds ASCII only;
- a query made of digits and phone punctuation with at least five digits is additionally compared against the phone columns with spaces, dashes and brackets removed, so `99000777` finds `+374 99 000 777`;
- at most six words are used.

**Validation.** Name is required (whitespace only is rejected). At least one of phone, e-mail or Telegram must be filled — the same rule the public `/api/leads` applies, because a lead nobody can call back is not a lead. Phone and e-mail are format-checked. The estimated value is parsed strictly: `3,5`, `1 500,50`, `1,500` and `1.500,50` are numbers, `1-2`, `1.2.3` and `12abc` are refused instead of being stored as `0`, and negatives are refused. Service and room must come from the same lists the website wizard offers — plus whatever is already stored on that lead, so saving an untouched form can never null a value the visitor picked. Field limits: name and company 120, phone 40, e-mail 120, Telegram 60, budget 80, assigned to 80, currency 6, message 4000 characters.

**Assigned to** is a picker over the admin users table plus *Nobody*, not free text. A name stored earlier — including one belonging to a user that no longer exists — stays selectable and is never dropped by a save. The column stores the name, which is what the list, the detail page and the timeline show. Assigning leads to people without an admin login means creating those users in the `users` table; there is no screen for that yet.

**Status.** Changing the status writes a timeline entry. Leaving `lost` clears the lost reason, so a reopened lead no longer shows "chose a competitor".

**Convert to project** (one transaction, and idempotent — a second click opens the project that already exists):

1. B2B: find the company by its normalised name (NFC, collapsed whitespace, Unicode lower case, so `Вуд Дримс` and `вуд дримс` are one company) or create it.
2. Find the person by a normalised phone number (digits only, `0XX XXXXXX` and bare 8-digit numbers canonicalised to `374…`), scoped to that company, or create the client / contact.
3. Create the project with the next code, copying the lead's estimated value and currency into the quote, the message into the description, and the wizard's dimensions and style into the room and materials fields.
4. Move the files **this lead** claimed on arrival into the project. An asset id that belongs to somebody else is never moved.
5. Move the lead to `qualified` when it was `new` or `contacted`, and write the timeline entries.

**Timeline.** Notes, calls, meetings and system events. System events are stored in a language-independent form and rendered in the reader's language, so a lead that arrived while the admin was in English still reads correctly in Armenian.

### Clients and companies

**Clients** — *Individuals* (B2C) and *Contacts* (people inside companies), as two tabs whose counts follow the search. A contact that loses its company automatically becomes an individual (a database trigger, so it also holds when the company row disappears).

**Companies** — manufacturers, studios, retailers, developers, architects, other; filtered by type, with contact counts and quoted totals per currency in the list.

Validation: first name (client) and name (company) are required; e-mail is checked with the e-mail rule, phone and WhatsApp with the phone rule; a website typed as `kahuyq.am` is stored as `https://kahuyq.am`, and anything that is not an http(s) address is refused. Moving a client into or out of a company is written on that company's timeline as well.

Each detail page shows contact links, the projects with **quoted and paid totals per currency**, the timeline, and the open-tasks panel.

### Tasks

Title (≤200 characters), due day, priority (`low` / `normal` / `high`) and an optional link to a lead, client, company or project. The link is validated: a record that no longer exists refuses the task instead of creating a dead row, and half a link (a type without an id) is stored as no link.

A due day is stored as **23:59:59 Yerevan**, so a task due today turns overdue only after its day ends. `2026-02-30` is refused as a date instead of rolling over to 2 March.

`/admin/tasks` shows open, overdue and done counts; the open list is complete (that is what the page is for) and the done archive is capped at 200 rows with a `showing n of m` line.

**Open-tasks panels.** Lead, client and company detail pages each render the open tasks attached to that record — earliest due date first, undated last. Before this panel existed, a task created against a client was only visible on `/admin/tasks`. Overdue is stated in words as well as colour.

### What a delete removes

| Deleting | Also does |
|---|---|
| Lead | deletes its tasks and activities; deletes the visitor's uploads that were never attached to a project (rows, files on disk and cached derivatives) and says how many; clears the lead reference on any project and asset |
| Client | deletes its tasks and activities |
| Company | turns its contacts into individual clients (`kind = individual`, no company) and says how many; deletes its tasks and activities |
| Project | unassigns its files **and makes them private**; clears cover / sketch / PDF / AR roles pointing at them; deletes its tasks and activities |
| Post | unlinks its tasks and deletes its activities |
| Media file | clears cover, gallery, video, project-role and lead references; removes the file, its thumbnail and its cached derivatives |

## Projects (orders)

One project = one order. Stages: request · survey · design · configuration · approval · production prep · production · installation · handover · archived. Status: active / on hold / done / cancelled. Money fields (quote, deposit, paid, currency), room dimensions, materials, deadline.

**Codes** are `AT-<Yerevan year>-NNNN` and come from a counter that only moves forward. Deleting the highest-numbered project no longer frees its number, so two projects can never share a code in a quote, a file name or an old link — expect gaps in the sequence. A project created at 01:00 on 1 January gets the new year's code even on a UTC server.

Money fields use the same strict parsing as the lead's estimated value and must be ≥ 0, so a mistyped `1.2.3` is refused instead of wiping a stored quote.

Tabs (a notice after a save returns to the tab it came from):

- **Overview** — editable details.
- **Media** — the project's renders, videos, sketch, PDF, AR models; set cover/sketch/PDF/GLB/USDZ roles; captions; public toggle (allowed on the website); upload. A role is type-checked against the file (image for cover and sketch, PDF, `.glb`, `.usdz`), and clearing the Sketch role puts the file's kind back to *render*.
- **Client page** — create and manage individual links (below).
- **Deliverables** — Live 3D, the Web 3D viewer URL and the AR models. The viewer and Live URLs accept only `http(s)` addresses.
- **Feedback** — approvals, change requests and questions from the client page; resolve toggle.
- **Timeline** — notes, calls, meetings, system events.

**Create from project** (portfolio) produces a **hidden** draft: only files explicitly marked public, an empty summary, and `Published` unticked. The notice says so — nothing reaches the public site until the item is published by hand.

## Media library

Drag-and-drop upload — images, video, PDF, 3D models (`.glb`, `.usdz`, `.gltf`) and working files (`.dwg`, `.dxf`, `.skp`, `.max`, `.zip`, `.rar`, `.7z`, `.csv`, `.xlsx`) — **100 MB per file**, the same cap as `request_body max_size` in `deploy/Caddyfile`. Automatic thumbnails (sharp for images, bundled ffmpeg for videos), dimensions, duration. Filter by kind or project, assign to projects, delete.

A file is accepted only when its **extension** is on the allow-list, whatever MIME type the browser declared, and the leading bytes must agree with that type — `page.html` sent as `image/png` is refused and nothing is written.

**Poster generator**: a branded 1:1 / 4:5 / 16:9 / 9:16 JPEG from any render, with a headline and the site address — used by the SMM composer. A poster cannot be the source of another poster (it would carry two brand marks).

Storage: `data/uploads/YYYY/MM/<id>.<ext>`, served by `/media/...` with Range support (video seeking). Two housekeeping jobs run in the worker: public uploads from abandoned website wizards that never became a lead attachment are deleted after 24 hours, and the social-ready images cached under `derived/<platform>/` are deleted 48 hours after their last use.

**Who may read a file.** Files marked public, files with no owning project, and paths outside the library stay open. A non-public project file is served to the signed-in owner; to a visitor holding a live client-page link of that project (with *that* link's download permission for `?download=`); and read-only when the file is attached to a social post that is not a draft or cancelled, because Instagram fetches the URL itself with no cookies. A denied inline view answers 404 (existence is not confirmed), a denied download answers 403, and gated responses carry `Cache-Control: private` with `Vary: Cookie` so no shared cache can hand one client's render to the next visitor. If the library itself cannot be read the route answers 503 and serves nothing — the check fails closed, never open.

## Client pages (individual links)

`https://<app>/p/<slug>?k=<token>` — the slug is readable (client + type), the token is the secret. Options per link: title, greeting message, language (hy/ru/en), expiry, passcode, show Live 3D / Web 3D / PDF, allow download, allow feedback, active. Tracked: views (30-minute de-dup), open Live, open viewer, open AR, downloads, approvals, change requests. Send by copy, Telegram (to your own chat, for forwarding) or WhatsApp share.

A passcode is 6–24 characters (existing shorter ones keep working). "Expires in (days)" must be a whole number from 1 to 3650; anything else means *no expiry*, so a zero or a negative number can no longer create a link that has already expired. "Send to my Telegram" records the link as sent only when a bot token and an admin chat really exist; otherwise it says Telegram is not configured.

**Proposed structure of deliverables** (answering "render, individual link, Pixel Streaming link — how to separate them"):

| Level | What the client gets | When | Cost to you |
|---|---|---|---|
| 1. Client page | Renders, video, sketch→3D, PDF, materials, approve/feedback | Every project, from the first draft | none |
| 2. Web Viewer + AR | `/v/<slug>?k=…` full-screen viewer (GLB/USDZ, colour swatches, AR) linked from the client page; **default for every client** | When a light model is exported | none (files) |
| 3. Live 3D (Pixel Streaming) | A time-limited, quota-limited interactive session (`live.architeksoft.com/?instanceUuid=…`) as a **premium** button inside the client page | B2B: showrooms, presentations, key clients | GPU minutes |

So the **client page is the single link you send**; the Live 3D link lives inside it (and can also be sent bare). Quotas and expiry are on the Live instance; the page itself has its own expiry.

## Live 3D (Pixel Streaming)

`/admin/live` lists instances from the existing backend (needs `LIVE_ADMIN_USERNAME` / `LIVE_ADMIN_PASSWORD` in `.env`), creates new ones with display/real hour limits and an expiry, stops them, and shows the client link. Without credentials the screen explains what is needed and returns a dry-run link — and that placeholder is **not** written to the project, so a project never claims a Live session that does not exist. Every backend call is https-only (plain http is allowed for localhost only), refuses redirects and times out after 10 seconds, and each failure carries a machine-readable reason (`not_configured`, `unsafe_url`, `timeout`, `unreachable`, `login_failed`, `backend_error`) shown in Armenian or English. The existing backend keeps doing what it does today (starting/stopping the AWS instance, quotas, heartbeat); improvement suggestions for it are in `07_SECURITY_SCALABILITY.md`.

## Analytics

Website (views, visitors, CTA, forms, conversion, sources, locales), CRM (leads by status/segment/source, conversion, projects by type/stage, revenue by month with quoted and paid totals per currency), client pages (views, Live/AR opens per link), SMM (published per platform, per month).

## Settings

Six tabs: **Brand** · **SMM** · **Telegram** · **Integrations** · **Live 3D** · **Security**.

- **Brand** — name, tagline, phones, e-mail, Telegram handle, WhatsApp, address, working hours, default language and the social profile links used by the public footer. E-mail, phone and every URL are validated, and a pasted address without a scheme gets one, so the public site can never receive `mailto:not-an-email` or a `javascript:` link.
- **SMM** — default platforms, approval lead time, auto-publish after approval, posting days and posting time, hashtags per language, brand voice. See `05_SMM_AUTOMATION.md`.
- **Telegram** — bot status (`getMe`), the `/setadmin` binding code (shown only while no admin chat is stored), admin chat id, channel id, daily brief time, notification switches, and a test message button. The bot **long-polls**; there is no webhook URL to register, and registering one would make Telegram answer `getUpdates` with 409 and silently stop approvals.
- **Integrations** — the live connection status of every platform with the exact environment variable names, the AI provider in use, and the resolved `APP_URL`, database path, upload path and worker mode.
- **Live 3D** — backend URL (https, except on localhost) and the default display hours, real hours and days for a new session.
- **Security** — password change, sessions, secret check. A password change requires the current password, the new one must be 8–200 characters, five wrong attempts within 15 minutes lock the form, and a successful change signs out every other session of that user.

A settings save that fails validation keeps what was typed: the rejected submit is held in a 60-second cookie, the form is re-filled from it, and the offending field is marked.

Values that come from `.env` (the Telegram admin chat and channel ids, the Live backend URL) are resolved on every read and are never frozen into the settings row, so changing `.env` later still takes effect. Saving a field whose value equals the environment value stores nothing.
