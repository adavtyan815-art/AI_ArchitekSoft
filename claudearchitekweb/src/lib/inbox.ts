/**
 * Local file inbox → suggested post.
 *
 * The owner copies files into `INBOX_DIR` (default `./data/inbox`) — one sub-folder per post, or a
 * few loose files in the root. Every 60 seconds the worker (and, on demand, the admin panel or
 * `npm run inbox`) picks up what is *finished copying*, turns it into a post pack and suggests it.
 *
 * Four rules the whole file is built on:
 *
 *  1. **Never import half a folder.** A folder counts as stable only when nothing in it was modified
 *     in the last 30 seconds *and* the file list, the sizes *and a digest of each file's first and
 *     last 64 KB* are identical in two consecutive scans — a copier that pre-allocates the final
 *     size and preserves timestamps would satisfy the first two on its own. On top of that, every
 *     image and video has to decode before it is attached, so bytes that are still arriving are
 *     caught even if both scans were fooled.
 *  2. **Never import a folder twice.** Importing starts by *moving* the folder into `_processing/`
 *     with `fs.rename`, which is atomic: when the worker tick and the admin's "Import now" race, the
 *     loser gets ENOENT and does nothing. Loose files use their first file as the same kind of token.
 *  3. **Never delete the owner's files.** A folder ends up in `_imported/<when> <name>/` or, on
 *     failure, in `_failed/<when> <name>/` next to an `error.txt` that says what went wrong.
 *  4. **Never fail on a detail.** An unreadable brief key, an unsupported file, a project code that
 *     does not exist — all of these are warnings in the result. Only "nothing usable at all" fails.
 *
 * The brief (`post.txt` / `post.md` / `post.json`) is optional and every key in it is optional.
 * Armenian, Russian and English names and text work, including the UTF-16 files Windows Notepad
 * writes when "Unicode" is picked in its Save dialog.
 *
 * What the rest of the project may call — everything else in here is an implementation detail and
 * stays module-private, so a reader can tell the supported surface from the internals:
 *   `inboxRoot`, `ensureInboxDir`, `createExampleFolder` — where the folder is and how to seed it;
 *   `scanInbox`, `scanInboxSettled` — what is waiting (the admin hub and the worker);
 *   `runInbox` — import what is ready and tell the owner (the worker tick, "Import now", the CLI);
 *   `wasImported`, `suggestSlot`, `suggestedSlotOf`, `notesForDisplay` — small read helpers for the UI;
 *   plus the `InboxEntry` / `InboxFile` / `Brief` / `ImportResult` / `InboxRunResult` types.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { and, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { PLATFORMS, type Platform, type PostGoal } from "./ai";
import { MAX_UPLOAD_BYTES, absPath, deleteAsset, effectiveMime, isAllowed, saveAsset } from "./media";
import { createPostPack, getPostFull } from "./smm";
import { getSetting } from "./settings";
import { logActivity } from "./crm";
import { sendEmail } from "./notify";
import * as tg from "./telegram";
import { fmtYerevan, nextYerevanSlot } from "./tz";
import { nowIso } from "./utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Nothing in a folder may have been modified in the last 30 s before it is imported. */
const QUIET_MS = 30_000;
/** How long the two stability scans are apart when one call has to decide on its own. */
const SETTLE_MS = 1200;
/** A claim left behind by a crash is returned to the inbox after this. */
const STALE_CLAIM_MS = 30 * 60_000;
/** Sub-folders of the inbox that are ours, not the owner's. */
const PROCESSING_DIR = "_processing";
const IMPORTED_DIR = "_imported";
const FAILED_DIR = "_failed";
const RESERVED = new Set([PROCESSING_DIR, IMPORTED_DIR, FAILED_DIR]);
/** A post takes at most this many media files (the admin composer has the same cap). */
const MAX_FILES = 20;
/** How deep a post folder is walked (renders/final/4k/ … — but not an entire archive tree). */
const MAX_DEPTH = 5;
/** The brief is read up to here; a log or an export saved as post.txt must not be read into memory whole. */
const MAX_BRIEF_BYTES = 64 * 1024;
/** How much of the brief reaches the copywriter — the same cap the admin composer puts on the field. */
const MAX_BRIEF_CHARS = 2000;
/** How much of each file is hashed into the stability signature (head + tail). */
const SIGNATURE_CHUNK = 64 * 1024;
/** The claim's lock and folder are re-stamped this often while an import runs, so it is never stale. */
const CLAIM_TOUCH_MS = 60_000;
const BRIEF_BASENAMES = ["post.json", "post.txt", "post.md"];
/** How the suggested slot is written into posts.notes, and read back out of it. */
const SLOT_LABEL = "Suggested slot:";
const SLOT_RE = /Suggested slot:\s*(\d{4}-\d{2}-\d{2}T[0-9:.]+Z)/;

export function inboxRoot(): string {
  return env.inboxDir;
}

// ---------------------------------------------------------------------------
// The folder itself
// ---------------------------------------------------------------------------

const README = `ArchiTek Soft — ֆայլերի պանակ (inbox)
=====================================

ԻՆՉՊԵՍ ԱՇԽԱՏԵԼ

1. Այս պանակի ներսում ստեղծիր մեկ ենթապանակ՝ մեկ փոստի համար։
   Անունը կարող է լինել հայերեն, ռուսերեն կամ անգլերեն։
   Օրինակ՝   2026-09-17 ընկույզի խոհանոց/

2. Ենթապանակի մեջ դիր նկարները և (ըստ ցանկության) մեկ վիդեո։
   Թույլատրված են՝  .jpg .jpeg .png .webp .avif .gif
                     .mp4 .mov .webm .mkv
                     .pdf .glb .usdz

3. Ըստ ցանկության ավելացրու post.txt՝ կարճ բրիֆով։ Բոլոր տողերն ընտրովի են։

       language: hy
       goal: showcase
       platforms: facebook, instagram, telegram
       project: AT-2026-0003
       schedule: auto
       ---
       Ընկույզի խոհանոց երևանյան ընտանիքի համար։ Շեշտը՝ կղզյակի վրա։

   «---» տողից հետո՝ ազատ տեքստ. ինչ պետք է իմանա տեքստ գրողը։
   Հնարավոր արժեքները՝
       language:   hy | ru | en
       goal:       trust | sales_b2b | sales_b2c | showcase | education
       platforms:  facebook, instagram, linkedin, telegram, youtube, tiktok
       project:    նախագծի կոդը (AT-2026-0003) կամ id-ն
       schedule:   auto  (ինքնուրույն ընտրի ժամը)  |  none  |  2026-09-22 11:00
       title:      փոստի ներքին անվանումը

4. Սպասիր մինչև 60 վայրկյան, կամ բացիր Ադմին → Սոց. ցանցեր և սեղմիր
   «Ներմուծել հիմա»։ Համակարգը կստեղծի փոստի սևագիրը՝ առանձին տեքստով
   ամեն հարթակի համար, և կառաջարկի հրապարակման ժամ։

5. Ֆայլերդ չեն ջնջվում։ Հաջողության դեպքում պանակը տեղափոխվում է _imported/,
   սխալի դեպքում՝ _failed/, որտեղ կգտնես error.txt՝ պատճառով։

ԿԱՐԵՎՈՐ
  • Պանակը ներմուծվում է միայն երբ պատճենումն ավարտված է՝ վերջին 30 վայրկյանում
    ոչ մի ֆայլ չի փոխվել, և ֆայլերի բովանդակությունը նույնն է երկու ստուգման
    ժամանակ։ Այսինքն՝ կարող ես հանգիստ պատճենել մեծ վիդեո։
  • «_» կամ «.» նշանով սկսվող ՊԱՆԱԿՆԵՐՆ անտեսվում են։ Ֆայլերը՝ ոչ.
    _final.jpg-ը ներմուծվում է։
  • Չթույլատրված ֆայլերը (.zip .dwg .docx .xlsx …) բաց են թողնվում, և դա
    գրվում է փոստի նշումներում։
  • Անմիջապես այստեղ դրված ֆայլերը խմբավորվում են ըստ անվան.
    render-01.jpg + render-02.jpg → մեկ փոստ։
  • Անծանոթ տողերը բրիֆում պարզապես անտեսվում են, սխալ չեն համարվում։
  • Եթե պանակի ինչ-որ ֆայլ բաց է այլ ծրագրում, ներմուծումը հնարավոր չէ։
    Ադմին վահանակը կասի այդ մասին. փակիր ֆայլը և փորձիր նորից։

Ամբողջական ուղեցույցը՝ docs/15_INBOX_WORKFLOW.md


ArchiTek Soft — local file inbox
================================

HOW IT WORKS

1. Create one sub-folder per post inside this folder. Armenian, Russian and
   English names all work, e.g.   2026-09-17 walnut kitchen/

2. Put the renders in it, and optionally one video.
   Allowed:  .jpg .jpeg .png .webp .avif .gif / .mp4 .mov .webm .mkv
             .pdf .glb .usdz

3. Optionally add post.txt with a short brief. Every line is optional:

       language: hy
       goal: showcase
       platforms: facebook, instagram, telegram
       project: AT-2026-0003
       schedule: auto
       ---
       Walnut kitchen for a family in Yerevan; emphasise the island.

   Values:
       language:   hy | ru | en
       goal:       trust | sales_b2b | sales_b2c | showcase | education
       platforms:  facebook, instagram, linkedin, telegram, youtube, tiktok
       project:    project code (AT-2026-0003) or id
       schedule:   auto | none | 2026-09-22 11:00
       title:      internal name of the post

4. Wait up to 60 seconds, or open Admin → Social media and press "Import now".
   The system writes a draft with one text per platform and suggests a slot.

5. Your files are never deleted. The folder is moved to _imported/ on success,
   or to _failed/ with an error.txt that explains what went wrong.

GOOD TO KNOW
  • A folder is imported only once nothing in it has changed for 30 seconds and
    the contents of every file are identical in two checks, so copying a large
    video in is safe.
  • FOLDERS starting with "_" or "." are ignored. Files are not: "_final.jpg"
    is imported like any other render.
  • File types that are not on the list above (.zip .dwg .docx .xlsx …) are
    skipped, and the post's notes say which ones.
  • Loose files here are grouped by name: render-01.jpg + render-02.jpg = one post.
  • Unknown brief keys are reported as a warning, never as an error.
  • A folder cannot be imported while a file in it is open in another program.
    The admin panel says so; close the file and it goes through on the next try.

Full guide: docs/15_INBOX_WORKFLOW.md
`;

