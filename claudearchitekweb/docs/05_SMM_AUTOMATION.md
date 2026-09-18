# Sales + SMM automation

## Purpose

Not likes. A steady, professional presence that builds trust with furniture makers and households and turns finished projects into enquiries — with **you approving every post from Telegram** in seconds.

## The loop

```
Renders/video in the media library — or a folder dropped into data/inbox (see 15)
        │
        ▼
Composer: pick project → pick media (+ branded poster) → goal, language, platforms, notes
        │
        ▼
AI (Claude → Gemini → templates) writes ONE core idea and ONE variant per platform
        │      Facebook: story + CTA + link      Instagram: hook + short lines + hashtags, "link in bio"
        │      LinkedIn: B2B headline + 3–5 concrete lines      Telegram: short + link
        │      YouTube: title + description (#Shorts for vertical)      TikTok: 1–2 lines (manual)
        ▼
You edit in the admin (character counters, previews, "Improve with AI: shorter / more formal / …")
        │
        ▼
Schedule (date/time, Asia/Yerevan). Status: scheduled
        │
        ▼  worker, every 60 seconds
At scheduled time − lead time (default 120 min): Telegram message to you with
   media (photos/video), the text, the platforms, the time, and buttons:
   [✅ Approve]  [✏️ Edit text]  [🕐 Tomorrow]  [⏭ Skip]  [🔗 Open]
        │
        ├─ Edit → choose platform (or all) → reply to the prompt with the new text (or an AI
        │         instruction) → the preview is sent again for approval
        ├─ Tomorrow → +24 h from now (never from an overdue date)
        ├─ Skip → cancelled
        └─ Approve → publishes now when "auto-publish after approval" is on and the time is due,
                     otherwise it waits for the scheduled time or for a manual Publish
        │
        ▼
Adapters publish; results (links / errors / dry-run notes) come back to Telegram and the post log.
```

Also from the admin: **Send for approval** and **Publish now** on any post, **Duplicate** to reuse a pack for another language, **Cancel** and **Delete**.

## The hub (`/admin/smm`)

Four counters — awaiting approval, scheduled (scheduled + approved), published in 30 days, failed. *Failed* also counts a partially published post that still has a failed enabled variant, because it needs exactly the same attention as a fully failed one.

Under them, the **connections row**: one chip per platform with its live status, and the AI writer in use. Statuses are `connected`, `dry_run`, `bot_only` (a Telegram bot token but no channel id) and `manual` (TikTok, always).

Then the **Inbox** panel (see `15_INBOX_WORKFLOW.md`) and five tabs:

| Tab | Shows |
|---|---|
| Queue (default) | `awaiting_approval`, `approved`, `scheduled`, and the two transient states `publishing` / `sending_approval`, earliest scheduled first |
| Calendar | one month, `?month=YYYY-MM`; an impossible month falls back to the current Yerevan month |
| Drafts | `draft` |
| Published | `published` + `partially_published`, newest publication first |
| All | everything |

Row actions are the same guarded operations the editor uses: Send for approval, Approve, Publish now, Cancel, Delete. Cancel is not offered once anything has gone out.

## Composer (`/admin/smm/new`)

Pick a project (optional), up to **20 media files**, the goal (`trust` · `sales_b2b` · `sales_b2c` · `showcase` · `education`), the language (hy/ru/en), the platforms and free-text instructions for the copywriter. A branded poster can be generated from any render in 1:1 / 4:5 / 16:9 / 9:16 and is attached as the first image.

Defaults come from Settings: the platforms from **Settings → Social media → default platforms** (the composer says so when that list is empty instead of silently choosing two), the language from **Settings → Brand**, and the schedule is pre-filled with the next slot from **posting days + posting time**.

Changing the project prunes the selection to that project's media and announces it, so nothing invisible is ever attached. Choosing YouTube without a video warns before generating. The result is a post with one variant per platform, opened straight in the editor.

## Editor (`/admin/smm/<id>`)

Left: internal title, goal, language, schedule (with a *Set* button), and the media strip with a library picker. Right: one card per platform.

Each card has an **Enabled** switch, a **format** (`image` · `carousel` · `video` · `reel` · `short` · `text`), the text, a call to action, hashtags with an *n*/40 counter, and an **Improve with AI** instruction field. A headline is shown only where the platform really publishes one (`usesTitle`: YouTube and LinkedIn) — there is no Facebook headline to fill in that nobody would ever see.

