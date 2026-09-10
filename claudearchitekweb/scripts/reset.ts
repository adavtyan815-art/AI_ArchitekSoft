/** Deletes the local database and uploads (local testing only). */
import "dotenv/config";
import fs from "node:fs";
import { env } from "../src/lib/env";

for (const f of [env.databasePath, `${env.databasePath}-wal`, `${env.databasePath}-shm`]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
if (fs.existsSync(env.uploadDir)) fs.rmSync(env.uploadDir, { recursive: true, force: true });
console.log("Local database and uploads removed. Run `npm run db:seed` to recreate demo data.");