/** Creates the inbox (and its README and house-keeping folders) if they are not there yet. */
export function ensureInboxDir(): string {
  const root = inboxRoot();
  fs.mkdirSync(root, { recursive: true });
  for (const d of [PROCESSING_DIR, IMPORTED_DIR, FAILED_DIR]) fs.mkdirSync(path.join(root, d), { recursive: true });
  const readme = path.join(root, "README.txt");
  // Only when missing: the owner may have added their own notes to it.
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, `﻿${README}`, "utf8");
  return root;
}

// ---------------------------------------------------------------------------
// Names and paths
// ---------------------------------------------------------------------------

/** Drops control characters (written out by code point, so no escape ends up inside a regex). */
function stripControl(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
  }
  return out;
}

/**
 * A folder name that is safe to create *inside* the inbox. Path separators, `..`, control
 * characters and the characters Windows refuses are removed, so nothing a brief or a folder name
 * contains can point outside the inbox.
 */
function safeName(raw: string, fallback = "post"): string {
  const cleaned = stripControl(raw)
    .replace(/[\\/]+/g, " ")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "")
    .trim()
    .slice(0, 80)
    .trim();
  if (!cleaned || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(cleaned)) return fallback;
  return cleaned;
}

/** A short, stable, file-name-safe digest of a string. */
function shortHash(s: string, length = 8): string {
  return createHash("sha1").update(s, "utf8").digest("hex").slice(0, length);
}

/**
 * Like `safeName`, but two different long names never collapse into one. `safeName` cuts at 80
 * characters, and a naming convention that puts the date and the client first makes two folders
 * agreeing on their first 80 characters easy — they would then share a lock file and land in
 * `_imported/` under the same name. When the cut actually loses something, the digest of the full
 * name is appended, so the result is still readable and still unique.
 */
function uniqueName(raw: string, fallback = "post", max = 80): string {
  const cleaned = stripControl(raw).trim();
  if (cleaned.length <= max) return safeName(cleaned, fallback);
  // 9 characters are reserved for "-" plus the digest.
  return `${safeName(cleaned.slice(0, max - 9), fallback)}-${shortHash(cleaned)}`;
}

/** `MAP[key]` without the prototype: `language: constructor` must not resolve to a function. */
function lookup<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/** Joins inside `root` and refuses anything that would escape it. */
function resolveInside(root: string, ...parts: string[]): string {
  const base = path.resolve(root);
  const p = path.resolve(base, ...parts);
  if (p !== base && !p.startsWith(base + path.sep)) throw new Error("Invalid inbox path");
  return p;
}

/**
 * `<dir>/<name>`, with a numeric suffix when that name is taken. Never overwrites.
 *
 * `uniqueName`, not `safeName`: this is the last step before the name hits the disk, and plain
 * truncation here would undo any uniqueness the caller built into a long name.
 */
function freePath(dir: string, name: string): string {
  const base = uniqueName(name);
  let candidate = resolveInside(dir, base);
  for (let i = 2; fs.existsSync(candidate) && i < 500; i++) candidate = resolveInside(dir, `${base} (${i})`);
  return candidate;
}

/** "2026-09-17 1403" — sorts chronologically in the file manager. */
function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Text decoding: UTF-8, UTF-8 + BOM, UTF-16 LE/BE (Windows Notepad)
// ---------------------------------------------------------------------------

function swap16(b: Buffer): Buffer {
  if (b.length % 2) return b;
  const copy = Buffer.from(b);
  copy.swap16();
  return copy;
}

function decodeText(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return swap16(buf.subarray(2)).toString("utf16le");
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  // No BOM. Latin text saved as UTF-16 is half NUL bytes, all on the same side; UTF-8 has none.
  const probe = buf.subarray(0, Math.min(buf.length, 1024));
  let odd = 0;
  let even = 0;
  for (let i = 0; i < probe.length; i++) {
    if (probe[i] !== 0) continue;
    if (i % 2) odd++;
    else even++;
  }
  if (probe.length > 8 && odd > probe.length / 8 && even === 0) return buf.toString("utf16le");
  if (probe.length > 8 && even > probe.length / 8 && odd === 0) return swap16(buf).toString("utf16le");
  return buf.toString("utf8");
}

// ---------------------------------------------------------------------------
// The brief
// ---------------------------------------------------------------------------

export type Brief = {
  language?: "hy" | "ru" | "en";
  goal?: PostGoal;
  platforms?: Platform[];
  project?: string;
  /** `schedule: auto` — apply the suggested slot instead of only proposing it. */
  scheduleAuto?: boolean;
  /** An explicit moment from `schedule:` / `scheduledAt:` (ISO UTC). */
  scheduledAt?: string;
  title?: string;
  instructions?: string;
  body?: string;
};

/** `Scheduled_At` / `scheduledAt` / `SCHEDULED AT` all reduce to the same key. */
const canonicalKey = (raw: string) => raw.toLowerCase().replace(/[\s_-]+/g, "");

const KEY_ALIASES: Record<string, keyof Brief | "schedule"> = {
  language: "language",
  lang: "language",
  goal: "goal",
  platform: "platforms",
  platforms: "platforms",
  project: "project",
  projectcode: "project",
  projectid: "project",
  schedule: "schedule",
  scheduledat: "scheduledAt",
  when: "scheduledAt",
  date: "scheduledAt",
  datetime: "scheduledAt",
  title: "title",
  name: "title",
  instructions: "instructions",
  instruction: "instructions",
  notes: "instructions",
  note: "instructions",
  brief: "instructions",
  text: "body",
  body: "body",
};

const LANGS: Record<string, "hy" | "ru" | "en"> = {
  hy: "hy", hye: "hy", arm: "hy", am: "hy", armenian: "hy", hayeren: "hy", հայերեն: "hy",
  ru: "ru", rus: "ru", russian: "ru", русский: "ru",
  en: "en", eng: "en", english: "en",
};
const GOALS: PostGoal[] = ["trust", "sales_b2b", "sales_b2c", "showcase", "education"];
const PLATFORM_ALIASES: Record<string, Platform> = {
  fb: "facebook", facebook: "facebook",
  ig: "instagram", insta: "instagram", instagram: "instagram",
  li: "linkedin", in: "linkedin", linkedin: "linkedin",
  tg: "telegram", telegram: "telegram",
  yt: "youtube", youtube: "youtube",
  tt: "tiktok", tiktok: "tiktok",
};

