/**
 * Background-audio library: the "Auto Ambient" tracks an owner drops into `data/audio/` (see
 * `env.audioDir`), and the small helpers the post editor and the publish pipeline share to name
 * and validate them. A "custom" track is an ordinary uploaded asset (kind = 'audio'; see media.ts)
 * and is not handled here.
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const README = `Background audio — ArchiTek Soft
=================================

Drop royalty-free .mp3 files in this folder and they appear as "Auto Ambient" choices in
Admin -> Social media -> the post editor -> Background audio. Nothing else to configure:
the folder is scanned every time the editor opens.

Rules
-----
- .mp3 only. A file that will not decode is skipped and never offered.
- The file name (without ".mp3") is what the owner sees in the picker, so name it something
  readable: "warm-piano-loop.mp3", not "track_04_final_v3.mp3".
- Keep every track royalty-free / properly licensed for the platforms you publish to
  (Facebook, Instagram, Telegram, LinkedIn) — this app does not check licensing for you.
- A track chosen here is mixed into a post's video with FFmpeg only when the operator picks
  "Auto Ambient" and the post is actually published; nothing is changed until then.

Ֆոնային երաժշտություն — ArchiTek Soft
======================================

Գցիր հեղինակային իրավունքներից ազատ .mp3 ֆայլեր այս պանակը, և դրանք կհայտնվեն որպես
«Ինքնաշխատ մթնոլորտ» ընտրանք Ադմին → Սոց. ցանցեր → փոստի խմբագրիչ → Ֆոնային երաժշտություն
բաժնում։ Այլ կարգավորում պետք չէ. պանակը սկանավորվում է խմբագրիչը բացվելիս։
`;

function root(): string {
  return env.audioDir;
}

/** Creates the folder (with its README) on first boot. Safe to call on every boot; a no-op after that. */
export function ensureAudioDir(): string {
  const dir = root();
  fs.mkdirSync(dir, { recursive: true });
  const readme = path.join(dir, "README.txt");
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, `﻿${README}`, "utf8");
  return dir;
}

export type AmbientTrack = { file: string; name: string };

/** Every .mp3 in the ambient folder, alphabetically — what the "Auto Ambient" picker offers. */
export function listAmbientTracks(): AmbientTrack[] {
  const dir = root();
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.toLowerCase().endsWith(".mp3") && !n.startsWith(".") && !n.startsWith("_"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({ file, name: file.replace(/\.mp3$/i, "").replace(/[-_]+/g, " ").trim() || file }));
}

/**
 * Absolute path of an ambient file, or null when the name is not a real, current entry — a plain
 * membership check against `listAmbientTracks()` rather than path arithmetic, so a value like
 * "../../etc/passwd" can never resolve to anything (it simply never matches a real file name).
 */
export function ambientFilePath(file: string): string | null {
  const found = listAmbientTracks().find((t) => t.file === file);
  return found ? path.join(root(), found.file) : null;
}