The character counter uses the platform limit, and drops to Telegram's **1024** caption limit as soon as media is attached, because a longer text then goes out as a separate message under the media.

Save reports what it had to adjust — the platforms whose text is over the limit, and the platforms whose hashtag list was capped at 40 — as a warning, not a silent trim. **Send for approval** and **Publish now** save the on-screen state first and stop if that save fails, so an unsaved caption can never be published. **Publish now** disappears entirely when no platform is enabled.

A dry-run note under a variant is shown in the muted tone with a *Last dry run* label; only a real failure uses the danger colour.

## Statuses

**Post**

| Status | Meaning |
|---|---|
| `draft` | no schedule yet |
| `scheduled` | has a time; the worker will send it for approval |
| `sending_approval` | transient claim while the approval message is being sent |
| `awaiting_approval` | the approval message is out (or Telegram is not configured and it waits in the admin) |
| `approved` | approved, waiting for its time or for a manual Publish |
| `publishing` | transient claim while the adapters run |
| `published` | every enabled variant went out (or was simulated) |
| `partially_published` | some enabled variants went out, some failed |
| `failed` | nothing went out |
| `cancelled` | skipped |

**Variant**: `pending` → `publishing` → `published` | `simulated` | `failed`, plus `skipped`.

`sending_approval` and `publishing` are **claims, never a resting place**. A post enters them with a single conditional `UPDATE`, so the 60-second tick, a Telegram button and a second browser tab can run at the same moment without ever sending an approval twice or publishing a variant twice. A post left in a claim for more than 15 minutes (a restart mid-publish) is released by the worker's sweep: `publishing` becomes `failed` with the interrupted variants marked and explained, `sending_approval` goes back to `scheduled` or `draft`, and the admin chat is told.

Which transitions are allowed:

- **Publish** starts from `draft`, `scheduled`, `awaiting_approval`, `approved`, `failed` or `partially_published`, and only with at least one enabled variant.
- **Send for approval** starts from `draft`, `scheduled`, `awaiting_approval`, `approved` or `failed` — never from a post that has already gone out.
- **Cancel** is refused once the post is `published`, `partially_published` or `publishing`.
- **Re-schedule**: `draft`/`scheduled` simply move; `failed`, `cancelled` and `partially_published` with a new time go back to `scheduled` with the approval state cleared, so a new time means a fresh approval round; `awaiting_approval` and `approved` keep their approval and only move the time; `published` answers *duplicate it to post again*. A time in the past is refused (60 seconds of tolerance).

## Publishing

`publishPost` claims the post, then walks the enabled variants. Each variant is claimed individually — `UPDATE … WHERE status NOT IN ('published','publishing')` — so a variant that already went out is never sent twice and a **retry re-attempts only what is still outstanding**. Fix the cause (attach the missing video, shrink the file) and press Publish now again: the successful variants are left alone, the failed one is tried again.

When every enabled variant ends `published` or `simulated`, the post is `published`; a mixture is `partially_published`; none is `failed`. `published_at` is stamped only when something really went out. A post with no enabled variant is a configuration mistake, never a successful publish: it is refused with *No platform is enabled*.

Each variant stores its external id, its external URL when the platform gives one, and one text column that holds either the failure or — for a dry run — the simulation note.

When Telegram is configured, the result is also sent to the admin chat, one line per platform with ✅ / 🧪 / ❌ and the link or the reason.

## Dry run

An adapter without credentials returns `simulated` instead of publishing, with a note that names **the exact variables still missing**. A dry run applies the same media checks as the real call, so it fails where the real call would fail — a post without an image fails for Instagram instead of reporting "would publish 1 image". Nothing in the interface calls a dry run a publication: the chip reads *Simulated* in a neutral tone (the success green is reserved for a real `published` variant) and the notes use the conditional — "would publish …".

## Platform adapters (`src/lib/social/index.ts`)