/**
 * "2026-09-22 11:00" / "2026-09-22T11:00" are read as Yerevan wall-clock time, a bare date as that
 * day at the configured posting time, and anything carrying a zone (Z, +04:00) exactly as written.
 */
function parseWhen(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const time = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(getSetting("smm").postingTime.trim()) ? getSetting("smm").postingTime.trim() : "11:00";
    const d = new Date(`${v}T${time.padStart(5, "0")}:00+04:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (local) {
    const d = new Date(`${local[1]}T${local[2].padStart(2, "0")}:${local[3]}:${local[4] ?? "00"}+04:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function applyKey(brief: Brief, key: string, value: string, warn: (s: string) => void) {
  // Every map is read through `lookup`: a plain `MAP[v]` would resolve "constructor", "toString" or
  // "__proto__" through the prototype chain, hand a *function* to the post pack and crash the import
  // long after the renders have already been written into the media library.
  const target = lookup(KEY_ALIASES, canonicalKey(key));
  const v = value.trim();
  if (!target) {
    warn(`Unknown key "${key.trim().slice(0, 40)}" was ignored.`);
    return;
  }
  if (!v) return;
  if (target === "language") {
    const lang = lookup(LANGS, v.toLowerCase());
    if (lang === "hy" || lang === "ru" || lang === "en") brief.language = lang;
    else warn(`language "${v.slice(0, 20)}" is not hy / ru / en — the default was used.`);
  } else if (target === "goal") {
    const goal = v.toLowerCase().replace(/[\s-]+/g, "_") as PostGoal;
    if (GOALS.includes(goal)) brief.goal = goal;
    else warn(`goal "${v.slice(0, 20)}" is unknown — the default was used.`);
  } else if (target === "platforms") {
    const picked: Platform[] = [];
    for (const part of v.split(/[,;\s]+/).filter(Boolean)) {
      const p = lookup(PLATFORM_ALIASES, part.toLowerCase());
      if (p && (PLATFORMS as readonly string[]).includes(p)) {
        if (!picked.includes(p)) picked.push(p);
      } else warn(`platform "${part.slice(0, 20)}" is unknown — it was skipped.`);
    }
    if (picked.length) brief.platforms = picked;
  } else if (target === "project") {
    brief.project = v.slice(0, 120);
  } else if (target === "schedule") {
    const low = v.toLowerCase();
    if (["auto", "yes", "true", "1", "on"].includes(low)) brief.scheduleAuto = true;
    else if (["none", "no", "false", "0", "off", "manual", "draft"].includes(low)) brief.scheduleAuto = false;
    else {
      const when = parseWhen(v);
      if (when) {
        brief.scheduledAt = when;
        brief.scheduleAuto = true;
      } else warn(`schedule "${v.slice(0, 30)}" is not a date and not "auto" — it was ignored.`);
    }
  } else if (target === "scheduledAt") {
    const when = parseWhen(v);
    if (when) {
      brief.scheduledAt = when;
      brief.scheduleAuto = true;
    } else warn(`${key.trim()} "${v.slice(0, 30)}" is not a date — it was ignored.`);
  } else if (target === "title") {
    brief.title = v.slice(0, 120);
  } else if (target === "instructions") {
    brief.instructions = [brief.instructions, v].filter(Boolean).join("\n");
  } else if (target === "body") {
    brief.body = [brief.body, v].filter(Boolean).join("\n");
  }
}

/**
 * Header lines, then `---`, then free text. When there is no `---` only the leading lines whose key
 * is one we know count as a header, so a body that happens to start with "Kitchen: walnut" stays
 * body instead of silently disappearing into an unknown key.
 *
 * With a `---` the header block ends at the separator and nowhere else. A line in it that is not
 * `key: value` — a note to self, an Armenian sentence, a bulleted line — is **not** the end of the
 * header: it is reported and kept as free text, and the keys below it are still read. Stopping at it
 * used to drop it *and* every key under it, without a word.
 */
function parseBriefText(text: string): { brief: Brief; warnings: string[] } {
  const warnings: string[] = [];
  const warn = (s: string) => { warnings.push(s); };
  const brief: Brief = {};
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sepIndex = lines.findIndex((l) => /^\s*-{3,}\s*$/.test(l));
  const headerEnd = sepIndex >= 0 ? sepIndex : lines.length;
  const header = /^\s*([A-Za-z][A-Za-z0-9 _-]{0,40}?)\s*:\s*(.*)$/;
  /** Header lines that were not `key: value`; they become part of the free text. */
  const strays: string[] = [];

  let i = 0;
  for (; i < headerEnd; i++) {
    const line = lines[i];
    if (!line.trim()) {
      if (sepIndex >= 0) continue;
      break;
    }
    const m = header.exec(line);
    if (!m || (sepIndex < 0 && !lookup(KEY_ALIASES, canonicalKey(m[1])))) {
      // Without a separator, this is simply where the header stops and the body starts.
      if (sepIndex < 0) break;
      strays.push(line.trim());
      warn(`Line ${i + 1} of the brief is not "key: value" — it was kept as part of the description: "${line.trim().slice(0, 40)}"`);
      continue;
    }
    applyKey(brief, m[1], m[2], warn);
  }
  const bodyFrom = sepIndex >= 0 ? sepIndex + 1 : i;
  const body = [strays.join("\n"), lines.slice(bodyFrom).join("\n").trim()].filter(Boolean).join("\n\n").trim();
  if (body) brief.body = [brief.body, body].filter(Boolean).join("\n\n");
  return { brief, warnings };
}

function parseBriefJson(text: string): { brief: Brief; warnings: string[] } {
  const warnings: string[] = [];
  const warn = (s: string) => { warnings.push(s); };
  const brief: Brief = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    warnings.push("post.json is not valid JSON — it was ignored.");
    return { brief, warnings };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    warnings.push("post.json must be a JSON object — it was ignored.");
    return { brief, warnings };
  }
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    const flat = Array.isArray(value) ? value.map((v) => String(v)).join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);
    applyKey(brief, key, flat, warn);
  }
  return { brief, warnings };
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

export type InboxFile = {
  rel: string;
  size: number;
  mtimeMs: number;
  /** Digest of the first and last 64 KB; only taken while scanning (see `describe`). */
  contentHash?: string;
};

/** What the walk could see but deliberately did not read, so the owner can be told about it. */
export type WalkSkips = {
  /** System files: Thumbs.db, desktop.ini, .DS_Store, Office lock files. */
  hidden: number;
  /** Sub-folders below MAX_DEPTH that were not descended into. */
  tooDeepDirs: number;
  /** Sub-folders that were walked, so "nothing here but empty folders" can be told apart from "empty". */
  dirs: number;
};

export type InboxEntry = {
  /** Folder name, or the shared name of a group of loose files. Also the post's sourceRef. */
  name: string;
  kind: "folder" | "loose";
  files: InboxFile[];
  fileCount: number;
  totalBytes: number;
  /** Newest modification time in the entry, for the "age" column. */
  newestMtimeMs: number;
  /** Copying has finished: quiet for 30 s and identical to the previous scan. */
  stable: boolean;
  hasBrief: boolean;
  /** How many files would actually become assets (the rest are reported as skipped). */
  usableCount: number;
  /** What the walk did not read. */
  skips: WalkSkips;
  /**
   * Plain sentences about anything in this folder that the file column does not show — files that
   * are too deep, a folder with nothing but system files. Shown in the panel and by the CLI, so a
   * folder is never described as "Empty" while the owner is looking straight at a render in it.
   */
  notes: string[];
};

/** Signatures from the previous scan, so "did anything change?" can be answered. */
const observed = new Map<string, string>();

const IGNORED_FILE = /^(~\$|\.|desktop\.ini$|thumbs\.db$)/i;

type WalkResult = { files: InboxFile[]; skips: WalkSkips };

/**
 * The files in a post folder. `hash` is set while scanning only: reading 64 KB from each end of
 * every file is what makes the stability check independent of the size and the timestamp, both of
 * which a copier can have finished writing while the bytes in between are still on their way.
 */
