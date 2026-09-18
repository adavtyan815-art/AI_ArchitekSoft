/**
 * POST /api/upload/public — attachments from the /start wizard, before a lead exists.
 *
 * Unauthenticated, so everything that costs disk or CPU is bounded before a byte is read:
 * the declared request size is checked first, then the per-address request rate, then a daily
 * byte budget per address and one for the whole server. Files that never end up on a lead are
 * cleaned up by the background worker.
 */
import { NextResponse, type NextRequest } from "next/server";
import { MediaTypeError, isAllowed, mediaUrl, saveAsset } from "@/lib/media";
import { clientIp, createLimiter, createQuota, retryHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILES = 8;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file for public uploads
/** Multipart framing plus the fields around the files. */
const MAX_REQUEST_BYTES = MAX_FILES * MAX_BYTES + 1024 * 1024;
const DAY_MS = 24 * 3600_000;
/** One visitor's daily budget, and the ceiling for everyone together, so the disk cannot be filled. */
const PER_IP_BYTES_PER_DAY = 300 * 1024 * 1024;
const GLOBAL_BYTES_PER_DAY = 5 * 1024 * 1024 * 1024;

const requests = createLimiter("public-upload", { limit: 20, windowMs: 60_000 });
const bytes = createQuota("public-upload-bytes", { limit: PER_IP_BYTES_PER_DAY, windowMs: DAY_MS });
const globalBytes = createQuota("public-upload-total", { limit: GLOBAL_BYTES_PER_DAY, windowMs: DAY_MS });

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const key = ip || "local";
  const limit = requests.take(key);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: retryHeaders(limit) });

  // Refuse an oversized request before `formData()` buffers it in memory.
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) return NextResponse.json({ ok: false, error: "too_large", max: MAX_BYTES }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && "name" in f);
  if (!files.length) return NextResponse.json({ ok: false, error: "no_files" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ ok: false, error: "too_many_files", max: MAX_FILES }, { status: 400 });

  for (const f of files) {
    if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "too_large", name: f.name, max: MAX_BYTES }, { status: 413 });
    if (!isAllowed(f.type || "application/octet-stream", f.name)) return NextResponse.json({ ok: false, error: "unsupported_type", name: f.name }, { status: 415 });
  }

  const totalBytes = files.reduce((n, f) => n + f.size, 0);
  if (!globalBytes.spend("all", totalBytes)) return NextResponse.json({ ok: false, error: "quota_exceeded" }, { status: 429 });
  if (!bytes.spend(key, totalBytes)) {
    globalBytes.refund("all", totalBytes);
    return NextResponse.json({ ok: false, error: "quota_exceeded" }, { status: 429 });
  }

  const out: { id: string; name: string; size: number; thumb: string }[] = [];
  try {
    for (const f of files) {
      const buffer = Buffer.from(await f.arrayBuffer());
      const row = await saveAsset({ buffer, originalName: f.name, mime: f.type || "application/octet-stream", kindHint: "client_upload" });
      out.push({ id: row.id, name: row.originalName, size: row.sizeBytes, thumb: mediaUrl(row.thumbRelPath) });
    }
  } catch (e) {
    const rejected = totalBytes - out.reduce((n, o) => n + o.size, 0);
    bytes.refund(key, rejected);
    globalBytes.refund("all", rejected);
    if (e instanceof MediaTypeError) return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 415 });
    console.warn("[upload] public upload failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, files: out });
}
