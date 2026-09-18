import { ensureFirstAdmin } from "../lib/auth";
import { env } from "../lib/env";
import { ensureInboxDir } from "../lib/inbox";
import { ensureAudioDir } from "../lib/audio";
import { startWorker } from "./index";

export async function bootNode() {
  await ensureFirstAdmin();
  // Zero configuration: the drop folder and its README exist from the first boot, whether or not the
  // worker runs in this process. A read-only volume is a warning, never a failed boot.
  try {
    ensureInboxDir();
  } catch (e) {
    console.warn("[inbox] could not create the inbox folder:", (e as Error).message);
  }
  try {
    ensureAudioDir();
  } catch (e) {
    console.warn("[audio] could not create the audio folder:", (e as Error).message);
  }
  if (env.runWorkerInApp) startWorker();
}