function walk(dir: string, opts: { hash?: boolean } = {}, base = "", depth = 0, skips?: WalkSkips): WalkResult {
  const out: InboxFile[] = [];
  const counts: WalkSkips = skips ?? { hidden: 0, tooDeepDirs: 0, dirs: 0 };
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { files: out, skips: counts };
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      // The "_" rule belongs to the inbox ROOT, where it hides our own _processing / _imported /
      // _failed and any folder the owner parks there on purpose (scanInbox applies it there). Inside
      // a post folder everything is the owner's content: "_final.jpg" is how a render gets named and
      // "_renders/" is how a folder gets named, and hiding either made a full folder look empty.
      // Only genuinely hidden directories (".git", ".thumbnails") stay out.
      if (e.name.startsWith(".")) {
        counts.hidden++;
        continue;
      }
      if (depth >= MAX_DEPTH) {
        counts.tooDeepDirs++;
        continue;
      }
      counts.dirs++;
      out.push(...walk(abs, opts, rel, depth + 1, counts).files);
      continue;
    }
    if (!e.isFile()) continue;
    if (IGNORED_FILE.test(e.name)) {
      counts.hidden++;
      continue;
    }
    try {
      const st = fs.statSync(abs);
      out.push({ rel, size: st.size, mtimeMs: st.mtimeMs, ...(opts.hash ? { contentHash: contentHash(abs, st.size) } : {}) });
    } catch {
      /* vanished between readdir and stat */
    }
  }
  return { files: out, skips: counts };
}

/**
 * A digest of the first and last 64 KB of a file. Cheap, and it changes while a copy is in flight
 * even when the size and the timestamp already look final — which is exactly what a pre-allocating,
 * timestamp-preserving copier (robocopy /COPY:DT, CopyFileEx, an archive extractor, a render engine
 * writing straight into the folder) produces, and what NTFS reports while it defers the last-write
 * update for an open handle. Without it both halves of the stability rule read the same directory
 * entry and both say "settled" about a file that is still half zeroes.
 */
function contentHash(abs: string, size: number): string {
  let fd: number | null = null;
  try {
    fd = fs.openSync(abs, "r");
    const h = createHash("sha1");
    const head = Buffer.alloc(Math.min(size, SIGNATURE_CHUNK));
    if (head.length) {
      fs.readSync(fd, head, 0, head.length, 0);
      h.update(head);
    }
    if (size > SIGNATURE_CHUNK) {
      const tailLen = Math.min(size - SIGNATURE_CHUNK, SIGNATURE_CHUNK);
      const tail = Buffer.alloc(tailLen);
      fs.readSync(fd, tail, 0, tailLen, size - tailLen);
      h.update(tail);
    }
    return h.digest("hex").slice(0, 16);
  } catch {
    // Unreadable right now (locked by the copier) — say so, so it never matches the previous scan.
    return `x${Date.now()}`;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

const isBriefFile = (rel: string) => BRIEF_BASENAMES.includes(path.basename(rel).toLowerCase());

/**
 * What may become a post's media. Deliberately *not* the admin uploader's allow-list: that one also
 * passes CAD sources and archives (.dwg .skp .zip .csv .xlsx), which sit next to the renders in a
 * designer's folder and cannot be published to any platform. This is the list the documentation and
 * the inbox README have always shown.
 */
const POST_MEDIA_EXT = new Set([
  ".jpg", ".jpeg", ".jpe", ".jfif", ".png", ".webp", ".gif", ".avif",
  ".mp4", ".m4v", ".mov", ".webm", ".mkv",
  ".pdf", ".glb", ".usdz",
]);

function isPostMedia(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return POST_MEDIA_EXT.has(ext) && isAllowed(effectiveMime("", name), name);
}

function usable(f: InboxFile): boolean {
  const name = path.basename(f.rel);
  return !isBriefFile(f.rel) && isPostMedia(name) && f.size > 0 && f.size <= MAX_UPLOAD_BYTES;
}

/** `render-01.jpg` and `render-02.jpg` belong to the same loose post; `clip.mp4` is its own. */
function groupOf(fileName: string): { key: string; label: string } {
  const base = path.parse(fileName).name;
  const stripped = base.replace(/[\s._-]*\d+$/, "").trim();
  const label = stripped || base;
  return { key: label.toLowerCase(), label };
}

const NO_SKIPS: WalkSkips = { hidden: 0, tooDeepDirs: 0, dirs: 0 };

function describe(name: string, kind: InboxEntry["kind"], files: InboxFile[], skips: WalkSkips = NO_SKIPS, fallbackMtimeMs = Date.now()): InboxEntry {
  const sorted = [...files].sort((a, b) => a.rel.localeCompare(b.rel));
  // The content digest is part of the signature, so "the list and the sizes are identical" can no
  // longer be satisfied by a file whose final size is already on disk but whose bytes are not.
  const signature = [
    sorted.map((f) => `${f.rel}:${f.size}:${f.contentHash ?? ""}`).join("|"),
    `+${skips.hidden}/${skips.tooDeepDirs}/${skips.dirs}`,
  ].join("|");
  // With no files there is nothing to take a time from; the folder's own mtime keeps the age column
  // honest instead of showing 1970.
  const newestMtimeMs = sorted.length ? sorted.reduce((max, f) => Math.max(max, f.mtimeMs), 0) : fallbackMtimeMs;
  const key = `${kind}:${name}`;
  const quiet = Date.now() - newestMtimeMs >= QUIET_MS;
  // A folder whose files are all invisible to the walk used to be unable to ever become stable, so
  // it could never be claimed, never be moved and never be reported — it just sat there being
  // rescanned every 60 seconds while the panel said "Empty". It is now allowed through, fails on
  // "nothing usable" and lands in _failed/ with an error.txt that names what was skipped.
  const something = sorted.length > 0 || skips.tooDeepDirs > 0 || skips.hidden > 0;
  const stable = quiet && observed.get(key) === signature && something;
  observed.set(key, signature);

  const notes: string[] = [];
  if (skips.tooDeepDirs) notes.push(`${skips.tooDeepDirs} sub-folder(s) are deeper than the ${MAX_DEPTH} levels that are read — move those files up.`);
  if (!sorted.length && skips.hidden) notes.push(`Only system files (Thumbs.db / desktop.ini / .DS_Store) are in this folder.`);
  if (!sorted.length && !skips.hidden && !skips.tooDeepDirs && skips.dirs) notes.push(`This folder has only empty sub-folders in it.`);

  return {
    name,
    kind,
    files: sorted,
    fileCount: sorted.length,
    totalBytes: sorted.reduce((sum, f) => sum + f.size, 0),
    newestMtimeMs,
    stable,
    hasBrief: sorted.some((f) => isBriefFile(f.rel)),
    usableCount: sorted.filter(usable).length,
    skips,
    notes,
  };
}

/**
 * Everything waiting in the inbox right now. Calling it also records the file signatures, which is
 * what the next call compares against — so two calls a moment apart are what decides "stable".
 */
export function scanInbox(opts: { readOnly?: boolean } = {}): InboxEntry[] {
  // `readOnly` is for callers that are only *looking* (`--dry-run`): no folders created, no README
  // written. Stale-claim recovery is not done here at all any more — it moves folders around, and a
  // page render is no place for that (see `importReadyInbox`).
  const root = opts.readOnly ? inboxRoot() : ensureInboxDir();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: InboxEntry[] = [];
  const loose = new Map<string, { label: string; files: InboxFile[] }>();
  const seen = new Set<string>();

  for (const e of entries) {
    if (e.name.startsWith(".") || e.name.startsWith("_") || RESERVED.has(e.name)) continue;
    if (e.isDirectory()) {
      const abs = path.join(root, e.name);
      const { files, skips } = walk(abs, { hash: true });
      let dirMtime = Date.now();
      try {
        dirMtime = fs.statSync(abs).mtimeMs;
      } catch {
        /* vanished between readdir and stat */
      }
      out.push(describe(e.name, "folder", files, skips, dirMtime));
      seen.add(`folder:${e.name}`);
      continue;
    }
    if (!e.isFile() || IGNORED_FILE.test(e.name) || e.name.toLowerCase() === "readme.txt") continue;
    const abs = path.join(root, e.name);
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    const g = groupOf(e.name);
    const bucket = loose.get(g.key) ?? { label: g.label, files: [] };
    bucket.files.push({ rel: e.name, size: st.size, mtimeMs: st.mtimeMs, contentHash: contentHash(abs, st.size) });
    loose.set(g.key, bucket);
  }

  for (const bucket of loose.values()) {
    const entry = describe(bucket.label, "loose", bucket.files);
    seen.add(`loose:${bucket.label}`);
    out.push(entry);
  }

  // Forget what is no longer there, so a folder re-created with the same name starts over.
  for (const key of [...observed.keys()]) if (!seen.has(key)) observed.delete(key);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Two scans `SETTLE_MS` apart, so a single call (CLI, "Import now") can judge stability by itself. */
export async function scanInboxSettled(opts: { readOnly?: boolean } = {}): Promise<InboxEntry[]> {
  scanInbox(opts);
  await sleep(SETTLE_MS);
  return scanInbox(opts);
}

/** True when a process with this id is running (and so its claim is not stale, however old it is). */
function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0); // signal 0 only tests for existence
    return true;
  } catch (e) {
    // EPERM means it exists and belongs to somebody else.
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** The pid written into a lock file at claim time, when it is still readable. */
function lockOwner(abs: string): number | null {
  try {
    const pid = Number.parseInt(fs.readFileSync(abs, "utf8").trim().split(/\s+/)[0] ?? "", 10);
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * An import that died with the process (power cut, a restart mid-copy) leaves its lock and its
 * half-imported folder behind. Both are released once they are 30 minutes old *and* the process
 * that took them is gone, so the folder is retried instead of sitting in `_processing/` forever.
 *
 * This moves the owner's folders, so it is run from the worker tick and the CLI only — never from a
 * page render, which is where it used to run and where it could reclaim a live import.
 */
function recoverStaleClaims(root: string) {
  const dir = path.join(root, PROCESSING_DIR);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const liveLocks = new Set<string>();
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".lock")) continue;
    const owner = lockOwner(path.join(dir, e.name));
    if (owner !== null && owner !== process.pid && pidAlive(owner)) liveLocks.add(e.name.replace(/\.lock$/, ""));
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    try {
      // An import that is still running re-stamps its lock and its folder every minute, so age alone
      // is enough — but a live owning process is checked as well, because pulling a folder out from
      // under a running import means it gets imported twice.
      if (Date.now() - fs.statSync(abs).mtimeMs < STALE_CLAIM_MS) continue;
      if (e.isDirectory() && liveLocks.has(e.name.replace(/ [0-9a-z]{6}$/i, ""))) continue;
      if (e.isFile() && e.name.endsWith(".lock")) {
        const owner = lockOwner(abs);
        if (owner !== null && owner !== process.pid && pidAlive(owner)) continue;
        fs.unlinkSync(abs);
        console.warn(`[inbox] released a stale lock: ${e.name}`);
        continue;
      }
      if (!e.isDirectory()) continue;
      // Drop the " <token>" the claim added, so the folder comes back under its own name.
      const original = e.name.replace(/ [0-9a-z]{6}$/i, "");
      fs.renameSync(abs, freePath(root, original || e.name));
      console.warn(`[inbox] returned an interrupted import to the inbox: ${original || e.name}`);
    } catch {
      /* another process is dealing with it */
    }
  }
}

// ---------------------------------------------------------------------------
// Claiming (this is what makes an import happen exactly once)
// ---------------------------------------------------------------------------

export type Claim = { dir: string; release: () => void };

/**
 * Why a claim did not happen. `blocked` is the difference that matters: somebody else winning the
 * race (EEXIST on the lock, ENOENT on the folder) is normal and silent, but a folder that *cannot*
 * be moved — a file in it is open in Explorer, in Photoshop, in a preview handler, in an antivirus
 * scan — is a real problem the owner has to be told about, or it silently retries for ever.
 */
type ClaimOutcome = { ok: true; claim: Claim } | { ok: false; blocked: boolean; error: string };

/** EPERM / EBUSY / EACCES on a rename mean something is holding the folder, not that we lost a race. */
function isBlockingError(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException).code;
  return code === "EPERM" || code === "EBUSY" || code === "EACCES" || code === "ENOTEMPTY";
}

