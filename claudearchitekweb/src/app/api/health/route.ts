import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export async function GET() {
  try {
    getSqlite().prepare("select 1").get();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