| Platform | How | Needs | Without credentials |
|---|---|---|---|
| Facebook Page | Graph API v21.0: photos uploaded unpublished → one feed post with the attached media; `graph-video.facebook.com/.../videos` for a video | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` (non-expiring page token) | dry run |
| Instagram Business | Container flow (image / carousel / Reels) with **public JPEG URLs** served from `/media` | `META_IG_USER_ID`, `META_PAGE_ACCESS_TOKEN`, and an `APP_URL` reachable from the internet over https | dry run |
| LinkedIn company page | Images/Videos API upload + Posts API, text as escaped "little text" | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN` (`urn:li:organization:<numeric id>`), optional `LINKEDIN_API_VERSION` | dry run |
| YouTube | Data API v3 resumable upload with an OAuth refresh token | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, optional `YOUTUBE_PRIVACY` | dry run |
| Telegram channel | Bot API `sendPhoto` / `sendVideo` / `sendMediaGroup` | `TELEGRAM_BOT_TOKEN` + a channel id (Settings → Telegram → Channel id, or `TELEGRAM_CHANNEL_ID`); the bot must be a channel admin | dry run |
| TikTok | **Manual by design** — automatic posting needs an audited app, and an unaudited one only produces private posts, so the adapter never calls TikTok | — | always simulated |

A placeholder such as `urn:li:organization:XXXXXXX` does **not** count as configured: without a numeric URN LinkedIn stays in dry run instead of letting the app believe it is connected and having every post rejected.

Every outbound request has a timeout (30 s for an API call, 15 min for an upload) and reports the host instead of "fetch failed". Uploads are never read into memory: files are attached as file-backed blobs or sent in ranged parts.

### Media preparation and limits

Images are made acceptable before they are sent and the original is used untouched when it already fits. Anything else is converted to JPEG once with sharp and cached under `UPLOAD_DIR/derived/<platform>/` (the worker deletes a derived file 48 hours after its last use).

| Platform | Images accepted as-is | Max image | Longest side | Aspect | Video |
|---|---|---|---|---|---|
| Facebook | JPEG, PNG | 4 MB | 4096 px | — | 1 GB |
| Instagram | JPEG | 8 MB | 1440 px | 0.8 – 1.91 (padded, never cropped) | 1 GB |
| LinkedIn | JPEG, PNG, GIF | 20 MB | 6000 px | — | multipart upload, no fixed cap |
| Telegram | JPEG, PNG | 10 MB | 4096 px | — | 50 MB |

Text limits (`PLATFORM_META`): Facebook 63 206 · Instagram 2 200 · LinkedIn 3 000 · YouTube 5 000 · Telegram 4 096 (1 024 as a media caption) · TikTok 2 200. Facebook, Instagram and Telegram take at most 10 images per post; LinkedIn takes one media; YouTube needs a video.

Platform-specific handling worth knowing: a YouTube title is cut to 100 characters and the description to 5 000 **bytes**, `<` and `>` are stripped and at most 15 tags are sent; LinkedIn hashtags are rewritten as hashtag templates and everything else is escaped, so the text is published exactly as written; Instagram's permalink is looked up after publishing and simply omitted if that lookup fails — never replaced by the Instagram home page.

## What the AI is told (`src/lib/ai/index.ts`)

Brand facts, the goal, project title/type/materials/notes, a media summary, the link to mention, the per-platform rules, and the brand voice from Settings ("professional, calm, precise; show, don't tell; no hype"). It must never invent numbers, names or prices. The output is strict JSON, validated, de-duplicated (hashtags are folded case-insensitively) and completed with templates for any missing platform.

Provider order: **Anthropic Claude** (`ANTHROPIC_API_KEY`, model from `ANTHROPIC_MODEL`) → **Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) → **built-in trilingual templates**. The hub and Settings → Integrations always show which one is in use. With no key at all the templates write the copy and the post's notes say so — everything else (media, scheduling, approval, publishing) behaves identically. Cost at this volume: well under $1/month.

**Improve with AI** in the editor and the ✨ instruction button in Telegram refuse to run when no key is configured, instead of quietly returning the same text. A rewrite that fails leaves the original text in place and the Telegram thread open for a retry.

## Telegram

**Commands**

| Command | Answer |
|---|---|
| `/start`, `/chatid`, `/id` | the chat id, and whether this chat is already the admin chat |
| `/setadmin <code>` | binds this chat as the admin chat; the code is shown in Settings → Telegram while none is bound |
| `/status` | how many posts await approval and how many are scheduled |
| anything else starting with `/` | `Commands: /status, /chatid` |

`/setadmin` needs the code — it is derived from `APP_SECRET`, compared in constant time, and the panel that shows it disappears once a chat is bound. Without it, anyone who found the bot could claim the admin chat and start receiving leads and approval buttons. While no admin chat is bound, callback buttons answer *Not authorised*; afterwards only that chat may press them.

