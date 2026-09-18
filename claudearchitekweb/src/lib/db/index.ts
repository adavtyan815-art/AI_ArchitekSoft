/**
 * Database client. SQLite file at DATABASE_PATH (default ./data/architeksoft.db).
 * Migrations are plain SQL statements applied idempotently on first access,
 * so a fresh checkout works with zero manual steps.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { env } from "../env";
import { MIGRATIONS } from "./migrations";

type DB = BetterSQLite3Database<typeof schema>;

declare global {
  // `var` is required here: `let`/`const` do not create a property on globalThis.
  var __architek_db: { sqlite: Database.Database; db: DB; migrations: number } | undefined;
}

function open() {
  const file = env.databasePath;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL"); // safe with WAL, much faster writes
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("cache_size = -32000"); // 32 MB page cache
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("mmap_size = 268435456"); // 256 MB memory-mapped reads
  migrate(sqlite);
  const db = drizzle(sqlite, { schema });
  return { sqlite, db, migrations: MIGRATIONS.length };
}

/**
 * The open connection lives on `globalThis` so hot reloads reuse it. That also means a migration
 * added while the dev server is running would otherwise wait for a full restart, with the code
 * already expecting the new columns — so the list is re-checked here (one integer compare).
 */
function handle() {
  const existing = globalThis.__architek_db;
  if (!existing) return (globalThis.__architek_db = open());
  if (existing.migrations !== MIGRATIONS.length) {
    migrate(existing.sqlite);
    existing.migrations = MIGRATIONS.length;
  }
  return existing;
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`
  );
  const applied = new Set(
    (sqlite.prepare(`SELECT id FROM _migrations`).all() as { id: string }[]).map((r) => r.id)
  );
  const insert = sqlite.prepare(`INSERT INTO _migrations (id) VALUES (?)`);
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const tx = sqlite.transaction(() => {
      sqlite.exec(m.sql);
      insert.run(m.id);
    });
    tx();
  }
}

export function getDb(): DB {
  return handle().db;
}

export function getSqlite(): Database.Database {
  return handle().sqlite;
}

export { schema };
