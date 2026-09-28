import fs from "node:fs";
import path from "node:path";

/**
 * The full decor library behind the 3D configurator's demo mode, as written by `npm run webviewer:sync` to
 * `private/webviewer/` — outside public/ and git-ignored, so it exists only on machines that ran the sync (the
 * Dockerfile copies the folder into the image). Display fields and a 96 px thumbnail per decor, nothing else.
 */
export type LibraryEntry = {
  /** opaque token: the thumbnail's file name and URL */
  t: string;
  n: string;
  m: string;
  c: string;
  h: string | null;
  k: string;
  /** sold in Armenia */
  a: boolean;
  /** has a thumbnail */
  th: boolean;
  /** lower-case search text */
  s: string;
};

export const LIBRARY_DIR = path.join(process.cwd(), "private", "webviewer");

let cache: { mtimeMs: number; entries: LibraryEntry[] } | null = null;

/** The index, re-read when the sync rewrites it; an empty library when it is missing (the API then answers empty). */
export function libraryEntries(): LibraryEntry[] {
  try {
    const file = path.join(LIBRARY_DIR, "library.json");
    const { mtimeMs } = fs.statSync(file);
    if (!cache || cache.mtimeMs !== mtimeMs) cache = { mtimeMs, entries: JSON.parse(fs.readFileSync(file, "utf8")) as LibraryEntry[] };
    return cache.entries;
  } catch {
    return [];
  }
}
