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
  // eslint-disable-next-line no-var
  var __architek_db: { sqlite: Database.Database; db: DB } | undefined;
}

function open() {
  const file = env.databasePath;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  migrate(sqlite);
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
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
  if (!globalThis.__architek_db) globalThis.__architek_db = open();
  return globalThis.__architek_db.db;
}

export function getSqlite(): Database.Database {
  if (!globalThis.__architek_db) globalThis.__architek_db = open();
  return globalThis.__architek_db.sqlite;
}

export { schema };
