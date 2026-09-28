/**
 * A locked library preview's thumbnail (`GET /api/webviewer/library/thumb/<token>`): a ≤ 96 px JPEG from the
 * git-ignored `private/webviewer/thumbs/`, addressed by the opaque token the library API hands out. That tiny picture
 * is all an outsider can ever get from the library.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, createLimiter } from "@/lib/rate-limit";
import { LIBRARY_DIR } from "../../_index";

export const runtime = "nodejs";

const thumbs = createLimiter("webviewer-thumb", { limit: 600, windowMs: 60_000 });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) return new NextResponse(null, { status: 404 });
  if (!thumbs.take(clientIp(req.headers) || "local").ok) return new NextResponse(null, { status: 429 });
  try {
    const body = await fs.readFile(path.join(LIBRARY_DIR, "thumbs", `${id}.jpg`));
    return new NextResponse(new Uint8Array(body), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
