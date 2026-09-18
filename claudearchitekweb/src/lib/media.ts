/**
 * Media storage: files live on disk under UPLOAD_DIR/YYYY/MM/<id>.<ext>.
 * Thumbnails (JPEG, 640px) are generated with sharp for images and with the
 * bundled ffmpeg for videos. Metadata lives in the `assets` table.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { eq, like, or } from "drizzle-orm";
import { getDb, getSqlite, schema } from "./db";
import { bust } from "./cache";
import { env } from "./env";
import { nowIso } from "./utils";
import { newId } from "./ids";

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
export const DOC_MIMES = ["application/pdf"];
/** Custom background-audio uploads for the SMM editor (see lib/audio.ts for the "Auto Ambient" library). */
export const AUDIO_MIMES = ["audio/mpeg"];
export const MODEL_EXT = [".glb", ".usdz", ".gltf"];
export const OTHER_EXT = [".dwg", ".dxf", ".skp", ".max", ".zip", ".rar", ".7z", ".csv", ".xlsx"];

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB per file — matches the Cloudflare proxy cap and request_body max_size in deploy/Caddyfile

export type AssetKind = "render" | "video" | "audio" | "sketch" | "pdf" | "model_glb" | "model_usdz" | "poster" | "client_upload" | "other";

/**
 * The file extension decides how a stored file is named on disk and served by /media, so the
 * extension (not the MIME type the browser declares) is what the allow-list is built on.
 */
const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpe": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
};

/** Canonical extension for a type we recognise (used when the upload has no usable extension). */
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "application/pdf": ".pdf",
  "audio/mpeg": ".mp3",
};

function extOf(name: string): string {
  return path.extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "");
}

/**
 * The type a file will be stored and served as. A known extension wins over the declared MIME
 * (a client can declare anything); the declared MIME is used only for a file without an extension.
 */
export function effectiveMime(mime: string, name: string): string {
  const ext = extOf(name);
  if (EXT_MIME[ext]) return EXT_MIME[ext];
  if (!ext && MIME_EXT[mime]) return mime;
  // models, archives, CAD files: a declared image/video/pdf type must not turn them into a preview
  return !mime || MIME_EXT[mime] ? "application/octet-stream" : mime;
}

export function detectKind(mime: string, name: string, hint?: string): AssetKind {
  const ext = path.extname(name).toLowerCase();
  if (hint === "sketch" || hint === "poster" || hint === "client_upload") return hint;
  if (IMAGE_MIMES.includes(mime)) return "render";
  if (VIDEO_MIMES.includes(mime)) return "video";
  if (AUDIO_MIMES.includes(mime) || ext === ".mp3") return "audio";
  if (mime === "application/pdf" || ext === ".pdf") return "pdf";
  if (ext === ".glb" || ext === ".gltf") return "model_glb";
  if (ext === ".usdz") return "model_usdz";
  return "other";
}

/**
 * Upload allow-list. A file with an extension is accepted only when that extension is on the list,
 * whatever MIME type was declared (so "page.html" sent as image/png is refused). A file without an
 * extension is accepted only for a declared type we can name ourselves. The content is checked
 * separately in `saveAsset` (see `contentMatchesType`).
 */
export function isAllowed(mime: string, name: string): boolean {
  const ext = extOf(name);
  if (ext) return !!EXT_MIME[ext] || MODEL_EXT.includes(ext) || OTHER_EXT.includes(ext);
  return !!MIME_EXT[mime];
}

export function safeExt(name: string, mime: string): string {
  const ext = extOf(name);
  if (EXT_MIME[ext]) return MIME_EXT[EXT_MIME[ext]]; // canonical: .jpeg/.jfif → .jpg, .m4v → .mp4
  if (MODEL_EXT.includes(ext) || OTHER_EXT.includes(ext)) return ext;
  return MIME_EXT[mime] ?? ".bin";
}

/** Thrown by `saveAsset` when the bytes are not what the file name / type claims. Nothing is written. */
export class MediaTypeError extends Error {
  constructor(message = "File content does not match its type") {
    super(message);
    this.name = "MediaTypeError";
  }
}