/**
 * The lock that makes an import happen exactly once, even when the worker tick, an "Import now"
 * click and `npm run inbox` all fire in the same second.
 *
 * It deliberately does *not* rely on the move itself. On Windows two processes renaming the same
 * directory can **both** get a successful return: the second `MoveFileEx` resolves the source to the
 * directory object the first one has already moved and renames it again, so the first process is
 * left holding a path that no longer exists (measured: ~1 in 8 of 60 forced races). An exclusive
 * file create is atomic on both Windows and POSIX, so that is the mutex; the move happens after it.
 */
function claim(root: string, entry: InboxEntry): ClaimOutcome {
  const procRoot = path.join(root, PROCESSING_DIR);
  fs.mkdirSync(procRoot, { recursive: true });
  // The lock is named from the *whole* entry name, not from the 80-character display name: two
  // folders that agree on their first 80 characters must not share one lock. It is kept short
  // enough that "<base> <token>" still fits, so `recoverStaleClaims` can pair the folder with it.
  const base = uniqueName(entry.name, "post", 60);
  const lock = path.join(procRoot, `${base}.lock`);
  try {
    // "wx" → O_CREAT | O_EXCL: exactly one caller creates it, everybody else gets EEXIST.
    fs.writeFileSync(lock, `${process.pid} ${nowIso()}\n`, { flag: "wx" });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return { ok: false, blocked: false, error: "another import already holds this folder" };
    return { ok: false, blocked: isBlockingError(e), error: (e as Error).message };
  }

  let touch: ReturnType<typeof setInterval> | null = null;
  const release = () => {
    if (touch) clearInterval(touch);
    touch = null;
    try {
      fs.unlinkSync(lock);
    } catch {
      /* already gone */
    }
  };

  const dest = freePath(procRoot, `${base} ${Math.random().toString(36).slice(2, 8)}`);
  try {
    if (entry.kind === "folder") {
      fs.renameSync(resolveInside(root, entry.name), dest);
      // Nobody else can be moving it now, so a missing destination means the folder itself is gone.
      if (!fs.existsSync(dest)) throw new Error("the folder disappeared while it was being claimed");
    } else {
      fs.mkdirSync(dest, { recursive: true });
      let moved = 0;
      let blocker: unknown = null;
      for (const f of entry.files) {
        try {
          fs.renameSync(resolveInside(root, f.rel), path.join(dest, path.basename(f.rel)));
          moved++;
        } catch (e) {
          // A file that vanished mid-copy is simply not part of this post; one that is *held* is not.
          if (isBlockingError(e)) blocker = e;
        }
      }
      if (!moved) throw blocker ?? new Error("none of the loose files could be moved");
    }
  } catch (e) {
    try {
      fs.rmdirSync(dest);
    } catch {
      /* not empty, or never created */
    }
    release();
    const blocked = isBlockingError(e);
    if (blocked) console.warn(`[inbox] "${entry.name}" could not be claimed:`, (e as Error).message);
    return { ok: false, blocked, error: (e as Error).message };
  }

  const stampClaim = () => {
    const t = new Date();
    for (const p of [dest, lock]) {
      try {
        fs.utimesSync(p, t, t);
      } catch {
        /* ignore */
      }
    }
  };
  stampClaim(); // the claim's own age, for recoverStaleClaims
  // An import is allowed to take much longer than the stale-claim timeout: 20 files, an ffmpeg child
  // per video with a 120 s kill timer, plus the AI calls. Without this the recovery sweep would pull
  // the folder out from under a running import and the next tick would import it a second time.
  touch = setInterval(stampClaim, CLAIM_TOUCH_MS);
  touch.unref?.();
  return { ok: true, claim: { dir: dest, release } };
}

function park(root: string, claimed: string, bucket: string, name: string): string {
  const dir = path.join(root, bucket);
  fs.mkdirSync(dir, { recursive: true });
  // `freePath` hashes the tail of a name too long to keep, so two long folder names do not land here
  // as "<same 80 characters>" and "… (2)" with nothing to tell the owner which files made which post.
  const dest = freePath(dir, `${stamp()} ${name}`);
  try {
    fs.renameSync(claimed, dest);
    return dest;
  } catch (e) {
    console.error(`[inbox] could not move ${claimed} to ${bucket}:`, (e as Error).message);
    return claimed;
  }
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/** True when another post already occupies (within 5 minutes of) this moment. */
function slotTaken(slot: string): boolean {
  const at = new Date(slot).getTime();
  const lo = new Date(at - 5 * 60_000).toISOString();
  const hi = new Date(at + 5 * 60_000).toISOString();
  return !!getDb()
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(gte(schema.posts.scheduledAt, lo), lte(schema.posts.scheduledAt, hi), ne(schema.posts.status, "cancelled")))
    .get();
}

/**
 * The next posting slot (Settings → SMM: posting days + posting time, Yerevan) that is at least
 * `approvalLeadMinutes` away and not already taken. `busy` holds the slots handed out earlier in
 * the same run, which are not in the database yet when they are only suggestions.
 */
export function suggestSlot(busy: Iterable<string> = []): string | null {
  return suggestSlotDetailed(busy).slot;
}

