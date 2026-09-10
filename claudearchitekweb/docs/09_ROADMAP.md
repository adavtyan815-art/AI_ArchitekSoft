# Roadmap

## Done in this iteration (branch `claude`, folder `claudearchitekweb/`)
- Trilingual client website with KitchenPro focus, B2B/B2C journeys, intake wizard, contact, portfolio, solutions, how-it-works, privacy, analytics, SEO basics.
- Client pages with Live 3D / Web 3D / AR / gallery / video / PDF / approvals and tracking.
- Admin: overview, leads (list + board), clients, companies, projects with KitchenPro stages, tasks, media library with thumbnails and poster generator, client pages manager, Live 3D integration, SMM studio (composer, editor, scheduling, Telegram approval, publishing adapters, logs), analytics, settings, portfolio management.
- Worker: scheduler, Telegram bot (approve/edit/postpone/skip, chat detection, status, daily brief), notifications for leads and client feedback.
- Docs, Docker deployment, one-click local start, demo seed with real assets.

## Done in v2 (10 Sept 2026)
- Positioning corrected everywhere (not a furniture seller/maker); Web Viewer default, Live 3D premium.
- Design system v2, light/dark modes, mobile-first layouts, Armenian admin.
- `/viewer`, `/v/<slug>`, home Web Viewer demo.
- Performance: Turbopack dev, image pipeline, payload trimming, lazy charts, DB tuning, caches (see `13_PERFORMANCE.md`).
- Infrastructure plan with costs and thresholds; proposed B2B/B2C offers.

## Next 2 weeks (you)
1. Run locally, click through with real project data; edit copy in `src/lib/i18n/hy.ts` where you want different wording.
2. Create the Telegram bot, add `ANTHROPIC_API_KEY`, test one full post cycle.
3. Replace demo portfolio with 5–6 real projects (with client permission), add named case studies.
4. Decide packages/prices for the B2B page (placeholders today).
5. Renew the `live.architeksoft.com` certificate; rotate the committed Gemini key.

## Next 1–2 months (build)
- Meta (Facebook + Instagram) connection; LinkedIn application; YouTube OAuth.
- Deploy to `new.architeksoft.com`; then switch DNS.
- Client page branding per B2B partner (their logo/colours on the pages they send to their customers).
- Public demo Live 3D link with a small quota on the home page; AR demo model (USDZ + GLB) from a real kitchen.
- Auto-draft a showcase post when a project reaches "handover".
- E-mail sequences for leads (Resend): confirmation to the client, reminder if no answer in 48 h.
- 2FA for admin; multiple admin users with roles.

## Later (product)
- KitchenPro self-service portal for makers (workshop standard, price lists, publishing configurable versions to their customers) — the schema (companies, contacts, projects, links) is ready to grow into it.
- Quotation editor (line items from the model, customer vs internal versions) and deposit payments (Idram/ArCa/Stripe).
- Machine exports (cut list CSV/DXF) attached to projects automatically from the design tool.
- Postgres + object storage when volumes require it; multi-tenant mode.