/** The real type of a buffer from its leading bytes, for the formats we generate previews of. */
export function sniffMime(buffer: Buffer): string | null {
  const b = buffer;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  const head6 = b.toString("latin1", 0, 6);
  if (head6 === "GIF87a" || head6 === "GIF89a") return "image/gif";
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/x-matroska"; // EBML: mkv and webm
  const box = b.toString("latin1", 4, 8);
  if (box === "ftyp") {
    const brands = b.toString("latin1", 8, Math.min(b.length, 64));
    if (/avif|avis/.test(brands)) return "image/avif";
    return /^qt {2}/.test(brands) ? "video/quicktime" : "video/mp4";
  }
  if (["moov", "mdat", "wide", "free", "skip", "pnot"].includes(box)) return "video/quicktime";
  if (b.toString("latin1", 0, Math.min(b.length, 1024)).includes("%PDF-")) return "application/pdf";
  // MP3: an ID3v2 tag ("ID3" ...) or, tag-less, a raw MPEG frame sync (0xFF followed by 3 set high bits).
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "audio/mpeg";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return null;
}

/**
 * True when the bytes agree with the type the file will be served as. Images, videos and PDFs must
 * really be one; models, archives and CAD files are stored as opaque downloads and are not inspected
 * (except .glb, which has a fixed 4-byte magic).
 */
export function contentMatchesType(buffer: Buffer, mime: string, name: string): boolean {
  const type = effectiveMime(mime, name);
  const real = sniffMime(buffer);
  if (type.startsWith("image/")) return !!real && real.startsWith("image/");
  if (type.startsWith("video/")) return !!real && real.startsWith("video/");
  if (type === "audio/mpeg") return real === "audio/mpeg";
  if (type === "application/pdf") return real === "application/pdf";
  if (extOf(name) === ".glb") return buffer.toString("latin1", 0, 4) === "glTF";
  return true;
}

