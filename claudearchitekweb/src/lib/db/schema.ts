/**
 * ArchiTek Soft — database schema (SQLite via Drizzle ORM).
 *
 * One file, one source of truth. Tables are grouped by domain:
 *   1. Auth & settings          users, sessions, settings, audit_log
 *   2. CRM                      companies, clients, leads, activities, tasks
 *   3. Projects & media         projects, assets, project_assets
 *   4. Client pages             share_links, share_events, client_feedback
 *   5. SMM                      posts, post_variants, post_assets, social_accounts, telegram_threads
 *   6. Public site content      portfolio_items
 *   7. Analytics                analytics_events
 */
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

// ---------------------------------------------------------------------------
// 1. Auth & settings
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"), // owner | manager | viewer
  createdAt: text("created_at").notNull().default(now()),
  lastLoginAt: text("last_login_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256(token)
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(now()),
  userAgent: text("user_agent"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON
  updatedAt: text("updated_at").notNull().default(now()),
});

/**
 * Monotonic sequences that must not go backwards when rows are deleted — today only
 * `project_seq:<year>`, which hands out project codes (AT-2026-0042).
 */
export const counters = sqliteTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  meta: text("meta"), // JSON
  createdAt: text("created_at").notNull().default(now()),
});

// ---------------------------------------------------------------------------
// 2. CRM
// ---------------------------------------------------------------------------
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("manufacturer"), // manufacturer | studio | developer | retailer | architect | other
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  country: text("country").default("AM"),
  address: text("address"),
  taxId: text("tax_id"),
  source: text("source"), // website | instagram | facebook | referral | telegram | phone | linkedin | other
  tags: text("tags"), // JSON string[]
  notes: text("notes"),
  status: text("status").notNull().default("active"), // prospect | active | partner | inactive
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("individual"), // individual | contact (person inside a company)
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    position: text("position"),
    phone: text("phone"),
    email: text("email"),
    telegram: text("telegram"),
    whatsapp: text("whatsapp"),
    language: text("language").notNull().default("hy"), // hy | ru | en
    city: text("city"),
    address: text("address"),
    source: text("source"),
    tags: text("tags"), // JSON string[]
    notes: text("notes"),
    status: text("status").notNull().default("active"), // lead | active | vip | inactive
    createdAt: text("created_at").notNull().default(now()),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [index("clients_company_idx").on(t.companyId)]
);

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    segment: text("segment").notNull().default("b2c"), // b2b | b2c
    status: text("status").notNull().default("new"), // new | contacted | qualified | proposal | won | lost
    source: text("source").notNull().default("website"),
    name: text("name").notNull(),
    companyName: text("company_name"),
    phone: text("phone"),
    email: text("email"),
    telegram: text("telegram"),
    preferredChannel: text("preferred_channel"), // phone | telegram | whatsapp | email
    language: text("language").notNull().default("hy"),
    service: text("service"), // kitchenpro | showroom | ar | cnc | real_estate | custom | other
    roomType: text("room_type"), // kitchen | wardrobe | living | bathroom | office | apartment | other
    budget: text("budget"),
    message: text("message"),
    details: text("details"), // JSON: room dimensions, appliances, style, deadline, etc.
    files: text("files"), // JSON asset ids
    utm: text("utm"), // JSON
    pagePath: text("page_path"),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    projectId: text("project_id"),
    estimatedValue: real("estimated_value"),
    currency: text("currency").default("AMD"),
    assignedTo: text("assigned_to"),
    lostReason: text("lost_reason"),
    createdAt: text("created_at").notNull().default(now()),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_segment_idx").on(t.segment)]
);

export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entityType: text("entity_type").notNull(), // lead | client | company | project | post
    entityId: text("entity_id").notNull(),
    type: text("type").notNull().default("note"), // note | call | meeting | email | message | status | system
    content: text("content").notNull(), // plain-text fallback, in the language of whoever wrote it
    // JSON ActivityEvent (see lib/crm.ts) for system entries: the event and its parameters, so the
    // timeline can be rendered in the reader's language instead of the writer's.
    meta: text("meta"),
    userId: text("user_id"),
    createdAt: text("created_at").notNull().default(now()),
  },
  // entity_type/entity_id are polymorphic and cannot carry a foreign key; migration 0002 adds
  // ON DELETE triggers that remove these rows when the entity they describe is deleted.
  (t) => [index("activities_entity_idx").on(t.entityType, t.entityId)]
);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueAt: text("due_at"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  priority: text("priority").notNull().default("normal"), // low | normal | high
  // lead | client | company | project. Polymorphic, so no foreign key: migration 0002 adds
  // ON DELETE triggers that clear both columns when the linked entity is deleted.
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  createdAt: text("created_at").notNull().default(now()),
});

