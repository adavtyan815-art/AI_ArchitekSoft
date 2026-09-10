import Link from "next/link";
import { and, desc, eq, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { formatDuration, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { cn, formatBytes } from "@/lib/utils";
import { PageHeader, Panel, StatCard } from "@/components/admin/shell";
import { Empty, Input, Select } from "@/components/ui";
import { UploadZone } from "@/components/admin/media/upload-zone";
import { MediaLibrary, type MediaCard } from "@/components/admin/media/media-library";
import { bulkAssignAssetsAction, bulkDeleteAssetsAction } from "@/app/admin/actions/media-actions";

export const dynamic = "force-dynamic";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

type Search = { kind?: string; project?: string; q?: string };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const sp = await searchParams;
  const kind = KINDS.includes(sp.kind as (typeof KINDS)[number]) ? sp.kind! : "all";
  const projectFilter = (sp.project ?? "").trim().slice(0, 40) || "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const db = getDb();

  const conds: SQL[] = [];
  if (kind !== "all") conds.push(eq(schema.assets.kind, kind));
  if (projectFilter === "none") conds.push(isNull(schema.assets.projectId));
  else if (projectFilter !== "all") conds.push(eq(schema.assets.projectId, projectFilter));
  if (q) {
    const p = `%${q}%`;
    conds.push(or(like(schema.assets.originalName, p), like(schema.assets.caption, p), like(schema.assets.tags, p))!);
  }
  const rows = db.select().from(schema.assets).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.assets.createdAt)).limit(400).all();

  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  const projectLabels = Object.fromEntries(projects.map((p) => [p.id, `${p.code} ${p.title}`]));
  const kindCounts = Object.fromEntries(db.select({ kind: schema.assets.kind, c: sql<number>`count(*)` }).from(schema.assets).groupBy(schema.assets.kind).all().map((r) => [r.kind, r.c]));
  const totals = db.select({ c: sql<number>`count(*)`, b: sql<number>`coalesce(sum(size_bytes),0)` }).from(schema.assets).get();
  const unassigned = db.select({ c: sql<number>`count(*)` }).from(schema.assets).where(isNull(schema.assets.projectId)).get()?.c ?? 0;

  const cards: MediaCard[] = rows.map((a) => ({
    id: a.id,
    kind: a.kind,
    originalName: a.originalName,
    caption: a.caption,
    thumbUrl: thumbUrlFor(a),
    url: mediaUrl(a.relPath),
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt,
    durationLabel: formatDuration(a.durationSec),
    isPublic: a.isPublic,
    projectId: a.projectId,
    projectLabel: a.projectId ? projectLabels[a.projectId] ?? null : null,
  }));

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { kind, project: projectFilter, q, ...patch };
    if (next.kind && next.kind !== "all") p.set("kind", next.kind);
    if (next.project && next.project !== "all") p.set("project", next.project);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin/media?${s}` : "/admin/media";
  };

  return (
    <>
      <PageHeader title="Media library" subtitle="Every render, video, PDF and 3D model in one place." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Files" value={totals?.c ?? 0} hint={`${rows.length} shown`} />
        <StatCard label="Storage" value={formatBytes(totals?.b ?? 0)} />
        <StatCard label="Unassigned" value={unassigned} tone={unassigned ? "warning" : undefined} />
      </div>

      <Panel title="Upload" className="mb-4">
        <UploadZone label="Drop files here or click to choose — they land in the library unassigned" />
      </Panel>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {[{ key: "all", label: "All", count: totals?.c ?? 0 }, ...KINDS.map((k) => ({ key: k, label: k.replace(/_/g, " "), count: kindCounts[k] ?? 0 }))]
          .filter((t) => t.key === "all" || t.count > 0)
          .map((t) => (
            <Link key={t.key} href={href({ kind: t.key })} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium capitalize", kind === t.key ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">{t.count}</span>
            </Link>
          ))}
      </div>

      <form action="/admin/media" className="mb-4 flex flex-wrap items-center gap-2">
        {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
        <Select name="project" defaultValue={projectFilter} className="w-64 py-1.5 text-sm">
          <option value="all">Any project</option>
          <option value="none">Unassigned</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} {p.title}
            </option>
          ))}
        </Select>
        <Input name="q" defaultValue={q} placeholder="Search file name, caption, tags…" className="w-56 py-1.5" />
        <button type="submit" className="btn-secondary btn-sm">
          Apply
        </button>
        <Link href="/admin/media" className="btn-ghost btn-sm">
          Reset
        </Link>
      </form>

      {cards.length === 0 ? (
        <Empty title="No files match" text={q ? `Nothing found for “${q}”.` : "Upload renders, videos, PDFs or 3D models above."} />
      ) : (
        <MediaLibrary assets={cards} projects={projects.map((p) => ({ id: p.id, label: `${p.code} ${p.title}` }))} assignAction={bulkAssignAssetsAction} deleteAction={bulkDeleteAssetsAction} />
      )}
    </>
  );
}
