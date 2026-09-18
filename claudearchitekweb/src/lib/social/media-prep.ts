/**
 * Makes an uploaded image acceptable for a social platform before it is sent:
 * right format, within the byte and pixel limits, and (Instagram feed) within the allowed aspect ratio.
 * The original is used untouched when it already fits. Otherwise a JPEG is derived once with sharp and
 * cached under UPLOAD_DIR/derived/<platform>/ (served by /media like any other file; the worker removes
 * derived files after two days).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { env } from "../env";
import { absPath } from "../media";
import type { Asset } from "../db/schema";

export const DERIVED_DIR = "derived";

export type ImageSpec = {
  /** Folder name under derived/ and part of the cache key. */
  key: string;
  /** Mime types the platform accepts as they are. Anything else is converted to JPEG. */
  accept: string[];
  maxBytes: number;
  /** Longest side in pixels. */
  maxSide: number;
  /** Allowed width / height range. Images outside it are padded (never cropped). */
  aspect?: { min: number; max: number };
};

export const IMAGE_SPECS = {
  facebook: { key: "fb", accept: ["image/jpeg", "image/png"], maxBytes: 4 * 1024 * 1024, maxSide: 4096 },
  instagram: { key: "ig", accept: ["image/jpeg"], maxBytes: 8 * 1024 * 1024, maxSide: 1440, aspect: { min: 0.8, max: 1.91 } },
  linkedin: { key: "li", accept: ["image/jpeg", "image/png", "image/gif"], maxBytes: 20 * 1024 * 1024, maxSide: 6000 },
  telegram: { key: "tg", accept: ["image/jpeg", "image/png"], maxBytes: 10 * 1024 * 1024, maxSide: 4096 },
} satisfies Record<string, ImageSpec>;

/** Video byte limits per platform for a single-request upload. */
export const VIDEO_MAX_BYTES: Record<string, number> = {
  telegram: 50 * 1024 * 1024,
  facebook: 1024 * 1024 * 1024,
  instagram: 1024 * 1024 * 1024,
};

export type PreparedImage = {
  absPath: string;
  /** Path relative to UPLOAD_DIR with forward slashes (usable in a /media URL). */
  relPath: string;
  fileName: string;
  mime: string;
  derived: boolean;
  converted: boolean;
  padded: boolean;
};

/** What prepareImage would do, judged from the stored metadata only (used by dry runs; no file is written). */
export function planImage(asset: Asset, spec: ImageSpec): { converted: boolean; padded: boolean } {
  const converted = !spec.accept.includes(asset.mime);
  const ratio = asset.width && asset.height ? asset.width / asset.height : null;
  const padded = !!spec.aspect && ratio !== null && (ratio < spec.aspect.min || ratio > spec.aspect.max);
  return { converted, padded };
}

export async function prepareImage(asset: Asset, spec: ImageSpec): Promise<PreparedImage> {
  const src = absPath(asset.relPath);
  const stat = fs.statSync(src);
  const meta = await sharp(src, { failOn: "none" }).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const w = (rotated ? meta.height : meta.width) ?? asset.width ?? 0;
  const h = (rotated ? meta.width : meta.height) ?? asset.height ?? 0;
  if (!w || !h) throw new Error(`Cannot read image "${asset.originalName}"`);

  const converted = !spec.accept.includes(asset.mime);
  const ratio = w / h;
  const padded = !!spec.aspect && (ratio < spec.aspect.min || ratio > spec.aspect.max);
  const tooBig = Math.max(w, h) > spec.maxSide;
  const tooHeavy = stat.size > spec.maxBytes;
  if (!converted && !padded && !tooBig && !tooHeavy) {
    return { absPath: src, relPath: asset.relPath, fileName: asset.fileName, mime: asset.mime, derived: false, converted: false, padded: false };
  }

  const hash = createHash("sha1").update(JSON.stringify([spec, asset.id, stat.size, Math.round(stat.mtimeMs)])).digest("hex").slice(0, 10);
  const fileName = `${asset.id}-${hash}.jpg`;
  const relPath = `${DERIVED_DIR}/${spec.key}/${fileName}`;
  const out = path.join(env.uploadDir, DERIVED_DIR, spec.key, fileName);
  const done: PreparedImage = { absPath: out, relPath, fileName, mime: "image/jpeg", derived: true, converted, padded };
  if (fs.existsSync(out) && fs.statSync(out).size > 0) {
    // Touch it so the cleanup job counts from the last use.
    const now = new Date();
    fs.utimesSync(out, now, now);
    return done;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });

  let background = { r: 255, g: 255, b: 255 };
  if (padded) {
    try {
      background = (await sharp(src, { failOn: "none" }).stats()).dominant;
    } catch {
      /* white margins */
    }
  }

  let scale = Math.min(1, spec.maxSide / Math.max(w, h));
  let quality = 88;
  for (let attempt = 0; attempt < 8; attempt++) {
    const iw = Math.max(1, Math.round(w * scale));
    const ih = Math.max(1, Math.round(h * scale));
    let cw = iw;
    let ch = ih;
    if (padded && spec.aspect) {
      if (ratio < spec.aspect.min) cw = Math.ceil(ih * spec.aspect.min);
      else ch = Math.ceil(iw / spec.aspect.max);
    }
    const buf = await sharp(src, { failOn: "none" })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: cw, height: ch, fit: padded ? "contain" : "inside", background, withoutEnlargement: !padded })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (buf.length <= spec.maxBytes || attempt === 7) {
      if (buf.length > spec.maxBytes) throw new Error(`Cannot fit "${asset.originalName}" into ${Math.round(spec.maxBytes / (1024 * 1024))} MB`);
      const tmp = `${out}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, out);
      return done;
    }
    if (quality > 64) quality -= 8;
    else scale *= 0.8;
  }
  throw new Error(`Cannot prepare "${asset.originalName}"`);
}

/** Removes derived files that were not used for `maxAgeMs`. Returns how many files were deleted. */
export function cleanupDerived(maxAgeMs = 48 * 3600_000): number {
  const root = path.join(env.uploadDir, DERIVED_DIR);
  if (!fs.existsSync(root)) return 0;
  let removed = 0;
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const abs = path.join(root, dir.name);
    for (const f of fs.readdirSync(abs)) {
      const file = path.join(abs, f);
      try {
        if (Date.now() - fs.statSync(file).mtimeMs > maxAgeMs) {
          fs.unlinkSync(file);
          removed++;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return removed;
}
