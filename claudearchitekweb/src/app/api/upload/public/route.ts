import { NextResponse, type NextRequest } from "next/server";
import { isAllowed, mediaUrl, saveAsset } from "@/lib/media";

export const runtime = "nodejs";

const MAX_FILES = 8;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file for public uploads

export async function POST(req: NextRequest) {
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

  const out: { id: string; name: string; size: number; thumb: string }[] = [];
  for (const f of files) {
    const buffer = Buffer.from(await f.arrayBuffer());
    const row = await saveAsset({ buffer, originalName: f.name, mime: f.type || "application/octet-stream", kindHint: "client_upload" });
    out.push({ id: row.id, name: row.originalName, size: row.sizeBytes, thumb: mediaUrl(row.thumbRelPath) });
  }
  return NextResponse.json({ ok: true, files: out });
}
