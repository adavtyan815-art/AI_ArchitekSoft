/**
 * Serves uploaded media from UPLOAD_DIR.
 *  - Images: optional `?w=<width>` (and `&q=`) returns a resized WebP (or AVIF when the client
 *    accepts it), generated once with sharp and cached under UPLOAD_DIR/.cache. Allowed widths
 *    are a fixed ladder so the cache cannot be flooded.
 *  - Videos/others: HTTP Range support (seeking), long immutable cache headers.
 * Access: site, brand and published files stay open to everyone, because social platforms fetch
 * them by URL. A client's project files are not public property, so they are served only to the
 * signed-in owner or to a visitor who holds a live client page of that project — with that link's
 * own download permission. See `accessFor`.
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { and, eq, notInArray, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { LINK_KEYS_COOKIE, holdsLink, parseLinkKeys, passcodeCookieName } from "@/lib/portal";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska",
  ".pdf": "application/pdf", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".usdz": "model/vnd.usdz+zip",
  ".dwg": "application/acad", ".dxf": "application/dxf", ".zip": "application/zip", ".csv": "text/csv",
};
const RESIZABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 1920];
const IMMUTABLE = "public, max-age=31536000, immutable";
/** Largest slice returned for an open-ended range request. */
const CHUNK = 4 * 1024 * 1024;

function pickWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return WIDTHS.find((w) => w >= n) ?? WIDTHS[WIDTHS.length - 1];
}

/** The only quality values that get a cache file. Anything else snaps to the nearest one. */
const QUALITIES = [45, 55, 65, 78, 90] as const;

function pickQuality(raw: string | null, format: "avif" | "webp"): number {
  const fallback = format === "avif" ? 55 : 78;
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return QUALITIES.reduce((best, q) => (Math.abs(q - n) < Math.abs(best - n) ? q : best), QUALITIES[0]);
}

/** What the caller may do with this file. `gated` marks a file that is not served to everyone. */
type Access = { view: boolean; download: boolean; gated: boolean };

const OPEN: Access = { view: true, download: true, gated: false };
const PRIVATE_OPEN: Access = { view: true, download: true, gated: true };
const DENIED: Access = { view: false, download: false, gated: true };

/**
 * Who may see this file?
 *
 * Open to everyone: anything that is not a client's project file — files marked "may appear on the
 * website", files with no owning project (brand and site images, visitor attachments), and paths
 * that are not in the library at all (social platforms fetch those by URL, with no cookies).
 *
 * A project file that is not public belongs to one client, so it is served only to:
 *  - the signed-in owner;
 *  - a visitor holding a live client page of that project (the `pk` cookie the middleware writes
 *    from `?k=`, plus the passcode cookie when the link has a code) — and `?download=` only when
 *    *that* link allows downloads. A sibling link with downloads switched on does not open the file
 *    for someone holding a link where it is switched off;
 *  - the platform fetching a file attached to a social post that is on its way out (read only).
 *
 * Thumbnails are matched too, so a preview is no more public than the file it previews.
 */
async function accessFor(rel: string, req: NextRequest): Promise<Access | "unavailable"> {
  const native = rel.split("/").join(path.sep);

  // Step 1 — is this file in the library at all, and does it belong to a project?
  // Its own try/catch, because the answer decides which way the *next* step may fail. When the
  // library cannot be read, a client's render and a brand image look exactly alike, so the request
  // is answered with "try again" rather than with the file (see `unavailable` in GET below).
  let db: ReturnType<typeof getDb>;
  let asset: { id: string; projectId: string | null; isPublic: boolean } | undefined;
  try {
    db = getDb();
    asset = db
      .select({ id: schema.assets.id, projectId: schema.assets.projectId, isPublic: schema.assets.isPublic })
      .from(schema.assets)
      .where(
        or(
          eq(schema.assets.relPath, rel),
          eq(schema.assets.relPath, native),
          eq(schema.assets.thumbRelPath, rel),
          eq(schema.assets.thumbRelPath, native)
        )
      )
      .get();
  } catch (e) {
    console.warn("[media] asset lookup failed", (e as Error).message);
    return "unavailable";
  }
  // Not in the library, no owning project, or marked public: open to everyone, as documented above.
  if (!asset || !asset.projectId || asset.isPublic) return OPEN;

  const projectId = asset.projectId;
  const assetId = asset.id;

  // Step 2 — the file is one client's property. Every check from here fails CLOSED: a lookup that
  // throws is not permission to hand a private project file to whoever asked for it, and the
  // response would carry a shared-cache header that keeps it.
  try {
    // Cheap when there is no session cookie: getSessionUser() returns before touching the database.
    if (await getSessionUser()) return PRIVATE_OPEN;

    const keys = parseLinkKeys(req.cookies.get(LINK_KEYS_COOKIE)?.value);
    if (keys.length) {
      const links = db
        .select({
          id: schema.shareLinks.id,
          token: schema.shareLinks.token,
          passcode: schema.shareLinks.passcode,
          isActive: schema.shareLinks.isActive,
          expiresAt: schema.shareLinks.expiresAt,
          allowDownload: schema.shareLinks.allowDownload,
        })
        .from(schema.shareLinks)
        .where(eq(schema.shareLinks.projectId, projectId))
        .all();
      const held = links.filter((l) => holdsLink(l, keys, req.cookies.get(passcodeCookieName(l.id))?.value));
      if (held.length) return { view: true, download: held.some((l) => l.allowDownload), gated: true };
    }

    // Instagram pulls the URL itself, so a file on its way to a feed has no visitor behind it and no
    // cookie. Only posts that are actually going out count, and only for reading: `?download=` stays
    // the decision of the client page.
    const inPost = db
      .select({ id: schema.postAssets.id })
      .from(schema.postAssets)
      .innerJoin(schema.posts, eq(schema.posts.id, schema.postAssets.postId))
      .where(and(eq(schema.postAssets.assetId, assetId), notInArray(schema.posts.status, ["draft", "cancelled"])))
      .get();
    if (inPost) return { view: true, download: false, gated: true };
  } catch (e) {
    console.warn("[media] permission check failed, denying", (e as Error).message);
    return DENIED;
  }
  return DENIED;
}