/** How many slots ahead `suggestSlotDetailed` looks before it gives up. */
const SLOT_LOOKAHEAD = 60;

/**
 * The same search, with the reason when it comes back empty. "No posting days are configured" and
 * "the next 60 posting slots are all taken" need completely different things from the owner, and
 * telling them to go and configure days that *are* configured sends them looking in the wrong place.
 */
function suggestSlotDetailed(busy: Iterable<string> = []): { slot: string | null; reason: "ok" | "not_configured" | "all_taken" } {
  const smm = getSetting("smm");
  const lead = Math.max(0, Number(smm.approvalLeadMinutes) || 0);
  const taken = new Set(busy);
  let from = new Date(Date.now() + lead * 60_000);
  for (let i = 0; i < SLOT_LOOKAHEAD; i++) {
    const slot = nextYerevanSlot(smm.postingDays, smm.postingTime, from);
    // Nothing at all on the first pass means the days / time cannot produce a slot; later on it
    // would mean the calendar itself ran out, which is the same thing as "all taken".
    if (!slot) return { slot: null, reason: i === 0 ? "not_configured" : "all_taken" };
    if (!taken.has(slot) && !slotTaken(slot)) return { slot, reason: "ok" };
    from = new Date(new Date(slot).getTime() + 60_000);
  }
  return { slot: null, reason: "all_taken" };
}

/** The slot an inbox import proposed, read back out of `posts.notes`. */
export function suggestedSlotOf(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = SLOT_RE.exec(notes);
  return m ? m[1] : null;
}

/**
 * The notes without the machine-readable slot line. The editor banner shows that slot properly
 * formatted with a button next to it, so the raw ISO timestamp is noise in the Notes panel — but it
 * stays in the column, because it is what `suggestedSlotOf` reads.
 */
export function notesForDisplay(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const rest = notes
    .split("\n")
    .filter((line) => !SLOT_RE.test(line))
    .join("\n")
    .trim();
  return rest || null;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ImportResult = {
  name: string;
  ok: boolean;
  /**
   * The folder could not be claimed because something is holding it open (Explorer, Photoshop, a
   * preview handler, an antivirus scan). Nothing was imported and nothing was moved; this is a
   * distinct outcome from "it failed" and from "it is still being copied", and every caller has to
   * say so, because it repeats on every tick until the owner closes the file.
   */
  blocked?: boolean;
  postId?: string;
  title?: string;
  assets: number;
  /** Files that were written but could not be decoded — the folder is parked in `_failed/` for these. */
  unreadable?: number;
  warnings: string[];
  error?: string;
  /** Written onto the post (`schedule: auto`). */
  scheduledAt?: string | null;
  /** Only proposed; the editor applies it with one click. */
  suggestedSlot?: string | null;
  /** Where the owner's files ended up. */
  movedTo?: string;
};

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

/**
 * A failed import that still has something to say. "None of the files could be imported" on its own
 * does not tell the owner *why* — the per-file reasons gathered on the way there are what does, and
 * they have to reach `error.txt` and the result instead of dying with the throw.
 */
class ImportFailure extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = "ImportFailure";
  }
}

/** The first `MAX_BRIEF_BYTES` of a file, so a stray log saved as post.txt is not read into memory. */
function readHead(abs: string, limit: number): { buf: Buffer; truncated: boolean } {
  const fd = fs.openSync(abs, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const want = Math.min(size, limit);
    const buf = Buffer.alloc(want);
    let read = 0;
    while (read < want) {
      const n = fs.readSync(fd, buf, read, want - read, read);
      if (n <= 0) break;
      read += n;
    }
    return { buf: read === want ? buf : buf.subarray(0, read), truncated: size > limit };
  } finally {
    fs.closeSync(fd);
  }
}

function readBrief(dir: string, files: InboxFile[]): { brief: Brief; warnings: string[] } {
  for (const name of BRIEF_BASENAMES) {
    const hit = files.find((f) => path.basename(f.rel).toLowerCase() === name);
    if (!hit) continue;
    let text: string;
    let truncated = false;
    try {
      const head = readHead(path.join(dir, hit.rel), MAX_BRIEF_BYTES);
      text = decodeText(head.buf);
      truncated = head.truncated;
    } catch (e) {
      return { brief: {}, warnings: [`${name} could not be read: ${(e as Error).message}`] };
    }
    const parsed = name.endsWith(".json") ? parseBriefJson(text) : parseBriefText(text);
    if (truncated) parsed.warnings.unshift(`${name} is larger than ${Math.round(MAX_BRIEF_BYTES / 1024)} KB — only the beginning of it was read.`);
    return parsed;
  }
  return { brief: {}, warnings: [] };
}

function resolveProject(ref: string | undefined): { id: string; code: string; title: string } | null {
  const v = (ref ?? "").trim();
  if (!v) return null;
  return (
    getDb()
      .select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title })
      .from(schema.projects)
      .where(or(eq(schema.projects.id, v), sql`upper(${schema.projects.code}) = upper(${v})`))
      .get() ?? null
  );
}

function defaultPlatforms(): Platform[] {
  const picked = getSetting("smm").defaultPlatforms.filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(p));
  return picked.length ? picked : ["facebook", "instagram"];
}

/**
 * Turns one already-claimed directory into a post. Everything that can be worked around is a
 * warning; only "no usable media and no brief text" is an error.
 */