**The approval message** carries the media, the post title, the scheduled time in Yerevan, the enabled platforms, the Facebook text (or the first enabled variant) up to 700 characters with its hashtags, and a link to the editor. If the media cannot be sent, the text goes out on its own with the buttons, so approval is still possible. Sending a new round strips the buttons from the previous message, so an old message can never be tapped by mistake.

Buttons act only while the post is in a status where they make sense (`Approve`, `Skip`, `Edit` only from `awaiting_approval`; `Tomorrow` also from `scheduled`). A stale button answers *Too late — this post is …* and removes itself.

**Editing by chat** applies only to a message that is a **reply to the bot's own prompt**, so a forgotten thread can never swallow an unrelated message days later. Threads waiting for a reply expire after 24 hours. A published, publishing or cancelled post is never rewritten from chat. All variants are rewritten in one transaction — a failure halfway can never leave some variants edited and others not — and the updated pack is sent for approval again.

**Notifications**: new leads, client feedback, publish results, interrupted-publish warnings, and a daily brief at the configured time (new requests in 24 h, open leads, unresolved feedback, today's posts). The brief is sent once per Yerevan day, at or after its time, and is marked as sent only after Telegram accepted it.

## Scheduling and the worker

`RUN_WORKER_IN_APP=true` (the default) runs the scheduler and the bot inside the web process; `npm run worker` runs them separately. The scheduler ticks every **60 seconds** and the next tick is armed only after the current one finishes, so a slow upload can never let two ticks publish the same post.

Each tick: daily brief → stale-claim sweep → inbox scan → send approvals that are due → publish approved posts that are due; hourly it also cleans orphaned uploads and derived images. Every step has its own error handling, so one broken post never blocks the rest, and a post that fails is left alone for 5, 10, 15 … up to 60 minutes instead of re-uploading its media every minute.

- **Due for approval**: status `scheduled` and `scheduled_at ≤ now + approvalLeadMinutes`.
- **Due for publishing**: status `approved`, auto-publish enabled, and no schedule or a schedule that has passed — an approved post without a time is published, not left forever.

**Settings → Social media** (defaults): platforms Facebook + Instagram + LinkedIn + Telegram, approval lead time 120 minutes, auto-publish after approval on, posting days Tue/Thu/Sat, posting time 11:00, hashtags per language, brand voice. Posting days and time are the **suggested** slot for a new post and for an inbox import; they never publish anything by themselves. Times are validated as `HH:MM`, and an empty platform or day list is refused.

## The inbox as a source

Copying a folder of renders (optionally with a `post.txt` brief) into `data/inbox` produces the same kind of draft the composer produces: media imported into the library, a post pack written, a slot suggested, a *from inbox* badge on the row and a banner with **Use suggested slot** in the editor. With `schedule: auto` in the brief the slot is applied and the post becomes `scheduled`; otherwise it stays a draft. Nothing is ever published automatically — the approval is still yours. Full reference: `15_INBOX_WORKFLOW.md`.

## Content strategy the system supports

- **Showcase** (after every handover): sketch → 3D → cut list. Proof, not promises.
- **Education** (weekly): one concept — why the same model gives fewer errors, what AR shows, how approvals shorten production.
- **B2B** (LinkedIn): pilot offer, economics of a streamed session, named case studies once permitted.
- **B2C** (Instagram/Facebook, hy + ru): "send measurements today, open the 3D tomorrow".
- Language mix: hy for Instagram/Facebook/Telegram, en for LinkedIn, ru selectively. Duplicate creates the same pack for another language as a fresh draft with every variant reset.

## Extending

- New platform: add an adapter in `src/lib/social/index.ts`, a platform key in `src/lib/ai/index.ts` (rules + templates), a row in `PLATFORM_META`, its texts in `src/lib/social/messages.ts` (hy + en) and, if it has credentials, a row in the Settings → Integrations table.
- Unified API instead of native (e.g. Zernio/Upload-Post): implement one adapter that posts to their endpoint for the platforms you route there.
- Auto-drafting after handover: the project stage change to `handover` can enqueue a draft (one call to `createPostPack`).

**Going live for the first time — the platform-by-platform owner guide is `16_FIRST_TEST_POST.md`.**
