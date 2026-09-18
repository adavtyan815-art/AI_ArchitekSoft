/**
 * Local file inbox, from the command line.
 *
 *   npm run inbox                 import everything that has finished copying, and report
 *   npm run inbox -- --dry-run    only list what would happen, change nothing
 *   npm run inbox -- --example    create a ready-made example folder to test with
 *   npm run inbox -- --quiet      import without sending the Telegram / e-mail suggestion
 *
 * It talks to the same database and the same importer as the worker, so running it while the dev
 * server is up is safe: each folder is claimed with an atomic rename and imported exactly once.
 */
import "dotenv/config";
import path from "node:path";
import { createExampleFolder, ensureInboxDir, inboxRoot, runInbox, scanInboxSettled, type InboxEntry } from "../src/lib/inbox";
import { fmtYerevan } from "../src/lib/tz";

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const dryRun = has("--dry-run") || has("-n");
const example = has("--example");
const quiet = has("--quiet");

function mb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function age(mtimeMs: number): string {
  const s = Math.max(0, Math.round((Date.now() - mtimeMs) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

function printEntry(e: InboxEntry) {
  // An empty folder is never stable; saying "waiting" about it would be misleading. A folder that
  // only *looks* empty (files too deep, system files) says so on its own line instead.
  const state = e.fileCount === 0 && !e.stable ? "EMPTY  " : e.stable ? "READY  " : "WAITING";
  const files = e.usableCount === e.fileCount ? `${e.fileCount} file(s)` : `${e.usableCount} of ${e.fileCount} usable`;
  console.log(`  [${state}] ${e.name}`);
  console.log(`            ${files}, ${mb(e.totalBytes)}, last change ${age(e.newestMtimeMs)}${e.hasBrief ? ", brief found" : ""}${e.kind === "loose" ? ", loose files" : ""}`);
  for (const note of e.notes) console.log(`            ${note}`);
  if (e.fileCount === 0 && !e.notes.length) console.log(`            nothing in this folder yet`);
  else if (!e.stable) console.log(`            waiting until nothing has changed for 30 s`);
  if (e.usableCount === 0 && !e.hasBrief) console.log(`            no supported image or video and no brief — this folder would fail`);
}

async function main() {
  // A dry run must not create the inbox, its house-keeping folders or its README either.
  const root = dryRun ? inboxRoot() : ensureInboxDir();
  console.log(`ArchiTek Soft — file inbox`);
  console.log(`Folder: ${root}`);
  console.log("");

  if (example) {
    const made = createExampleFolder();
    console.log(`Example folder created:`);
    console.log(`  ${made.dir}`);
    for (const f of made.files) console.log(`    ${f}`);
    console.log("");
    console.log(`Wait ~30 seconds, then run "npm run inbox" (or press "Import now" in Admin → Social media).`);
    return;
  }

  const entries = await scanInboxSettled({ readOnly: dryRun });
  if (!entries.length) {
    console.log("The inbox is empty.");
    console.log("");
    console.log(`Drop a folder with renders into ${path.relative(process.cwd(), root) || root},`);
    console.log(`or run "npm run inbox -- --example" to create a test folder.`);
    return;
  }

  console.log(`${entries.length} entr${entries.length === 1 ? "y" : "ies"} in the inbox:`);
  for (const e of entries) printEntry(e);
  console.log("");

  const ready = entries.filter((e) => e.stable);
  if (dryRun) {
    console.log(`Dry run — nothing was imported and no file was moved. ${ready.length} of ${entries.length} would be imported now.`);
    return;
  }
  if (!ready.length) {
    console.log("Nothing is ready yet. Files are still being written; try again in half a minute.");
    return;
  }

  // scanInboxSettled() above already primed the stability check, so this run imports immediately.
  const run = await runInbox({ notify: !quiet });
  // A folder that is held open by another program is neither imported nor "still copying"; it has
  // to be named, or it silently repeats on every run for ever.
  for (const b of run.blocked) {
    console.log(`  BLOCKED ${b.name}`);
    console.log(`        a file in this folder is open in another program — close it and run this again`);
    console.log(`        ${b.error}`);
  }
  if (!run.imported.length) {
    if (!run.blocked.length) {
      // Every ready folder was claimed by the worker (or another run) between the two scans.
      console.log(`Nothing left to import — the background worker had already picked these up.`);
    }
    return;
  }
  console.log(`Imported ${run.imported.filter((r) => r.ok).length} of ${ready.length}:`);
  for (const r of run.imported) {
    if (r.ok) {
      console.log(`  ${r.unreadable ? "PARTIAL" : "OK    "} ${r.name}`);
      console.log(`        post ${r.postId} — "${r.title}", ${r.assets} asset(s)`);
      if (r.unreadable) console.log(`        ${r.unreadable} file(s) could not be read and were left out — the folder is in _failed/ with an error.txt`);
      if (r.scheduledAt) console.log(`        scheduled: ${fmtYerevan(r.scheduledAt)} (Yerevan)`);
      else if (r.suggestedSlot) console.log(`        suggested slot: ${fmtYerevan(r.suggestedSlot)} (Yerevan) — apply it in the editor`);
      for (const w of r.warnings) console.log(`        ! ${w}`);
      console.log(`        files moved to: ${r.movedTo}`);
    } else {
      console.log(`  FAIL  ${r.name}`);
      console.log(`        ${r.error}`);
      console.log(`        files moved to: ${r.movedTo} (see error.txt there)`);
    }
  }
  if (run.skipped.length) {
    console.log("");
    console.log(`${run.skipped.length} still copying: ${run.skipped.map((e) => e.name).join(", ")}`);
  }
  console.log("");
  console.log(`Review the drafts in Admin → Social media: ${process.env.APP_URL || "http://localhost:3100"}/admin/smm`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`Inbox failed: ${(e as Error).message}`);
    console.error(`Inbox folder: ${inboxRoot()}`);
    process.exit(1);
  },
);
