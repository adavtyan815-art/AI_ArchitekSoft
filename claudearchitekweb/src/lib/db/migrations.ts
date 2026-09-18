/**
 * Hand-written SQL migrations (applied in order, once each).
 * Keep them in sync with schema.ts. Add a new entry for every schema change;
 * never edit an entry that has already shipped.
 */
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "0001_init",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'manufacturer',
  website TEXT, phone TEXT, email TEXT, city TEXT,
  country TEXT DEFAULT 'AM',
  address TEXT, tax_id TEXT, source TEXT, tags TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'individual',
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT, position TEXT, phone TEXT, email TEXT, telegram TEXT, whatsapp TEXT,
  language TEXT NOT NULL DEFAULT 'hy',
  city TEXT, address TEXT, source TEXT, tags TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS clients_company_idx ON clients(company_id);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  segment TEXT NOT NULL DEFAULT 'b2c',
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'website',
  name TEXT NOT NULL,
  company_name TEXT, phone TEXT, email TEXT, telegram TEXT, preferred_channel TEXT,
  language TEXT NOT NULL DEFAULT 'hy',
  service TEXT, room_type TEXT, budget TEXT, message TEXT, details TEXT, files TEXT, utm TEXT, page_path TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  project_id TEXT,
  estimated_value REAL,
  currency TEXT DEFAULT 'AMD',
  assigned_to TEXT, lost_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_segment_idx ON leads(segment);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS activities_entity_idx ON activities(entity_type, entity_id);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  due_at TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',
  entity_type TEXT, entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'b2c',
  type TEXT NOT NULL DEFAULT 'kitchen',
  stage TEXT NOT NULL DEFAULT 'request',
  status TEXT NOT NULL DEFAULT 'active',
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  lead_id TEXT,
  description TEXT, room TEXT, materials TEXT,
  quote_amount REAL, deposit_amount REAL, paid_amount REAL,
  currency TEXT NOT NULL DEFAULT 'AMD',
  deadline TEXT,
  live_url TEXT, live_instance_uuid TEXT, viewer_url TEXT,
  ar_glb_asset_id TEXT, ar_usdz_asset_id TEXT, cover_asset_id TEXT, sketch_asset_id TEXT, pdf_asset_id TEXT,
  is_portfolio INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS projects_stage_idx ON projects(stage);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'render',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  lead_id TEXT,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER, height INTEGER, duration_sec REAL,
  thumb_rel_path TEXT, caption TEXT, tags TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id);
CREATE INDEX IF NOT EXISTS assets_kind_idx ON assets(kind);
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  title TEXT, message TEXT,
  language TEXT NOT NULL DEFAULT 'hy',
  expires_at TEXT, passcode TEXT,
  show_live INTEGER NOT NULL DEFAULT 1,
  show_viewer INTEGER NOT NULL DEFAULT 1,
  show_pdf INTEGER NOT NULL DEFAULT 0,
  allow_download INTEGER NOT NULL DEFAULT 0,
  allow_feedback INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT, sent_at TEXT, sent_via TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS share_links_project_idx ON share_links(project_id);