async function importClaimed(dir: string, name: string, busySlots: Set<string>, saved: string[]): Promise<ImportResult> {
  const { files, skips } = walk(dir);
  const { brief, warnings } = readBrief(dir, files);
  if (skips.tooDeepDirs) warnings.push(`${skips.tooDeepDirs} sub-folder(s) are deeper than the ${MAX_DEPTH} levels that are read — anything in them was not imported.`);

  const media: { file: InboxFile; mime: string }[] = [];
  for (const f of [...files].sort((a, b) => naturalCompare(a.rel, b.rel))) {
    if (isBriefFile(f.rel)) continue;
    const base = path.basename(f.rel);
    const mime = effectiveMime("", base);
    // The post-media list, not the uploader's: a .dwg source and a plans.zip live next to the
    // renders in a real designer's folder, and neither can be published anywhere.
    if (!isPostMedia(base)) {
      warnings.push(`Skipped "${base}" — this file type is not supported.`);
      continue;
    }
    if (f.size === 0) {
      warnings.push(`Skipped "${base}" — the file is empty.`);
      continue;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      warnings.push(`Skipped "${base}" — ${(f.size / 1024 / 1024).toFixed(1)} MB is over the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.`);
      continue;
    }
    media.push({ file: f, mime });
  }

  // Images first (natural order), then videos, then documents and models.
  const rank = (mime: string) => (mime.startsWith("image/") ? 0 : mime.startsWith("video/") ? 1 : 2);
  media.sort((a, b) => rank(a.mime) - rank(b.mime) || naturalCompare(a.file.rel, b.file.rel));
  if (media.length > MAX_FILES) {
    warnings.push(`Only the first ${MAX_FILES} files were used (${media.length} were found).`);
    media.length = MAX_FILES;
  }

  const rawBrief = [brief.instructions, brief.body].filter(Boolean).join("\n\n").trim();
  // The composer caps the same field at 2000 characters; with an AI key configured, sending more
  // than that is cost, latency and a likely max-token failure.
  const briefText = rawBrief.slice(0, MAX_BRIEF_CHARS);
  if (rawBrief.length > MAX_BRIEF_CHARS) warnings.push(`The description in the brief is ${rawBrief.length} characters — only the first ${MAX_BRIEF_CHARS} were used.`);
  if (!media.length && !briefText) {
    const extra = [
      skips.tooDeepDirs ? `${skips.tooDeepDirs} sub-folder(s) were deeper than the ${MAX_DEPTH} levels that are read` : "",
      skips.hidden ? `${skips.hidden} system file(s) (Thumbs.db / desktop.ini / .DS_Store) were ignored` : "",
    ].filter(Boolean);
    throw new ImportFailure(
      `Nothing usable in this folder: no supported image or video, and no brief text.${extra.length ? ` (${extra.join("; ")}.)` : ""} Add a render (.jpg/.png/.webp) or a post.txt with a description.`,
      warnings,
    );
  }

  const project = resolveProject(brief.project);
  if (brief.project && !project) warnings.push(`Project "${brief.project}" was not found — the post was created without a project.`);

  const assetIds: string[] = [];
  /** A file that was written but cannot be decoded: the folder must not be filed under _imported/. */
  let unreadable = 0;
  for (const m of media) {
    const base = path.basename(m.file.rel);
    try {
      const row = await saveAsset({
        buffer: fs.readFileSync(path.join(dir, m.file.rel)),
        originalName: base,
        mime: m.mime,
        projectId: project?.id ?? null,
        caption: base,
      });
      saved.push(row.id);
      // The stability rule can be fooled — a file can carry its final size and an older timestamp
      // while the bytes in the middle are still arriving — so the bytes themselves get the last
      // word. An image or video that will not decode is never attached and never passed over in
      // silence; it used to become the post's media with only a console line about it.
      if (row.postProcessError && (row.mime.startsWith("image/") || row.mime.startsWith("video/"))) {
        unreadable++;
        warnings.push(`Skipped "${base}" — the file could not be read as ${row.mime.startsWith("image/") ? "an image" : "a video"} (${row.postProcessError}). It may still have been copying: check it and drop the folder in again.`);
        try {
          deleteAsset(row.id);
          saved.splice(saved.indexOf(row.id), 1);
        } catch {
          /* the warning above is what matters */
        }
        continue;
      }
      assetIds.push(row.id);
    } catch (e) {
      warnings.push(`Skipped "${base}" — ${(e as Error).message}`);
    }
  }
  if (!assetIds.length && !briefText) {
    throw new ImportFailure("None of the files in this folder could be imported, and there is no brief text to write a post from.", warnings);
  }

  const language = brief.language ?? getSetting("brand").defaultLanguage;
  const goal: PostGoal = brief.goal ?? "showcase";
  const platforms = brief.platforms ?? defaultPlatforms();

  // A slot is proposed either way; `schedule: auto` (or an explicit date) is what writes it onto the post.
  const explicit = brief.scheduledAt && new Date(brief.scheduledAt).getTime() > Date.now() ? brief.scheduledAt : null;
  if (brief.scheduledAt && !explicit) warnings.push("The date in the brief is in the past — the next free slot was suggested instead.");
  const search = explicit ? { slot: explicit, reason: "ok" as const } : suggestSlotDetailed(busySlots);
  const suggested = search.slot;
  if (!suggested) {
    // Two very different problems; one message for both used to send the owner to Settings to look
    // at posting days that were configured correctly all along.
    warnings.push(
      search.reason === "not_configured"
        ? "No posting days / time are configured in Settings → Social media, so no slot could be suggested."
        : `The next ${SLOT_LOOKAHEAD} posting slots are already taken, so no slot could be suggested — free one up or add a posting day in Settings → Social media.`,
    );
  }
  const applied = brief.scheduleAuto && suggested ? suggested : null;
  if (suggested) busySlots.add(suggested);

  const pack = await createPostPack({
    projectId: project?.id ?? null,
    assetIds,
    platforms,
    language,
    goal,
    scheduledAt: applied,
    extraInstructions: briefText || undefined,
  });

  const db = getDb();
  const NOTES_MAX = 2000;
  const noteLines: string[] = [];
  if (pack.warning) noteLines.push(pack.warning);
  // The slot line goes in before anything long: `suggestedSlotOf` reads it back out of this column,
  // so it must survive the 2000-character cut.
  if (!applied && suggested) noteLines.push(`${SLOT_LABEL} ${suggested} (${fmtYerevan(suggested)} Yerevan)`);
  if (warnings.length) noteLines.push(...warnings.map((w) => `• ${w}`));
  // Without an AI key the built-in templates write the copy, and they never read the brief's free
  // text. Saying only "templates were used" left the owner believing the paragraph they wrote for
  // the copywriter had been used; it is now named as unused, and kept here so it is not lost.
  if (pack.provider === "template" && briefText) {
    const head = `Your description in the brief was not used to write this text (no AI key — the built-in templates wrote it, so they cannot know what the photos show). Check the wording before publishing. What you wrote:`;
    const room = NOTES_MAX - (noteLines.join("\n").length + head.length + 2);
    if (room > 40) noteLines.push(head, briefText.slice(0, room));
    else noteLines.push(head);
  }
  db.update(schema.posts)
    .set({
      source: "inbox",
      sourceRef: name.slice(0, 200),
      ...(brief.title ? { title: brief.title } : {}),
      notes: noteLines.length ? noteLines.join("\n").slice(0, NOTES_MAX) : null,
      updatedAt: nowIso(),
    })
    .where(eq(schema.posts.id, pack.postId))
    .run();

  if (project) {
    try {
      logActivity("project", project.id, `Փոստը պատրաստվեց «${name}» պանակից (inbox)`, "system");
    } catch (e) {
      warnings.push(`The project timeline entry could not be written: ${(e as Error).message}`);
    }
  }

  const title = db.select({ title: schema.posts.title }).from(schema.posts).where(eq(schema.posts.id, pack.postId)).get()?.title ?? name;
  return { name, ok: true, postId: pack.postId, title, assets: assetIds.length, warnings, unreadable, scheduledAt: applied, suggestedSlot: applied ? null : suggested };
}

function writeErrorFile(dir: string, name: string, message: string, warnings: string[], partial?: { postId: string }) {
  const lines = partial
    ? [
        `ArchiTek Soft — ներմուծվեց մասամբ / imported, but some files could not be read`,
        `Պանակ / folder: ${name}`,
        `Ժամանակ / time:  ${new Date().toISOString()}`,
        `Փոստը / post:   ${partial.postId}`,
        "",
        "ՊԱՏՃԱՌԸ / REASON",
        message,
        "",
        ...(warnings.length ? ["ՄԱՆՐԱՄԱՍՆԵՐ / DETAILS", ...warnings.map((w) => `• ${w}`), ""] : []),
        "ԻՆՉ ԱՆԵԼ / WHAT TO DO",
        "Փոստի սևագիրը ստեղծված է, բայց վերևի ֆայլերը դրան կցված չեն։ Ստուգիր դրանք",
        "և պանակը նորից տեղափոխիր data/inbox/ ՝ միայն այդ ֆայլերով։",
        "The draft post was created, but the files listed above are NOT attached to it.",
        "Check those files and drop a folder with just them back into data/inbox/.",
      ]
    : [
        `ArchiTek Soft — ներմուծումը չհաջողվեց / import failed`,
        `Պանակ / folder: ${name}`,
        `Ժամանակ / time:  ${new Date().toISOString()}`,
        "",
        "ՊԱՏՃԱՌԸ / REASON",
        message,
        "",
        ...(warnings.length ? ["ՄԱՆՐԱՄԱՍՆԵՐ / DETAILS", ...warnings.map((w) => `• ${w}`), ""] : []),
        "ԻՆՉ ԱՆԵԼ / WHAT TO DO",
        "Ուղղիր վերևի պատճառը և պանակը նորից տեղափոխիր data/inbox/ ։",
        "Fix the reason above and move this folder back into data/inbox/.",
      ];
  try {
    fs.writeFileSync(path.join(dir, "error.txt"), `﻿${lines.join("\n")}`, "utf8");
  } catch (e) {
    console.error("[inbox] could not write error.txt:", (e as Error).message);
  }
}

/**
 * Imports one entry: claim → import → park in `_imported/` or `_failed/`.
 *
 * Returns null only when somebody else legitimately won the race (their lock, their rename). A
 * folder that could not be claimed because it is *held* comes back as a blocked result, so it is
 * reported rather than vanishing from the run.
 */
async function importEntry(entry: InboxEntry, busySlots: Set<string> = new Set()): Promise<ImportResult | null> {
  const root = ensureInboxDir();
  const outcome = claim(root, entry);
  if (!outcome.ok) {
    if (!outcome.blocked) return null;
    return { name: entry.name, ok: false, blocked: true, assets: 0, warnings: [], error: outcome.error };
  }
  const claimed = outcome.claim;
  observed.delete(`${entry.kind}:${entry.name}`);
  /** Every asset written during this import, so a failure does not leave them in the library. */
  const saved: string[] = [];
  try {
    const result = await importClaimed(claimed.dir, entry.name, busySlots, saved);
    if (result.unreadable) {
      // The post exists, but files in this folder could not be read. Filing it under _imported/ would
      // put it where the owner never looks again, with a draft whose media is silently short.
      const message = `${result.unreadable} file(s) in this folder could not be read and were left out of the post.`;
      writeErrorFile(claimed.dir, entry.name, message, result.warnings, { postId: result.postId ?? "" });
      result.movedTo = park(root, claimed.dir, FAILED_DIR, entry.name);
    } else {
      result.movedTo = park(root, claimed.dir, IMPORTED_DIR, entry.name);
    }
    return result;
  } catch (e) {
    const message = (e as Error).message || "Unknown error";
    const details = e instanceof ImportFailure ? e.details : [];
    console.error(`[inbox] "${entry.name}" failed:`, message);
    // Anything thrown after the first file was written would otherwise leave those assets in the
    // media library attached to nothing, with no way for the owner to connect them to this folder.
    for (const id of saved) {
      try {
        deleteAsset(id);
      } catch (err) {
        console.warn(`[inbox] could not remove the asset of a failed import (${id}):`, (err as Error).message);
      }
    }
    writeErrorFile(claimed.dir, entry.name, message, details);
    const movedTo = park(root, claimed.dir, FAILED_DIR, entry.name);
    return { name: entry.name, ok: false, assets: 0, warnings: details, error: message, movedTo };
  } finally {
    // Always last: the folder is out of _processing by now, so the next run may claim the name again.
    claimed.release();
  }
}

