/**
 * GET /api/admin/media-canvas?assetId=&mode=&matte= — the Smart Canvas preview the SMM editor calls
 * so "what the operator sees" is the exact same sharp render the real publish pipeline would produce
 * (see lib/social/canvas.ts, called from lib/smm.ts before a variant's images are handed to an
 * adapter). Admin-only: this is an editor tool, not a public image endpoint.
 */
import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { CANVAS_MATTES, CANVAS_MODES, ensureCanvasVariant, type CanvasMatte, type CanvasMode } from "@/lib/social/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const assetId = (req.nextUrl.searchParams.get("assetId") ?? "").trim();
  const mode = (req.nextUrl.searchParams.get("mode") ?? "") as CanvasMode;
  const matte = (req.nextUrl.searchParams.get("matte") ?? "blur") as CanvasMatte;
  if (!assetId || !CANVAS_MODES.includes(mode) || !CANVAS_MATTES.includes(matte)) return new NextResponse("Bad request", { status: 400 });

  const asset = getDb().select().from(schema.assets).where(eq(schema.assets.id, assetId)).get();
  if (!asset) return new NextResponse("Not found", { status: 404 });
  if (!asset.mime.startsWith("image/")) return new NextResponse("Not an image", { status: 400 });

  try {
    const result = await ensureCanvasVariant(asset, mode, matte);
    const buf = fs.readFileSync(result.absPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(buf.length),
        // Private: this URL names an internal asset id and is only ever called from the signed-in editor.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return new NextResponse(`Could not render the canvas preview: ${(e as Error).message}`, { status: 500 });
  }
}
