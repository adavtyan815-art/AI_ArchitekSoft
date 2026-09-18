/**
 * Global admin search. Subtitles and entity names come back already localised.
 *
 * Matching is a plain substring test, not SQL `LIKE`: `LIKE` folds case for ASCII only (so "անի"
 * would never find "Անի" and "мария" never "Мария"), and `%`/`_` inside the query would act as
 * wildcards. `lower_u` below is JavaScript's Unicode-aware lower-casing, registered on the SQLite
 * connection, and `instr` compares the text literally.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql, type SQL } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb, getSqlite, schema } from "@/lib/db";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const g = globalThis as typeof globalThis & { __atLowerU?: boolean };

/** Unicode-aware `lower()` for SQLite. Registered once per process (and again after a hot reload). */
function ensureLowerU() {
  if (g.__atLowerU) return;
  try {
    getSqlite().function("lower_u", { deterministic: true, varargs: false }, (v: unknown) => (typeof v === "string" ? v.toLowerCase() : v === null || v === undefined ? null : String(v).toLowerCase()));
    g.__atLowerU = true;
  } catch {
    // already registered on this connection
    g.__atLowerU = true;
  }
}

/** `needle` is already lower-cased; every column is folded the same way before the comparison. */
const has = (column: unknown, needle: string): SQL => sql`instr(lower_u(${column}), ${needle}) > 0`;

const anyOf = (...conditions: SQL[]): SQL => sql.join(conditions, sql` or `);

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  ensureLowerU();
  const { t } = await getAdminDict();
  const db = getDb();
  const n = q.toLowerCase();
  // The request number a visitor is given is the last six characters of the lead id.
  const code = q.toUpperCase();
  const hits: { type: string; typeLabel: string; id: string; title: string; subtitle?: string; href: string }[] = [];

  for (const l of db
    .select()
    .from(schema.leads)
    .where(anyOf(has(schema.leads.name, n), has(schema.leads.phone, n), has(schema.leads.companyName, n), has(schema.leads.email, n), sql`upper(substr(${schema.leads.id}, -6)) = ${code}`))
    .limit(5)
    .all())
    hits.push({ type: "lead", typeLabel: t.entities.lead, id: l.id, title: l.name, subtitle: `${labelFor(t, "segments", l.segment)} · ${labelFor(t, "leadStatus", l.status)}`, href: `/admin/leads/${l.id}` });

  for (const c of db
    .select()
    .from(schema.clients)
    .where(
      anyOf(
        // the full name too, so "Davit Sargsyan" finds the person, not only "Davit"
        has(sql`${schema.clients.firstName} || ' ' || coalesce(${schema.clients.lastName}, '')`, n),
        has(schema.clients.lastName, n),
        has(schema.clients.phone, n),
        has(schema.clients.email, n)
      )
    )
    .limit(5)
    .all())
    hits.push({ type: "client", typeLabel: t.entities.client, id: c.id, title: `${c.firstName} ${c.lastName ?? ""}`.trim(), subtitle: c.phone ?? undefined, href: `/admin/clients/${c.id}` });

  for (const c of db.select().from(schema.companies).where(has(schema.companies.name, n)).limit(5).all())
    hits.push({ type: "company", typeLabel: t.entities.company, id: c.id, title: c.name, subtitle: labelFor(t, "companyTypes", c.type), href: `/admin/companies/${c.id}` });

  for (const pr of db.select().from(schema.projects).where(anyOf(has(schema.projects.title, n), has(schema.projects.code, n))).limit(5).all())
    hits.push({ type: "project", typeLabel: t.entities.project, id: pr.id, title: `${pr.code} ${pr.title}`, subtitle: labelFor(t, "projectStage", pr.stage), href: `/admin/projects/${pr.id}` });

  for (const po of db.select().from(schema.posts).where(anyOf(has(schema.posts.title, n), has(schema.posts.coreText, n))).limit(5).all())
    hits.push({ type: "post", typeLabel: t.entities.post, id: po.id, title: po.title, subtitle: labelFor(t, "postStatus", po.status), href: `/admin/smm/${po.id}` });

  for (const a of db
    .select()
    .from(schema.assets)
    .where(anyOf(has(schema.assets.originalName, n), has(schema.assets.caption, n), has(schema.assets.tags, n)))
    .limit(5)
    .all())
    hits.push({ type: "asset", typeLabel: t.entities.asset, id: a.id, title: a.originalName, subtitle: a.caption ?? labelFor(t, "assetKinds", a.kind), href: `/admin/media/${a.id}` });

  return NextResponse.json({ hits: hits.slice(0, 15) });
}