export type InboxRunResult = {
  imported: ImportResult[];
  skipped: InboxEntry[];
  /** Ready, but something is holding the folder open. Neither imported nor still copying. */
  blocked: ImportResult[];
  /** How many entries were in the inbox when the run started (before `only` narrowed it). */
  seen: number;
};

/**
 * Imports everything that is stable right now. `only` limits the run to one entry by name — which
 * still goes through the same stability check, so "Import now" on a folder that is still being
 * copied waits instead of importing half of it.
 */
async function importReadyInbox(opts: { only?: string } = {}): Promise<InboxRunResult> {
  // Recovering abandoned claims belongs here, with the worker tick and the CLI — not in `scanInbox`,
  // which every render of the admin hub calls.
  recoverStaleClaims(ensureInboxDir());
  const entries = await scanInboxSettled();
  const wanted = opts.only ? entries.filter((e) => e.name === opts.only) : entries;
  const imported: ImportResult[] = [];
  const skipped: InboxEntry[] = [];
  const blocked: ImportResult[] = [];
  const busySlots = new Set<string>();
  for (const entry of wanted) {
    if (!entry.stable) {
      skipped.push(entry);
      continue;
    }
    const r = await importEntry(entry, busySlots);
    if (!r) continue;
    if (r.blocked) blocked.push(r);
    else imported.push(r);
  }
  return { imported, skipped, blocked, seen: entries.length };
}

/**
 * True when a post already exists for this inbox folder. "Import now" and the 60-second worker tick
 * can land in the same second; the click then finds nothing left to do, which is not the same thing
 * as "the files are still being copied" and must not be reported as it.
 */
export function wasImported(name: string): boolean {
  if (!name) return false;
  return !!getDb()
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(eq(schema.posts.source, "inbox"), eq(schema.posts.sourceRef, name.slice(0, 200))))
    .get();
}

// ---------------------------------------------------------------------------
// Suggesting the result to the owner
// ---------------------------------------------------------------------------

/** Telegram's caption limit is 1024 characters; leave room for the HTML tags. */
const SUGGEST_CAPTION_MAX = 950;

function suggestionText(result: ImportResult, opts: { html: boolean; link: string | null }): string {
  const full = result.postId ? getPostFull(result.postId) : null;
  const esc = (s: string) => (opts.html ? tg.escapeHtml(s) : s);
  const title = full?.post.title ?? result.title ?? result.name;
  const lines: string[] = [];
  lines.push(opts.html ? `📥 <b>Prepared from the inbox folder</b> “${esc(result.name)}”` : `Prepared from the inbox folder "${result.name}"`);
  lines.push("");
  lines.push(opts.html ? `<b>${esc(title)}</b>` : title);
  const platforms = (full?.variants ?? []).filter((v) => v.enabled).map((v) => v.platform);
  if (platforms.length) lines.push(`Platforms: ${platforms.join(", ")}`);
  lines.push(`Media: ${result.assets} file(s)`);
  if (result.scheduledAt) lines.push(`🗓 Scheduled: ${fmtYerevan(result.scheduledAt)} (Yerevan)`);
  else if (result.suggestedSlot) lines.push(`🗓 Suggested slot: ${fmtYerevan(result.suggestedSlot)} (Yerevan) — not applied yet`);
  const core = full?.post.coreText ?? "";
  if (core) {
    lines.push("");
    lines.push(esc(core.slice(0, 500)) + (core.length > 500 ? "…" : ""));
  }
  if (result.warnings.length) {
    lines.push("");
    lines.push(`⚠️ ${esc(result.warnings.slice(0, 4).join(" · ").slice(0, 300))}`);
  }
  if (opts.link) {
    lines.push("");
    lines.push(opts.link);
  }
  return lines.join("\n");
}

/**
 * Tells the owner a draft is waiting: Telegram (with "Send for approval" and a link to the editor)
 * and e-mail when they are configured. Best effort — a failure here never fails the import.
 */
async function suggestImported(result: ImportResult): Promise<void> {
  if (!result.ok || !result.postId) return;
  const editorUrl = `${env.appUrl}/admin/smm/${result.postId}`;
  // Telegram rejects a URL button that is not https, so on http the link goes into the text instead.
  const httpsApp = /^https:\/\//i.test(env.appUrl);
  const chat = getSetting("telegram").adminChatId;

  if (chat && tg.telegramEnabled()) {
    const buttons: tg.InlineButton[][] = [[{ text: "📣 Send for approval", callback_data: `sa:${result.postId}` }]];
    if (httpsApp) buttons.push([{ text: "🔗 Open in editor", url: editorUrl }]);
    const text = suggestionText(result, { html: true, link: httpsApp ? null : editorUrl });
    const full = getPostFull(result.postId);
    const firstImage = full?.assets.find((a) => a.mime.startsWith("image/"));
    try {
      if (firstImage) {
        await tg.sendPhoto(chat, absPath(firstImage.thumbRelPath || firstImage.relPath), text.slice(0, SUGGEST_CAPTION_MAX), buttons, "HTML");
      } else {
        await tg.sendMessage(chat, text, { buttons, parseMode: "HTML" });
      }
    } catch (e) {
      console.warn("[inbox] Telegram suggestion failed:", (e as Error).message);
      try {
        await tg.sendMessage(chat, text.slice(0, tg.TEXT_MAX), { buttons, parseMode: "HTML" });
      } catch {
        /* already logged */
      }
    }
  }

  await sendEmail(`Post prepared from the inbox: ${result.title ?? result.name}`, suggestionText(result, { html: false, link: editorUrl }));
}

/**
 * The whole cycle in one call, for the worker tick and the CLI: import what is ready and tell the
 * owner about each new draft.
 */
export async function runInbox(opts: { only?: string; notify?: boolean } = {}): Promise<InboxRunResult> {
  const run = await importReadyInbox({ only: opts.only });
  if (opts.notify !== false) {
    for (const r of run.imported) {
      if (!r.ok) continue;
      try {
        await suggestImported(r);
      } catch (e) {
        console.warn("[inbox] suggestion failed:", (e as Error).message);
      }
    }
  }
  return run;
}

// ---------------------------------------------------------------------------
// Example folder (npm run inbox -- --example)
// ---------------------------------------------------------------------------

const EXAMPLE_BRIEF = `language: hy
goal: showcase
platforms: facebook, instagram, telegram
schedule: auto
---
Ընկույզի խոհանոց երևանյան ընտանիքի համար։ Շեշտը՝ կղզյակի և ինտեգրված լուսավորության վրա։
Walnut kitchen for a family in Yerevan; emphasise the island and the integrated lighting.
`;

/** Creates a ready-to-import example folder from public/demo, so the owner can test in one step. */
export function createExampleFolder(): { dir: string; files: string[] } {
  const root = ensureInboxDir();
  const demo = path.resolve(process.cwd(), "public", "demo");
  const wanted = ["kitchen-walnut.jpg", "render-1.jpg", "render-2.jpg"];
  const dir = freePath(root, `${stamp()} example walnut kitchen`);
  fs.mkdirSync(dir, { recursive: true });
  const copied: string[] = [];
  wanted.forEach((file, i) => {
    const src = path.join(demo, file);
    if (!fs.existsSync(src)) return;
    const name = `${String(i + 1).padStart(2, "0")}-${file}`;
    fs.copyFileSync(src, path.join(dir, name));
    copied.push(name);
  });
  fs.writeFileSync(path.join(dir, "post.txt"), `﻿${EXAMPLE_BRIEF}`, "utf8");
  copied.push("post.txt");
  return { dir, files: copied };
}