CREATE TABLE IF NOT EXISTS share_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_link_id TEXT NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  meta TEXT, ip_hash TEXT, user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS share_events_link_idx ON share_events(share_link_id);
CREATE TABLE IF NOT EXISTS client_feedback (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_link_id TEXT,
  type TEXT NOT NULL,
  message TEXT, contact TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT 'trust',
  language TEXT NOT NULL DEFAULT 'hy',
  core_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT, approval_sent_at TEXT, approved_at TEXT, published_at TEXT,
  created_by TEXT, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_scheduled_idx ON posts(scheduled_at);
CREATE TABLE IF NOT EXISTS post_variants (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  text TEXT NOT NULL,
  hashtags TEXT, cta TEXT,
  format TEXT NOT NULL DEFAULT 'image',
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT, external_url TEXT, error TEXT, published_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS post_variants_unique ON post_variants(post_id, platform);
CREATE TABLE IF NOT EXISTS post_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'media',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS post_assets_post_idx ON post_assets(post_id);
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE,
  display_name TEXT, external_id TEXT, profile_url TEXT, credentials TEXT,
  status TEXT NOT NULL DEFAULT 'not_connected',
  last_checked_at TEXT, last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS telegram_threads (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  message_id INTEGER,
  state TEXT NOT NULL DEFAULT 'sent',
  editing_platform TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'kitchen',
  title TEXT NOT NULL,
  summary TEXT,
  cover_asset_id TEXT, asset_ids TEXT, video_asset_id TEXT, live_url TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  path TEXT, locale TEXT, segment TEXT, referrer TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  visitor_hash TEXT, meta TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS analytics_created_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_type_idx ON analytics_events(type);
`,
  },
  {
    // Referential integrity for the columns SQLite cannot cover with a foreign key, plus the
    // language-independent payload for system timeline entries.
    //
    // tasks(entity_type, entity_id) and activities(entity_type, entity_id) are polymorphic, and
    // projects.lead_id / assets.lead_id point across a boundary that was never declared. Deleting a
    // company therefore left tasks linked to nothing, orphan activity rows, and contacts that kept
    // kind='contact' with no company (so they showed up in neither the Contacts nor the Individuals
    // list). Triggers keep this consistent whichever code path does the delete.
    id: "0002_integrity_and_activity_meta",
    sql: `
ALTER TABLE activities ADD COLUMN meta TEXT;

-- A person inside a company that no longer exists is simply an individual.
UPDATE clients SET kind = 'individual' WHERE kind = 'contact' AND company_id IS NULL;

CREATE TRIGGER IF NOT EXISTS clients_contact_without_company_ins
AFTER INSERT ON clients
WHEN NEW.kind = 'contact' AND NEW.company_id IS NULL
BEGIN
  UPDATE clients SET kind = 'individual' WHERE id = NEW.id;
END;

-- Fires for ON DELETE SET NULL as well, so deleting a company converts its contacts.
CREATE TRIGGER IF NOT EXISTS clients_contact_without_company_upd
AFTER UPDATE OF company_id ON clients
WHEN NEW.kind = 'contact' AND NEW.company_id IS NULL
BEGIN
  UPDATE clients SET kind = 'individual' WHERE id = NEW.id;
END;

-- Unlink tasks and drop the timeline of an entity that no longer has a page to show it.
CREATE TRIGGER IF NOT EXISTS companies_unlink_after_delete
AFTER DELETE ON companies
BEGIN
  UPDATE tasks SET entity_type = NULL, entity_id = NULL WHERE entity_type = 'company' AND entity_id = OLD.id;
  DELETE FROM activities WHERE entity_type = 'company' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS clients_unlink_after_delete
AFTER DELETE ON clients
BEGIN
  UPDATE tasks SET entity_type = NULL, entity_id = NULL WHERE entity_type = 'client' AND entity_id = OLD.id;
  DELETE FROM activities WHERE entity_type = 'client' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS projects_unlink_after_delete
AFTER DELETE ON projects
BEGIN
  UPDATE tasks SET entity_type = NULL, entity_id = NULL WHERE entity_type = 'project' AND entity_id = OLD.id;
  DELETE FROM activities WHERE entity_type = 'project' AND entity_id = OLD.id;
  UPDATE leads SET project_id = NULL WHERE project_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS leads_unlink_after_delete
AFTER DELETE ON leads
BEGIN
  UPDATE tasks SET entity_type = NULL, entity_id = NULL WHERE entity_type = 'lead' AND entity_id = OLD.id;
  DELETE FROM activities WHERE entity_type = 'lead' AND entity_id = OLD.id;
  UPDATE projects SET lead_id = NULL WHERE lead_id = OLD.id;
  UPDATE assets SET lead_id = NULL WHERE lead_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS posts_unlink_after_delete
AFTER DELETE ON posts
BEGIN
  DELETE FROM activities WHERE entity_type = 'post' AND entity_id = OLD.id;
END;

-- One-off cleanup of what earlier deletes left behind.
UPDATE tasks SET entity_type = NULL, entity_id = NULL
WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND (
     (entity_type = 'company' AND entity_id NOT IN (SELECT id FROM companies))
  OR (entity_type = 'client'  AND entity_id NOT IN (SELECT id FROM clients))
  OR (entity_type = 'project' AND entity_id NOT IN (SELECT id FROM projects))
  OR (entity_type = 'lead'    AND entity_id NOT IN (SELECT id FROM leads))
);

DELETE FROM activities
WHERE (entity_type = 'company' AND entity_id NOT IN (SELECT id FROM companies))
   OR (entity_type = 'client'  AND entity_id NOT IN (SELECT id FROM clients))
   OR (entity_type = 'project' AND entity_id NOT IN (SELECT id FROM projects))
   OR (entity_type = 'lead'    AND entity_id NOT IN (SELECT id FROM leads))
   OR (entity_type = 'post'    AND entity_id NOT IN (SELECT id FROM posts));

UPDATE projects SET lead_id = NULL WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads);
UPDATE leads SET project_id = NULL WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects);

-- Attachments uploaded before leads claimed them: give each one the lead that lists it, so a
-- conversion can only move files that belong to that lead.
UPDATE assets SET lead_id = (SELECT l.id FROM leads l WHERE l.files IS NOT NULL AND instr(l.files, assets.id) > 0 ORDER BY l.created_at LIMIT 1)
WHERE lead_id IS NULL
  AND kind = 'client_upload'
  AND EXISTS (SELECT 1 FROM leads l WHERE l.files IS NOT NULL AND instr(l.files, assets.id) > 0);
`,
  },
  {
    // Project codes must never be handed out twice. The sequence lives in its own row instead of
    // being derived from the projects that happen to exist: deleting AT-2026-0005 used to free that
    // code again, so two different projects could end up with the same number in quotes and links.
    id: "0003_project_code_counter",
    sql: `
CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO counters (key, value)
  SELECT 'project_seq:' || substr(code, 4, 4), max(cast(substr(code, 9) as integer))
  FROM projects WHERE code LIKE 'AT-____-%' GROUP BY substr(code, 4, 4);
`,
  },
  {
    // Where a post came from. Everything created before this migration was typed in the composer,
    // so 'manual' is the right value for every existing row and the column can be NOT NULL at once.
    // source_ref holds the inbox folder name, which is what the editor banner and the trace back to
    // data/inbox/_imported/… are built on.
    //
    // SQLite has no "ADD COLUMN IF NOT EXISTS"; the ledger in db/index.ts is what makes this run
    // exactly once (inside a transaction, recorded in _migrations), so a second boot is a no-op.
    id: "0004_post_source",
    sql: `
ALTER TABLE posts ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE posts ADD COLUMN source_ref TEXT;
CREATE INDEX IF NOT EXISTS posts_source_idx ON posts(source);
`,
  },
  {
    // Smart Canvas (per-variant, since Facebook and Instagram can want different treatment of the
    // same source image) and background audio (per-post: one soundtrack, mixed into whichever video
    // variant publishes). Every column is optional or defaulted, so existing rows need no backfill:
    // canvas_mode null keeps today's platform-default padding, audio_mode 'none' keeps today's silent
    // publish behaviour exactly.
    id: "0005_canvas_and_audio",
    sql: `
ALTER TABLE post_variants ADD COLUMN canvas_mode TEXT;
ALTER TABLE post_variants ADD COLUMN canvas_matte TEXT NOT NULL DEFAULT 'blur';
ALTER TABLE posts ADD COLUMN audio_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE posts ADD COLUMN audio_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN audio_ambient_file TEXT;
`,
  },
];
