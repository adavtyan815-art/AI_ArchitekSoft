/**
 * Serves uploaded media from UPLOAD_DIR with HTTP Range support (video seeking).
 * Access: assets are addressed by unguessable ids; this route is public so
 * client pages and social platforms (Instagram fetches by URL) can load them.
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska",
  ".pdf": "application/pdf", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".usdz": "model/vnd.usdz+zip",
  ".dwg": "application/acad", ".dxf": "application/dxf", ".zip": "application/zip", ".csv": "text/csv",
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (rel.includes("..")) return new NextResponse("Bad path", { status: 400 });
  const abs = path.resolve(env.uploadDir, rel);
  if (!abs.startsWith(env.uploadDir) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return new NextResponse("Not found", { status: 404 });

  const stat = fs.statSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  const download = req.nextUrl.searchParams.get("download");
  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) baseHeaders["Content-Disposition"] = `attachment; filename="${download.replace(/[^\w.\-]+/g, "_")}"`;

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : Math.min(start + 4 * 1024 * 1024 - 1, stat.size - 1);
      if (start >= stat.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      const stream = fs.createReadStream(abs, { start, end });
      return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
        status: 206,
        headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
      });
    }
  }
  const stream = fs.createReadStream(abs);
  return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, { status: 200, headers: { ...baseHeaders, "Content-Length": String(stat.size) } });
}