// ---------------------------------------------------------------------------
// 3. Projects & media
// ---------------------------------------------------------------------------
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(), // AT-2026-0042
    title: text("title").notNull(),
    segment: text("segment").notNull().default("b2c"), // b2b | b2c
    type: text("type").notNull().default("kitchen"), // kitchen | wardrobe | living | bedroom | bathroom | office | apartment | house | commercial | other
    stage: text("stage").notNull().default("request"),
    // request | survey | design | configuration | approval | production_prep | production | installation | handover | archived
    status: text("status").notNull().default("active"), // active | on_hold | done | cancelled
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    // The lead this project was converted from. Cleared by a migration-0002 trigger when that lead
    // is deleted, so a "from lead" link never points at a row that is gone.
    leadId: text("lead_id"),
    description: text("description"),
    room: text("room"), // JSON: {width,depth,height,notes}
    materials: text("materials"), // free text (facades, worktops, hardware)
    quoteAmount: real("quote_amount"),
    depositAmount: real("deposit_amount"),
    paidAmount: real("paid_amount"),
    currency: text("currency").notNull().default("AMD"),
    deadline: text("deadline"),
    // Deliverable links
    liveUrl: text("live_url"), // Pixel Streaming link (live.architeksoft.com/?instanceUuid=...)
    liveInstanceUuid: text("live_instance_uuid"),
    viewerUrl: text("viewer_url"), // Web 3D viewer link
    arGlbAssetId: text("ar_glb_asset_id"),
    arUsdzAssetId: text("ar_usdz_asset_id"),
    coverAssetId: text("cover_asset_id"),
    sketchAssetId: text("sketch_asset_id"),
    pdfAssetId: text("pdf_asset_id"),
    isPortfolio: integer("is_portfolio", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(now()),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [index("projects_stage_idx").on(t.stage), index("projects_client_idx").on(t.clientId)]
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("render"), // render | video | sketch | pdf | model_glb | model_usdz | poster | client_upload | other
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    // The lead that claimed this upload. It is what makes an attachment belong to one lead, so
    // converting a lead can only move the files that lead actually uploaded.
    leadId: text("lead_id"),
    originalName: text("original_name").notNull(),
    fileName: text("file_name").notNull(), // stored name (uuid.ext)
    relPath: text("rel_path").notNull(), // relative to UPLOAD_DIR: 2026/09/uuid.jpg
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    durationSec: real("duration_sec"),
    thumbRelPath: text("thumb_rel_path"),
    caption: text("caption"),
    tags: text("tags"), // JSON string[]
    sortOrder: integer("sort_order").notNull().default(0),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false), // may appear on the public site
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [index("assets_project_idx").on(t.projectId), index("assets_kind_idx").on(t.kind)]
);

// ---------------------------------------------------------------------------
// 4. Client pages (individual links)
// ---------------------------------------------------------------------------
export const shareLinks = sqliteTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    token: text("token").notNull(), // secret part of the URL
    title: text("title"),
    message: text("message"), // greeting shown to the client
    language: text("language").notNull().default("hy"),
    expiresAt: text("expires_at"),
    passcode: text("passcode"), // optional 4-6 digit code
    showLive: integer("show_live", { mode: "boolean" }).notNull().default(true),
    showViewer: integer("show_viewer", { mode: "boolean" }).notNull().default(true),
    showPdf: integer("show_pdf", { mode: "boolean" }).notNull().default(false),
    allowDownload: integer("allow_download", { mode: "boolean" }).notNull().default(false),
    allowFeedback: integer("allow_feedback", { mode: "boolean" }).notNull().default(true),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    viewsCount: integer("views_count").notNull().default(0),
    lastViewedAt: text("last_viewed_at"),
    sentAt: text("sent_at"),
    sentVia: text("sent_via"), // telegram | whatsapp | email | copy
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [index("share_links_project_idx").on(t.projectId)]
);

export const shareEvents = sqliteTable(
  "share_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shareLinkId: text("share_link_id").notNull().references(() => shareLinks.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // view | open_live | open_viewer | open_ar | download | approve | change_request
    meta: text("meta"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [index("share_events_link_idx").on(t.shareLinkId)]
);

export const clientFeedback = sqliteTable("client_feedback", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shareLinkId: text("share_link_id"),
  type: text("type").notNull(), // approve | change_request | question
  message: text("message"),
  contact: text("contact"),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(now()),
});

