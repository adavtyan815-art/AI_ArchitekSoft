/**
 * Media storage: files live on disk under UPLOAD_DIR/YYYY/MM/<id>.<ext>.
 * Thumbnails (JPEG, 640px) are generated with sharp for images and with the
 * bundled ffmpeg for videos. Metadata lives in the `assets` table.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { nowIso } from "./utils";
import { newId } from "./ids";

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
export const DOC_MIMES = ["application/pdf"];
export const MODEL_EXT = [".glb", ".usdz", ".gltf"];
export const OTHER_EXT = [".dwg", ".dxf", ".skp", ".max", ".zip", ".rar", ".7z", ".csv", ".xlsx"];

export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB per file

export type AssetKind = "render" | "video" | "sketch" | "pdf" | "model_glb" | "model_usdz" | "poster" | "client_upload" | "other";

export function detectKind(mime: string, name: string, hint?: string): AssetKind {
  const ext = path.extname(name).toLowerCase();
  if (hint === "sketch" || hint === "poster" || hint === "client_upload") return hint;
  if (IMAGE_MIMES.includes(mime)) return "render";
  if (VIDEO_MIMES.includes(mime)) return "video";
  if (mime === "application/pdf" || ext === ".pdf") return "pdf";
  if (ext === ".glb" || ext === ".gltf") return "model_glb";
  if (ext === ".usdz") return "model_usdz";
  return "other";
}

export function isAllowed(mime: string, name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return (
    IMAGE_MIMES.includes(mime) ||
    VIDEO_MIMES.includes(mime) ||
    DOC_MIMES.includes(mime) ||
    MODEL_EXT.includes(ext) ||
    OTHER_EXT.includes(ext) ||
    [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".pdf"].includes(ext)
  );
}

export function safeExt(name: string, mime: string): string {
  const ext = path.extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (ext && ext.length <= 6) return ext;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "application/pdf") return ".pdf";
  return ".bin";
}

export function absPath(relPath: string): string {
  const p = path.resolve(env.uploadDir, relPath);
  if (!p.startsWith(env.uploadDir)) throw new Error("Invalid path");
  return p;
}

export function mediaUrl(relPath: string | null | undefined, width?: number): string {
  if (!relPath) return "";
  const base = `/media/${relPath.split(path.sep).join("/")}`;
  return width && /\.(jpe?g|png|webp|avif)$/i.test(relPath) ? `${base}?w=${width}` : base;
}

/** srcset for responsive <img> of an uploaded image. */
export function mediaSrcSet(relPath: string | null | undefined, widths: number[] = [480, 960, 1280, 1920]): string {
  if (!relPath) return "";
  return widths.map((w) => `${mediaUrl(relPath, w)} ${w}w`).join(", ");
}

