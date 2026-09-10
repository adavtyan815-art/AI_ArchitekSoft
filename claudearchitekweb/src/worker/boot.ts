import { ensureFirstAdmin } from "../lib/auth";
import { env } from "../lib/env";
import { startWorker } from "./index";

export async function bootNode() {
  await ensureFirstAdmin();
  if (env.runWorkerInApp) startWorker();
}