/** Parsed Range header, or "invalid" when the client asked for something that cannot be served. */
function parseRange(range: string, size: number): { start: number; end: number } | "invalid" | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return null; // not a form we handle: answer with the whole file
  const hasStart = m[1] !== "";
  const hasEnd = m[2] !== "";
  if (!hasStart && !hasEnd) return "invalid";
  if (size === 0) return "invalid";
  if (!hasStart) {
    // suffix form "bytes=-N": the LAST n bytes, not the first ones
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n <= 0) return "invalid";
    return { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(m[1]);
  if (!Number.isFinite(start) || start >= size) return "invalid";
  const end = hasEnd ? Math.min(Number(m[2]), size - 1) : Math.min(start + CHUNK - 1, size - 1);
  if (!Number.isFinite(end) || end < start) return "invalid";
  return { start, end };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (rel.includes("..") || rel.startsWith(".cache")) return new NextResponse("Bad path", { status: 400 });
  const abs = path.resolve(env.uploadDir, rel);
  if (!abs.startsWith(env.uploadDir) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(abs).toLowerCase();
  const width = RESIZABLE.has(ext) ? pickWidth(req.nextUrl.searchParams.get("w")) : null;
  const download = req.nextUrl.searchParams.get("download");

  // Checked before anything is read or resized: a client's files are not public, and a preview of
  // one is not either.
  const access = await accessFor(rel, req);
  // The library could not be read, so the file's owner is unknown. Retryable, and never cached.
  if (access === "unavailable") return new NextResponse("Temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  if (download && !access.download) return new NextResponse("Not available", { status: 403 });
  // Nothing is said about a file the caller may not see, not even that it exists.
  if (!access.view) return new NextResponse("Not found", { status: 404 });
  // A per-visitor file must never be kept by a shared cache and handed to the next visitor.
  const cacheControl = access.gated ? "private, max-age=31536000, immutable" : IMMUTABLE;

  // ---- resized image variant -------------------------------------------------
  if (width) {
    const accept = req.headers.get("accept") ?? "";
    const format: "avif" | "webp" = accept.includes("image/avif") ? "avif" : "webp";
    // Every distinct q writes its own .cache file, so a free 40-90 range let a crawler fill the disk
    // with 51 copies of the same image. Snap to a small fixed set instead.
    const q = pickQuality(req.nextUrl.searchParams.get("q"), format);
    const cacheRel = path.join(".cache", rel.replace(/\//g, "_") + `.w${width}.q${q}.${format}`);
    const cacheAbs = path.join(env.uploadDir, cacheRel);
    if (!fs.existsSync(cacheAbs)) {
      fs.mkdirSync(path.dirname(cacheAbs), { recursive: true });
      const pipeline = sharp(abs, { failOn: "none" }).rotate().resize({ width, withoutEnlargement: true });
      const buf = format === "avif" ? await pipeline.avif({ quality: q, effort: 3 }).toBuffer() : await pipeline.webp({ quality: q }).toBuffer();
      fs.writeFileSync(cacheAbs, buf);
    }
    const buf = fs.readFileSync(cacheAbs);
    return new NextResponse(buf, { status: 200, headers: { "Content-Type": `image/${format}`, "Content-Length": String(buf.length), "Cache-Control": cacheControl, Vary: access.gated ? "Accept, Cookie" : "Accept", "X-Content-Type-Options": "nosniff" } });
  }

  // ---- original file (with Range) ---------------------------------------------
  const stat = fs.statSync(abs);
  const type = MIME[ext] ?? "application/octet-stream";
  const baseHeaders: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" };
  if (access.gated) baseHeaders["Vary"] = "Cookie";
  if (download) baseHeaders["Content-Disposition"] = `attachment; filename="${download.replace(/[^\w.\-]+/g, "_")}"`;

  const range = req.headers.get("range");
  if (range) {
    const parsed = parseRange(range, stat.size);
    if (parsed === "invalid") return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes" } });
    if (parsed) {
      const { start, end } = parsed;
      const stream = fs.createReadStream(abs, { start, end });
      return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, { status: 206, headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) } });
    }
  }
  const stream = fs.createReadStream(abs);
  return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, { status: 200, headers: { ...baseHeaders, "Content-Length": String(stat.size) } });
}