function monthDir(): string {
  const d = new Date();
  const rel = path.join(String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0"));
  fs.mkdirSync(path.join(env.uploadDir, rel), { recursive: true });
  return rel;
}

async function makeImageThumb(src: string, dest: string) {
  await sharp(src, { failOn: "none" }).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(dest);
}

async function ffmpeg(args: string[]): Promise<void> {
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) throw new Error("ffmpeg not available");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

async function probeDuration(src: string): Promise<number | null> {
  // ffmpeg-static ships no ffprobe; parse ffmpeg's stderr instead.
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) return null;
  return new Promise((resolve) => {
    const proc = spawn(bin, ["-i", src]);
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("exit", () => {
      const m = err.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/);
      if (!m) return resolve(null);
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
    proc.on("error", () => resolve(null));
  });
}

export type SaveInput = {
  buffer: Buffer;
  originalName: string;
  mime: string;
  kindHint?: string;
  projectId?: string | null;
  leadId?: string | null;
  caption?: string | null;
  isPublic?: boolean;
};

export async function saveAsset(input: SaveInput) {
  const id = newId("ast");
  const ext = safeExt(input.originalName, input.mime);
  const rel = monthDir();
  const fileName = `${id}${ext}`;
  const relPath = path.join(rel, fileName);
  const full = path.join(env.uploadDir, relPath);
  fs.writeFileSync(full, input.buffer);

  const kind = detectKind(input.mime, input.originalName, input.kindHint);
  let width: number | null = null;
  let height: number | null = null;
  let durationSec: number | null = null;
  let thumbRelPath: string | null = null;

  try {
    if (IMAGE_MIMES.includes(input.mime)) {
      const meta = await sharp(full, { failOn: "none" }).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      const thumbRel = path.join(rel, `${id}_thumb.jpg`);
      await makeImageThumb(full, path.join(env.uploadDir, thumbRel));
      thumbRelPath = thumbRel;
    } else if (VIDEO_MIMES.includes(input.mime)) {
      durationSec = await probeDuration(full);
      const thumbRel = path.join(rel, `${id}_thumb.jpg`);
      const thumbAbs = path.join(env.uploadDir, thumbRel);
      try {
        await ffmpeg(["-y", "-ss", "1", "-i", full, "-frames:v", "1", "-vf", "scale=640:-2", thumbAbs]);
        if (fs.existsSync(thumbAbs)) thumbRelPath = thumbRel;
      } catch {
        /* thumbnail is optional */
      }
    } else if (input.mime === "application/pdf") {
      /* no thumbnail; the UI shows a document icon */
    }
  } catch (e) {
    console.warn("[media] post-processing failed", (e as Error).message);
  }

  const row = {
    id,
    kind,
    projectId: input.projectId ?? null,
    leadId: input.leadId ?? null,
    originalName: input.originalName.slice(0, 200),
    fileName,
    relPath: relPath.split(path.sep).join("/"),
    mime: input.mime,
    sizeBytes: input.buffer.length,
    width,
    height,
    durationSec,
    thumbRelPath: thumbRelPath ? thumbRelPath.split(path.sep).join("/") : null,
    caption: input.caption ?? null,
    tags: null,
    sortOrder: 0,
    isPublic: !!input.isPublic,
    createdAt: nowIso(),
  };
  getDb().insert(schema.assets).values(row).run();
  return row;
}

export function deleteAssetFiles(asset: { relPath: string; thumbRelPath: string | null }) {
  for (const rel of [asset.relPath, asset.thumbRelPath]) {
    if (!rel) continue;
    try {
      fs.unlinkSync(absPath(rel));
    } catch {
      /* ignore */
    }
  }
}

export function deleteAsset(id: string) {
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) return false;
  deleteAssetFiles(asset);
  db.delete(schema.assets).where(eq(schema.assets.id, id)).run();
  return true;
}

/**
 * Social poster: a branded 1080x1080 / 1080x1350 / 1920x1080 JPEG from a render,
 * with a subtle bottom gradient and the brand line. Generated with sharp (no browser needed).
 */
export async function generatePoster(opts: {
  sourceRelPath: string;
  ratio: "1:1" | "4:5" | "16:9" | "9:16";
  headline?: string;
  sub?: string;
  brand?: string;
  projectId?: string | null;
}) {
  const sizes = { "1:1": [1080, 1080], "4:5": [1080, 1350], "16:9": [1920, 1080], "9:16": [1080, 1920] } as const;
  const [w, h] = sizes[opts.ratio];
  const src = absPath(opts.sourceRelPath);
  const brand = (opts.brand ?? "ArchiTek Soft • KitchenPro").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const headline = (opts.headline ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sub = (opts.sub ?? "architeksoft.com").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const pad = Math.round(w * 0.055);
  const fontHead = Math.round(w * 0.045);
  const fontSub = Math.round(w * 0.024);
  const overlay = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.72"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="${pad}" y="${pad + fontSub}" font-family="Arial, Helvetica, 'Noto Sans Armenian', sans-serif" font-size="${fontSub}" font-weight="700" fill="#fff" letter-spacing="2">${brand.toUpperCase()}</text>
    ${headline ? `<text x="${pad}" y="${h - pad - fontSub - Math.round(fontHead * 0.6)}" font-family="Arial, Helvetica, 'Noto Sans Armenian', sans-serif" font-size="${fontHead}" font-weight="700" fill="#fff">${headline}</text>` : ""}
    <text x="${pad}" y="${h - pad}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSub}" font-weight="500" fill="#dbe5ff">${sub}</text>
  </svg>`;
  const buffer = await sharp(src, { failOn: "none" })
    .rotate()
    .resize(w, h, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
  return saveAsset({ buffer, originalName: `poster_${opts.ratio.replace(":", "x")}.jpg`, mime: "image/jpeg", kindHint: "poster", projectId: opts.projectId ?? null });
}
