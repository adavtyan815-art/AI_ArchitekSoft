/**
 * GET /api/admin/audio-track?file=<name>.mp3 — streams one "Auto Ambient" track from data/audio/ so
 * the post editor's background-audio player can let the operator listen to it before publishing.
 * `file` is resolved through ambientFilePath()'s membership check (lib/audio.ts): only a name that is
 * really in that folder right now resolves to a path, so nothing outside it can ever be read.
 * A custom-uploaded track is an ordinary asset and is served by /media/[...path] instead.
 */
import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ambientFilePath } from "@/lib/audio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const file = (req.nextUrl.searchParams.get("file") ?? "").trim();
  const abs = file ? ambientFilePath(file) : null;
  if (!abs) return new NextResponse("Not found", { status: 404 });

  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
