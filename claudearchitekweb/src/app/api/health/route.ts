/**
 * GET /api/health — the container/uptime probe. Public, so the body never says *why* something is
 * wrong: driver messages and file paths stay in the server log.
 */
import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getSqlite().prepare("select 1").get();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    console.error("[health] database check failed", e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
