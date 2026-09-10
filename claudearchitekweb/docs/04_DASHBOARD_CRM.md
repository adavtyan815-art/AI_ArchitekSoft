# Dashboard, CRM, projects, media, client pages, Live 3D

Log in at `/admin` (default `admin@architeksoft.com` / `architek2026`; change in Settings → Security). The admin is **Armenian by default** with an English switch in the top bar; light/dark theme toggle next to it. On phones the sidebar becomes a bottom tab bar and tables become cards.

## Overview
KPIs (new leads, active projects, pipeline and paid value, posts awaiting approval, companies vs individuals, client-page views, open feedback/tasks), leads per day (B2B vs B2C), lead sources, project types, pipeline by stage, recent leads, unresolved client feedback, upcoming posts. Global search across leads, clients, companies, projects and posts.

## CRM

**Leads** — every request from the website (wizard or contact form) or entered manually (phone, Instagram DM). Fields: segment (B2B/B2C), status (new → contacted → qualified → proposal → won/lost), source, service, room, budget, message, structured details, uploaded files, UTM. Views: list with filters, board by status. Detail: timeline of activities, notes, quick contact links, **Convert to project** (creates the individual client or the company + contact, the project with the next code, and moves the files).

**Clients** — *Individuals* (B2C) and *Contacts* (people inside companies). **Companies** — makers, studios, retailers, developers, architects, with contacts, projects, pipeline and paid totals. This separation answers "companies vs individual clients" in every report.

**Tasks** — simple to-dos with due date, priority and a link to a lead/project.

## Projects (orders)

One project = one order. Stages follow the KitchenPro spec: request · survey · design · configuration · approval · production prep · production · installation · handover · archived. Money fields (quote, deposit, paid, currency), room dimensions, materials, deadline, status (active / on hold / done / cancelled). Tabs:

- **Overview** — editable details.
- **Media** — the project's renders, videos, sketch, PDF, AR models; set cover/sketch/PDF/GLB/USDZ roles; captions; public toggle (allowed on the website); upload.
- **Client page** — create and manage individual links (below).
- **Deliverables** — Live 3D (creates an instance on `live.architeksoft.com` via its admin API with quotas and expiry, stores the link), Web 3D viewer URL, AR models.
- **Feedback** — approvals, change requests and questions from the client page; resolve toggle.
- **Timeline** — notes, calls, meetings, system events.

## Media library

Drag-and-drop upload (renders, videos up to 1 GB, PDFs, GLB/USDZ, DWG/DXF/SKP/ZIP). Automatic thumbnails (sharp for images, bundled ffmpeg for videos), dimensions, duration. Filter by kind/project, assign to projects, delete. **Poster generator**: branded 1:1 / 4:5 / 16:9 / 9:16 JPEG from any render with a headline and the site URL — used by the SMM composer.

Storage: `data/uploads/YYYY/MM/<id>.<ext>` served by `/media/...` with Range support (video seeking). In production, keep the same layout on a mounted volume or move to object storage (see deployment).

## Client pages (individual links)

`https://<app>/p/<slug>?k=<token>` — slug is readable (client + type), the token is the secret. Options per link: title, greeting message, language (hy/ru/en), expiry, 4–6 digit passcode, show Live 3D / Web 3D / PDF, allow download, allow feedback, active. Tracked: views (30-minute de-dup), open Live, open viewer, open AR, downloads, approvals, change requests. Send by copy, Telegram (to your chat for forwarding), WhatsApp share.

**Proposed structure of deliverables** (answering "render, individual link, Pixel Streaming link — how to separate them"):

| Level | What the client gets | When | Cost to you |
|---|---|---|---|
| 1. Client page | Renders, video, sketch→3D, PDF, materials, approve/feedback | Every project, from the first draft | none |
| 2. Web Viewer + AR | `/v/<slug>?k=…` full-screen viewer (GLB/USDZ, colour swatches, AR) linked from the client page; **default for every client** | When a light model is exported | none (files) |
| 3. Live 3D (Pixel Streaming) | A time-limited, quota-limited interactive session (`live.architeksoft.com/?instanceUuid=…`) as a **premium** button inside the client page | B2B: showrooms, presentations, key clients | GPU minutes |

So the **client page is the single link you send**; the Live 3D link lives inside it (and can also be sent bare). Quotas and expiry are on the Live instance; the page itself has its own expiry.

## Live 3D (Pixel Streaming)

`/admin/live` lists instances from the existing backend (needs `LIVE_ADMIN_USERNAME/PASSWORD` in `.env`), creates new ones with display/real hour limits and an expiry, stops them, and shows the client link. Without credentials the screen explains what is needed and returns dry-run links. The existing backend keeps doing what it does today (starting/stopping the AWS instance, quotas, heartbeat). Improvement suggestions for that backend are in `07_SECURITY_SCALABILITY.md`.

## Analytics

Website (views, visitors, CTA, forms, conversion, sources, locales), CRM (leads by status/segment/source, conversion, projects by type/stage, revenue by month), client pages (views, Live/AR opens per link), SMM (published per platform, per month).

## Settings

Brand · SMM rules (platforms, approval lead time, auto-publish, hashtags per language, brand voice, posting days/time) · Telegram (bot status, admin chat detection, channel, notifications, daily brief) · Integrations status with setup notes · Live 3D backend · Security (password, sessions, secret check).