// ---------------------------------------------------------------------------
// 5. SMM
// ---------------------------------------------------------------------------
export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    goal: text("goal").notNull().default("trust"), // trust | sales_b2b | sales_b2c | showcase | education
    language: text("language").notNull().default("hy"),
    coreText: text("core_text").notNull(), // the shared idea; per-platform variants adapt it
    status: text("status").notNull().default("draft"),
    // draft | scheduled | awaiting_approval | approved | publishing | published | partially_published | failed | cancelled
    scheduledAt: text("scheduled_at"),
    approvalSentAt: text("approval_sent_at"),
    approvedAt: text("approved_at"),
    publishedAt: text("published_at"),
    createdBy: text("created_by"),
    notes: text("notes"),
    /** How the post came into being: 'manual' (composer / duplicate) or 'inbox' (local drop folder). */
    source: text("source").notNull().default("manual"),
    /** What it was made from — for 'inbox' the folder name, so the owner can trace it back. */
    sourceRef: text("source_ref"),
    /** Background audio for a video/reel variant of this post: 'none' | 'auto' (a data/audio/ track) | 'custom' (an uploaded asset). */
    audioMode: text("audio_mode").notNull().default("none"),
    /** Uploaded custom track (kind = 'audio'), used when audioMode = 'custom'. */
    audioAssetId: text("audio_asset_id").references(() => assets.id, { onDelete: "set null" }),
    /** File name under data/audio/, used when audioMode = 'auto'. Not a foreign key: it names a file on disk, not a row. */
    audioAmbientFile: text("audio_ambient_file"),
    createdAt: text("created_at").notNull().default(now()),
    updatedAt: text("updated_at").notNull().default(now()),
  },
  (t) => [index("posts_status_idx").on(t.status), index("posts_scheduled_idx").on(t.scheduledAt), index("posts_source_idx").on(t.source)]
);

export const postVariants = sqliteTable(
  "post_variants",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // facebook | instagram | linkedin | youtube | telegram | tiktok
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    title: text("title"), // youtube title / linkedin headline
    text: text("text").notNull(),
    hashtags: text("hashtags"), // JSON string[]
    cta: text("cta"),
    format: text("format").notNull().default("image"), // image | carousel | video | reel | short | text
    /** Smart Canvas: null = auto (chosen from platform + format), or an explicit 'original' | 'smart_4_5' | 'story_9_16'. */
    canvasMode: text("canvas_mode"),
    /** How the letterbox/pillarbox margin is filled when canvasMode pads the image: 'blur' | 'dark'. */
    canvasMatte: text("canvas_matte").notNull().default("blur"),
    status: text("status").notNull().default("pending"), // pending | publishing | published | failed | skipped | simulated
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    error: text("error"),
    publishedAt: text("published_at"),
  },
  (t) => [uniqueIndex("post_variants_unique").on(t.postId, t.platform)]
);

export const postAssets = sqliteTable(
  "post_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("media"), // media | poster | cover
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("post_assets_post_idx").on(t.postId)]
);

export const socialAccounts = sqliteTable("social_accounts", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull().unique(),
  displayName: text("display_name"),
  externalId: text("external_id"),
  profileUrl: text("profile_url"),
  credentials: text("credentials"), // plain JSON — NOT encrypted. APP_SECRET only salts the analytics/portal visitor hashes and keys the passcode cookie (src/lib/env.ts).
  status: text("status").notNull().default("not_connected"), // not_connected | connected | error | dry_run
  lastCheckedAt: text("last_checked_at"),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const telegramThreads = sqliteTable("telegram_threads", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(),
  messageId: integer("message_id"),
  state: text("state").notNull().default("sent"), // sent | awaiting_edit | approved | rejected | rescheduled
  editingPlatform: text("editing_platform"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

// ---------------------------------------------------------------------------
// 6. Public site content
// ---------------------------------------------------------------------------
export const portfolioItems = sqliteTable("portfolio_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("kitchen"), // kitchen | wardrobe | living | bedroom | real_estate | commercial | other
  title: text("title").notNull(), // JSON {hy,ru,en}
  summary: text("summary"), // JSON {hy,ru,en}
  coverAssetId: text("cover_asset_id"),
  assetIds: text("asset_ids"), // JSON string[]
  videoAssetId: text("video_asset_id"),
  liveUrl: text("live_url"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(now()),
});

// ---------------------------------------------------------------------------
// 7. Analytics (first-party, privacy-friendly: no cookies, daily-rotating hash)
// ---------------------------------------------------------------------------
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(), // page_view | cta_click | form_start | form_submit | portal_view
    path: text("path"),
    locale: text("locale"),
    segment: text("segment"), // b2b | b2c when known
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    visitorHash: text("visitor_hash"),
    meta: text("meta"),
    createdAt: text("created_at").notNull().default(now()),
  },
  (t) => [index("analytics_created_idx").on(t.createdAt), index("analytics_type_idx").on(t.type)]
);

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostVariant = typeof postVariants.$inferSelect;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ClientFeedback = typeof clientFeedback.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
