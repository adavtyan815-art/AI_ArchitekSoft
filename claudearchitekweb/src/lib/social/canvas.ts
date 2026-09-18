/**
 * Smart Canvas: fits ANY source image (16:9 / 21:9 renders, 1:1 AI generations, 4:3 photos, …) onto a
 * fixed platform canvas without ever cropping it. The image is scaled to fill the canvas on its
 * limiting axis and centered; the empty letterbox (top/bottom) or pillarbox (left/right) strip is
 * filled with either a soft, darkened Gaussian-blurred copy of the same image or a flat dark studio
 * matte. Built with sharp, cached on disk exactly like the platform-spec padding in ./media-prep.ts
 * (same UPLOAD_DIR/derived/ convention, same cache-file-per-input-signature approach) — this is the
 * SAME file the admin preview and the real publish pipeline both call, so what the operator sees in
 * the editor is pixel-for-pixel what gets uploaded.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { env } from "../env";
import { absPath } from "../media";
import type { Asset } from "../db/schema";

export const CANVAS_DIR = "derived/canvas";

/** "original": no canvas at all, the source is used untouched. */
export type CanvasMode = "original" | "smart_4_5" | "story_9_16";
export type CanvasMatte = "blur" | "dark";

export const CANVAS_MODES: CanvasMode[] = ["original", "smart_4_5", "story_9_16"];
export const CANVAS_MATTES: CanvasMatte[] = ["blur", "dark"];

/** Fixed output size per mode — large enough for every platform's own resize step to work from. */
export const CANVAS_TARGETS: Record<Exclude<CanvasMode, "original">, { w: number; h: number }> = {
  smart_4_5: { w: 1080, h: 1350 }, // Instagram / Facebook portrait feed
  story_9_16: { w: 1080, h: 1920 }, // Story / Reel
};

const DARK_MATTE = "#121212";
const BLUR_SIGMA = 42;
/** The blurred fill is darkened so the sharp, centered original reads as the subject, not the matte. */
const BLUR_BRIGHTNESS = 0.72;

/**
 * The mode a variant should render in when the operator has not chosen one explicitly
 * (`post_variants.canvas_mode` is null): a reel/video/short is a vertical placement everywhere, an
 * Instagram feed image/carousel is the portrait 4:5 Instagram itself recommends, and everything else
 * stays as the operator uploaded it.
 */
export function defaultCanvasMode(platform: string, format: string): CanvasMode {
  if (format === "reel" || format === "short" || format === "video") return "story_9_16";
  if (platform === "instagram" && (format === "image" || format === "carousel")) return "smart_4_5";
  return "original";
}

function cacheFile(asset: Asset, mode: Exclude<CanvasMode, "original">, matte: CanvasMatte) {
  const src = absPath(asset.relPath);
  const stat = fs.statSync(src);
  const sig = createHash("sha1").update(JSON.stringify([mode, matte, asset.id, stat.size, Math.round(stat.mtimeMs)])).digest("hex").slice(0, 12);
  const fileName = `${asset.id}-${mode}-${matte}-${sig}.jpg`;
  return { relPath: `${CANVAS_DIR}/${fileName}`, abs: path.join(env.uploadDir, CANVAS_DIR, fileName) };
}

export type CanvasResult = { absPath: string; relPath: string; width: number; height: number; generated: boolean };

/**
 * Produces (or reuses the cached copy of) the canvas-adapted image. `mode: "original"` is a pure
 * pass-through — no file is written, the source asset is returned as-is.
 */
export async function ensureCanvasVariant(asset: Asset, mode: CanvasMode, matte: CanvasMatte = "blur"): Promise<CanvasResult> {
  if (mode === "original") {
    return { absPath: absPath(asset.relPath), relPath: asset.relPath, width: asset.width ?? 0, height: asset.height ?? 0, generated: false };
  }
  const target = CANVAS_TARGETS[mode];
  const { relPath, abs } = cacheFile(asset, mode, matte);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) {
    // Touch it so the cleanup sweep counts from the last time it was actually used.
    const now = new Date();
    fs.utimesSync(abs, now, now);
    return { absPath: abs, relPath, width: target.w, height: target.h, generated: false };
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const src = absPath(asset.relPath);
  // "inside": never crops, and scales UP a small source so it fills the frame on its limiting axis —
  // a photo centred at a few hundred pixels in a 1080-wide canvas would look broken, not "studio".
  const foreground = await sharp(src, { failOn: "none" })
    .rotate()
    .resize({ width: target.w, height: target.h, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const fgMeta = await sharp(foreground).metadata();
  const fgW = fgMeta.width ?? target.w;
  const fgH = fgMeta.height ?? target.h;

  const background =
    matte === "dark"
      ? await sharp({ create: { width: target.w, height: target.h, channels: 3, background: DARK_MATTE } })
          .jpeg()
          .toBuffer()
      : await sharp(src, { failOn: "none" })
          .rotate()
          .resize({ width: target.w, height: target.h, fit: "cover" })
          .blur(BLUR_SIGMA)
          .modulate({ brightness: BLUR_BRIGHTNESS })
          .jpeg({ quality: 80 })
          .toBuffer();

  const out = await sharp(background)
    .composite([{ input: foreground, left: Math.round((target.w - fgW) / 2), top: Math.round((target.h - fgH) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, abs);
  return { absPath: abs, relPath, width: target.w, height: target.h, generated: true };
}

/** Removes cached canvas variants not used for maxAgeMs — same convention as media-prep's cleanupDerived. */
export function cleanupCanvasCache(maxAgeMs = 48 * 3600_000): number {
  const root = path.join(env.uploadDir, CANVAS_DIR);
  if (!fs.existsSync(root)) return 0;
  let removed = 0;
  for (const f of fs.readdirSync(root)) {
    const file = path.join(root, f);
    try {
      if (Date.now() - fs.statSync(file).mtimeMs > maxAgeMs) {
        fs.unlinkSync(file);
        removed++;
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}
