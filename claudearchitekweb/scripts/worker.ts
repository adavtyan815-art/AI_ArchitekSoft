/** Standalone worker process: `npm run worker` (set RUN_WORKER_IN_APP=false in the web process). */
import "dotenv/config";
import { startWorker } from "../src/worker";
import { ensureFirstAdmin } from "../src/lib/auth";

ensureFirstAdmin().then(() => {
  startWorker();
  console.log("[worker] standalone worker running. Press Ctrl+C to stop.");
});
