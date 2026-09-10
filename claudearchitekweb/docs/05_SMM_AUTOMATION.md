# Sales + SMM automation

## Purpose

Not likes. A steady, professional presence that builds trust with furniture makers and households and turns finished projects into enquiries — with **you approving every post from Telegram** in seconds.

## The loop

```
Project finished (renders/video in the media library)
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
You edit in the admin (character counters, previews, "Improve with AI: shorter / more formal / mention the pilot")
        │
        ▼
Schedule (date/time, Asia/Yerevan). Status: scheduled
        │
        ▼  worker, every minute
At scheduled time − lead time (default 120 min): Telegram message to you with
   media (photos/video), the text, the platforms, the time, and buttons:
   [✅ Approve & publish]  [✏️ Edit text]  [🕐 Tomorrow]  [⏭ Skip]  [🔗 Open]
        │
        ├─ Edit → choose platform (or all) → reply with new text (or an AI instruction) → preview re-sent
        ├─ Tomorrow → rescheduled +24 h
        ├─ Skip → cancelled
        └─ Approve → publish now (or at the scheduled time if "auto-publish after approval" is off)
        │
        ▼
Adapters publish; results (links / errors / dry-run notes) come back to Telegram and the post log.
```

Also from the admin: "Send for approval" and "Publish now" on any post; "Duplicate" to reuse a pack for another language.

## What the AI is told (`src/lib/ai/index.ts`)

Brand facts (KitchenPro, audiences, materials), the goal (trust / B2B sales / B2C sales / showcase / education), project title/type/materials/notes, media summary, the link to mention, per-platform rules, and the brand voice from Settings ("professional, calm, precise; show, don't tell; no hype"). It must never invent numbers, names or prices. Output is strict JSON, validated and completed with templates for any missing platform.

Provider order: **Anthropic Claude** (`ANTHROPIC_API_KEY`, model `claude-opus-5` by default) → **Gemini** (`GEMINI_API_KEY`) → **templates** (trilingual, deterministic). Cost at your volume: well under $1/month.

## Platform adapters (`src/lib/social/index.ts`)

| Platform | How | Needs | Without keys |
|---|---|---|---|
| Facebook Page | Graph API: photos (unpublished) → feed with attached media; videos endpoint for video | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` (non-expiring page token) | dry-run |
| Instagram Business | Container flow (image / carousel / Reels) with **public JPEG URLs** from `/media` | `META_IG_USER_ID`, same token, public HTTPS `APP_URL` | dry-run |
| LinkedIn company page | Images/Videos API upload + Posts API | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN` (+ `LINKEDIN_API_VERSION`) | dry-run |
| YouTube | Data API v3 `videos.insert` (multipart) with refresh token | `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`; note private-until-audit | dry-run |
| Telegram channel | Bot API sendPhoto / sendVideo / sendMediaGroup | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | dry-run |
| TikTok | Manual (API needs an audited app) | — | manual note |

Every adapter returns `published`, `simulated` or `failed` with a reason; the post becomes `published`, `partially_published` or `failed`.

## Telegram bot commands

`/start` or `/chatid` → shows the chat id (paste in Settings → Telegram, or press `/setadmin` once if nothing is set). `/status` → queue counts. Anything else while an edit is pending → treated as the new text.

## Posting rhythm (Settings → SMM)

Default: Tue/Thu/Sat at 11:00, approval message 2 h before, auto-publish after approval. Daily brief at 09:00: new requests, open leads, unresolved feedback, today's posts.

## Content strategy the system supports

- **Showcase** (after every handover): sketch → 3D → cut list. Proof, not promises.
- **Education** (weekly): one concept — why the same model gives fewer errors, what AR shows, how approvals shorten production.
- **B2B** (LinkedIn): pilot offer, economics of a streamed session, named case studies once permitted.
- **B2C** (Instagram/Facebook, hy + ru): "send measurements today, open the 3D tomorrow".
- Language mix: hy for Instagram/Facebook/Telegram, en for LinkedIn, ru selectively. The composer can create the same pack in another language with "Duplicate".

## Extending

- New platform: add an adapter in `src/lib/social/index.ts`, a platform key in `src/lib/ai/index.ts` (rules + templates), and a row in `PLATFORM_META`.
- Unified API instead of native (e.g. Zernio/Upload-Post): implement one adapter that posts to their endpoint for the platforms you route there.
- Auto-drafting after handover: the project stage change to `handover` can enqueue a draft (one call to `createPostPack`).
