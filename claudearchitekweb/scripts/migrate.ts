import "dotenv/config";
import { getSqlite } from "../src/lib/db";

const db = getSqlite();
const rows = db.prepare("SELECT id, applied_at FROM _migrations ORDER BY applied_at").all() as { id: string; applied_at: string }[];
console.log("Applied migrations:");
for (const r of rows) console.log(`  ${r.id}  (${r.applied_at})`);