export function absPath(relPath: string): string {
  const root = path.resolve(env.uploadDir);
  const p = path.resolve(root, relPath);
  if (p !== root && !p.startsWith(root + path.sep)) throw new Error("Invalid path");
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

/**
 * A wedged transcode used to hold the upload request open forever. Every ffmpeg child now carries a
 * kill timer: 120 s for a transcode, 20 s for the metadata probe (which only reads the header).
 */
const FFMPEG_TIMEOUT_MS = 120_000;
const FFPROBE_TIMEOUT_MS = 20_000;

async function ffmpeg(args: string[]): Promise<void> {
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) throw new Error("ffmpeg not available");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: "ignore" });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, FFMPEG_TIMEOUT_MS);
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
      return code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`));
    });
  });
}

async function probeDuration(src: string): Promise<number | null> {
  // ffmpeg-static ships no ffprobe; parse ffmpeg's stderr instead.
  const bin = (await import("ffmpeg-static")).default as unknown as string | null;
  if (!bin) return null;
  return new Promise((resolve) => {
    const proc = spawn(bin, ["-i", src]);
    let err = "";
    const timer = setTimeout(() => proc.kill("SIGKILL"), FFPROBE_TIMEOUT_MS);
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("exit", () => {
      clearTimeout(timer);
      const m = err.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/);
      if (!m) return resolve(null);
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
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

function unlinkQuietly(abs: string) {
  try {
    fs.unlinkSync(abs);
  } catch {
    /* ignore */
  }
}

export async function saveAsset(input: SaveInput) {
  // The declared MIME comes from the client: trust the extension and the bytes instead. The upload
  // routes check the allow-list too, but nothing may write a file type the library cannot show.
  if (!isAllowed(input.mime, input.originalName)) throw new MediaTypeError("File type is not allowed");
  if (!contentMatchesType(input.buffer, input.mime, input.originalName)) throw new MediaTypeError();
  const declared = effectiveMime(input.mime, input.originalName);
  const real = sniffMime(input.buffer);
  // an image keeps the type its bytes really are (a JPEG named .png is stored as .jpg)
  const mime = declared.startsWith("image/") && real?.startsWith("image/") ? real : declared;

  const id = newId("ast");
  const ext = MIME_EXT[mime] ?? safeExt(input.originalName, mime);
  const rel = monthDir();
  const fileName = `${id}${ext}`;
  const relPath = path.join(rel, fileName);
  const full = path.join(env.uploadDir, relPath);
  fs.writeFileSync(full, input.buffer);

  const kind = detectKind(mime, input.originalName, input.kindHint);
  let width: number | null = null;
  let height: number | null = null;
  let durationSec: number | null = null;
  let thumbRelPath: string | null = null;
  /**
   * Why the image/video could not be read, when it could not be. The row is still written (the
   * library shows the file and the owner can delete it), but a caller that must not attach an
   * unreadable file — the inbox importer — has to be able to see this instead of a console line.
   */
  let postProcessError: string | null = null;

  try {
    if (IMAGE_MIMES.includes(mime)) {
      const meta = await sharp(full, { failOn: "none" }).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      const thumbRel = path.join(rel, `${id}_thumb.jpg`);
      // Generating the thumbnail decodes the pixels, so this is also the check that the bytes are a
      // whole image: a file that is still being copied has the right header and no image in it.
      await makeImageThumb(full, path.join(env.uploadDir, thumbRel));
      thumbRelPath = thumbRel;
      if (!width || !height) postProcessError = "the image has no readable size";
    } else if (VIDEO_MIMES.includes(mime)) {
      durationSec = await probeDuration(full);
      const thumbRel = path.join(rel, `${id}_thumb.jpg`);
      const thumbAbs = path.join(env.uploadDir, thumbRel);
      try {
        await ffmpeg(["-y", "-ss", "1", "-i", full, "-frames:v", "1", "-vf", "scale=640:-2", thumbAbs]);
        if (fs.existsSync(thumbAbs)) thumbRelPath = thumbRel;
      } catch {
        /* thumbnail is optional: a very short clip has no frame at 1 s */
      }
      // Neither a duration nor a single frame: ffmpeg could not read this file at all.
      if (durationSec === null && !thumbRelPath) postProcessError = "no duration and no frame could be read from the video";
    } else if (AUDIO_MIMES.includes(mime)) {
      durationSec = await probeDuration(full);
      if (durationSec === null) postProcessError = "no duration could be read from the audio file";
      /* no thumbnail; the UI shows a waveform icon */
    } else if (mime === "application/pdf") {
      /* no thumbnail; the UI shows a document icon */
    }
  } catch (e) {
    postProcessError = (e as Error).message;
    console.warn("[media] post-processing failed", postProcessError);
  }

  const row = {
    id,
    kind,
    projectId: input.projectId ?? null,
    leadId: input.leadId ?? null,
    originalName: input.originalName.slice(0, 200),
    fileName,
    relPath: relPath.split(path.sep).join("/"),
    mime,
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
  try {
    getDb().insert(schema.assets).values(row).run();
  } catch (e) {
    // e.g. the project was deleted while a large file was uploading (FK failure): do not leave orphan files
    unlinkQuietly(full);
    if (thumbRelPath) unlinkQuietly(path.join(env.uploadDir, thumbRelPath));
    throw e;
  }
  return { ...row, postProcessError };
}

/** Resized AVIF/WebP copies written by the /media route: UPLOAD_DIR/.cache/<rel with "_">.w<W>.q<Q>.<fmt> */
function deleteCachedVariants(rels: string[]) {
  const dir = path.join(env.uploadDir, ".cache");
  const prefixes = rels.map((rel) => `${rel.replace(/[\\/]/g, "_")}.w`);
  if (!prefixes.length) return;
  let entries: string[];
  try {
    if (!fs.existsSync(dir)) return;
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) if (prefixes.some((p) => name.startsWith(p))) unlinkQuietly(path.join(dir, name));
}

export function deleteAssetFiles(asset: { relPath: string; thumbRelPath: string | null }) {
  const rels = [asset.relPath, asset.thumbRelPath].filter((r): r is string => !!r);
  for (const rel of rels) {
    try {
      fs.unlinkSync(absPath(rel));
    } catch {
      /* ignore */
    }
  }
  deleteCachedVariants(rels);
}

function parseIdList(json: string | null): string[] {
  if (!json) return [];
  try {
    const list: unknown = JSON.parse(json);
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Remove one id from a JSON string[] column value. Returns null when the value does not change. */
function withoutId(json: string | null, id: string): string | null {
  if (!json || !json.includes(id)) return null;
  const list = parseIdList(json);
  const next = list.filter((v) => v !== id);
  return next.length === list.length ? null : JSON.stringify(next);
}

/**
 * Delete an asset together with everything that points at it: project deliverable roles,
 * portfolio cover / gallery / video, lead attachments (post_assets rows cascade in the database).
 * The rows go first, in one transaction; the files are removed only after that succeeded.
 */
export function deleteAsset(id: string) {
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) return false;
  const P = schema.projects;
  const F = schema.portfolioItems;
  getSqlite().transaction(() => {
    const now = nowIso();
    db.update(P).set({ coverAssetId: null, updatedAt: now }).where(eq(P.coverAssetId, id)).run();
    db.update(P).set({ sketchAssetId: null, updatedAt: now }).where(eq(P.sketchAssetId, id)).run();
    db.update(P).set({ pdfAssetId: null, updatedAt: now }).where(eq(P.pdfAssetId, id)).run();
    db.update(P).set({ arGlbAssetId: null, updatedAt: now }).where(eq(P.arGlbAssetId, id)).run();
    db.update(P).set({ arUsdzAssetId: null, updatedAt: now }).where(eq(P.arUsdzAssetId, id)).run();

    db.update(F).set({ videoAssetId: null }).where(eq(F.videoAssetId, id)).run();
    const items = db.select({ id: F.id, coverAssetId: F.coverAssetId, assetIds: F.assetIds }).from(F).where(or(eq(F.coverAssetId, id), like(F.assetIds, `%${id}%`))).all();
    for (const it of items) {
      const nextIds = withoutId(it.assetIds, id);
      const patch: { assetIds?: string; coverAssetId?: string | null } = {};
      if (nextIds) patch.assetIds = nextIds;
      if (it.coverAssetId === id) {
        // a deleted cover falls back to the next gallery image instead of leaving the card empty
        const remaining = parseIdList(nextIds ?? it.assetIds);
        patch.coverAssetId = remaining[0] ?? null;
      }
      if (Object.keys(patch).length) db.update(F).set(patch).where(eq(F.id, it.id)).run();
    }

    const leadRows = db.select({ id: schema.leads.id, files: schema.leads.files }).from(schema.leads).where(like(schema.leads.files, `%${id}%`)).all();
    for (const l of leadRows) {
      const next = withoutId(l.files, id);
      if (next) db.update(schema.leads).set({ files: next === "[]" ? null : next }).where(eq(schema.leads.id, l.id)).run();
    }

    db.delete(schema.assets).where(eq(schema.assets.id, id)).run();
  })();
  deleteAssetFiles(asset);
  bust("portfolio:");
  return true;
}

/** Text for an SVG/XML text node: drops characters XML 1.0 does not allow (control characters, lone surrogates) and escapes & < >. */
function xmlText(value: string): string {
  return value
    .replace(/[^\x09\x0A\x0D\x20-퟿-�\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  // Uppercase first, escape last: uppercasing an escaped string turns "&amp;" into the invalid "&AMP;".
  const brand = xmlText((opts.brand ?? "ArchiTek Soft").toUpperCase());
  const headline = xmlText(opts.headline ?? "");
  const sub = xmlText(opts.sub ?? "architeksoft.com");
  const pad = Math.round(w * 0.055);
  const fontHead = Math.round(w * 0.045);
  const fontSub = Math.round(w * 0.024);
  const overlay = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.72"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="${pad}" y="${pad + fontSub}" font-family="Arial, Helvetica, 'Noto Sans Armenian', sans-serif" font-size="${fontSub}" font-weight="700" fill="#fff" letter-spacing="2">${brand}</text>
    ${headline ? `<text x="${pad}" y="${h - pad - fontSub - Math.round(fontHead * 0.6)}" font-family="Arial, Helvetica, 'Noto Sans Armenian', sans-serif" font-size="${fontHead}" font-weight="700" fill="#fff">${headline}</text>` : ""}
    <text x="${pad}" y="${h - pad}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSub}" font-weight="500" fill="#dbe5ff">${sub}</text>
  </svg>`;
  const buffer = await sharp(src, { failOn: "none" })
    .rotate()
    .resize(w, h, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
  // A project id that no longer exists would fail the foreign key after the render was done: keep the poster, unattached.
  const projectId = opts.projectId && getDb().select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, opts.projectId)).get() ? opts.projectId : null;
  return saveAsset({ buffer, originalName: `poster_${opts.ratio.replace(":", "x")}.jpg`, mime: "image/jpeg", kindHint: "poster", projectId });
}
