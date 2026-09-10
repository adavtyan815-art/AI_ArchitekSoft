import { NextResponse, type NextRequest } from "next/server";
import { like, or, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";

/** Global admin search. Subtitles and entity names come back already localised. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const { t } = await getAdminDict();
  const db = getDb();
  const p = `%${q}%`;
  const hits: { type: string; typeLabel: string; id: string; title: string; subtitle?: string; href: string }[] = [];
  for (const l of db.select().from(schema.leads).where(or(like(schema.leads.name, p), like(schema.leads.phone, p), like(schema.leads.companyName, p), like(schema.leads.email, p))).limit(5).all())
    hits.push({ type: "lead", typeLabel: t.entities.lead, id: l.id, title: l.name, subtitle: `${labelFor(t, "segments", l.segment)} · ${labelFor(t, "leadStatus", l.status)}`, href: `/admin/leads/${l.id}` });
  for (const c of db.select().from(schema.clients).where(or(like(schema.clients.firstName, p), like(schema.clients.lastName, p), like(schema.clients.phone, p), like(schema.clients.email, p))).limit(5).all())
    hits.push({ type: "client", typeLabel: t.entities.client, id: c.id, title: `${c.firstName} ${c.lastName ?? ""}`.trim(), subtitle: c.phone ?? undefined, href: `/admin/clients/${c.id}` });
  for (const c of db.select().from(schema.companies).where(like(schema.companies.name, p)).limit(5).all())
    hits.push({ type: "company", typeLabel: t.entities.company, id: c.id, title: c.name, subtitle: labelFor(t, "companyTypes", c.type), href: `/admin/companies/${c.id}` });
  for (const pr of db.select().from(schema.projects).where(or(like(schema.projects.title, p), like(schema.projects.code, p))).limit(5).all())
    hits.push({ type: "project", typeLabel: t.entities.project, id: pr.id, title: `${pr.code} ${pr.title}`, subtitle: labelFor(t, "projectStage", pr.stage), href: `/admin/projects/${pr.id}` });
  for (const po of db.select().from(schema.posts).where(or(like(schema.posts.title, p), sql`${schema.posts.coreText} like ${p}`)).limit(5).all())
    hits.push({ type: "post", typeLabel: t.entities.post, id: po.id, title: po.title, subtitle: labelFor(t, "postStatus", po.status), href: `/admin/smm/${po.id}` });
  return NextResponse.json({ hits: hits.slice(0, 15) });
}
