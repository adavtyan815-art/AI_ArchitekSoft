/**
 * The full decor library for the 3D configurator's demo mode, browsed LOCKED:
 * `GET /api/webviewer/library?group=&maker=&market=am&q=&page=`.
 *
 * The public showcase ships 17 interactive decors; this lets visitors see the real scope behind them — by
 * manufacturer, by market, by search — as locked previews ("available with your custom project"). Each answer is one
 * page of display fields (name, maker, code, colour) and a 96 px thumbnail URL, plus the counts for the filters.
 * Textures, material properties and supplier data do not exist here at all. Pages are capped per filter combination
 * (PAGE_MAX × PAGE_SIZE) and requests are rate-limited per visitor, so the library cannot be pulled in one go.
 */
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, createLimiter } from "@/lib/rate-limit";
import { libraryEntries, type LibraryEntry } from "./_index";

export const runtime = "nodejs";

const PAGE_SIZE = 24;
const PAGE_MAX = 5;
const requests = createLimiter("webviewer-library", { limit: 60, windowMs: 60_000 });

/** Which categories a group lists — the same rule as the viewer's catalog.js (CATEGORY_OK). */
const GROUP_OK: Record<string, (k: string) => boolean> = {
  counter: (k) => k === "worktop" || k === "materialdecor",
  carcass: (k) => k === "unicolour" || k === "woodgrain",
  fronts: (k) => k !== "worktop" && k !== "edgeband",
};

const empty = { total: 0, page: 0, pageSize: PAGE_SIZE, pageMax: PAGE_MAX, armenia: 0, makers: [], results: [] };

export async function GET(req: NextRequest) {
  if (!requests.take(clientIp(req.headers) || "local").ok) return NextResponse.json(empty, { status: 429 });
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  if (q.length > 60) return NextResponse.json(empty, { status: 400 });
  const groupOk = GROUP_OK[sp.get("group") ?? ""] ?? (() => true);
  const maker = sp.get("maker") || null;
  const armeniaOnly = sp.get("market") === "am";
  const page = Math.min(Math.max(Number.parseInt(sp.get("page") ?? "0", 10) || 0, 0), PAGE_MAX - 1);
  const terms = q.length >= 2 ? q.split(/\s+/).filter(Boolean).slice(0, 6) : [];

  const inGroup = libraryEntries().filter((e) => groupOk(e.k.toLowerCase()) && terms.every((t) => e.s.includes(t)));
  // facets: manufacturers for the chosen market, the Armenian count for the chosen manufacturer
  const byMarket = armeniaOnly ? inGroup.filter((e) => e.a) : inGroup;
  const makerCounts = new Map<string, number>();
  for (const e of byMarket) makerCounts.set(e.m, (makerCounts.get(e.m) ?? 0) + 1);
  const armenia = inGroup.filter((e) => e.a && (!maker || e.m === maker)).length;
  // pictures first: a grid of thumbnails reads better than flat colour chips
  const hits: LibraryEntry[] = byMarket.filter((e) => !maker || e.m === maker).sort((a, b) => Number(b.th) - Number(a.th));

  return NextResponse.json(
    {
      total: hits.length,
      page,
      pageSize: PAGE_SIZE,
      pageMax: PAGE_MAX,
      armenia,
      makers: [...makerCounts].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
      results: hits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e) => ({
        name: e.n,
        maker: e.m,
        code: e.c,
        hex: e.h,
        thumb: e.th ? `/api/webviewer/library/thumb/${e.t}` : null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
