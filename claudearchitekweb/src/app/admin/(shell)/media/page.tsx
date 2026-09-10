import Link from "next/link";
import { and, desc, eq, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { formatDuration, thumbSrcSetFor, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatBytes } from "@/lib/utils";
import { FilterBar, PageHeader, Panel, PillTabs, StatCard } from "@/components/admin/shell";
import { Empty, Input, Select } from "@/components/ui";
import { UploadZone } from "@/components/admin/media/upload-zone";
import { MediaLibrary, type MediaCard } from "@/components/admin/media/media-library";
import { bulkAssignAssetsAction, bulkDeleteAssetsAction } from "@/app/admin/actions/media-actions";

export const dynamic = "force-dynamic";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

type Search = { kind?: string; project?: string; q?: string };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const M = t.media;
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
  const kindCounts = Object.fromEntries(
    db
      .select({ kind: schema.assets.kind, c: sql<number>`count(*)` })
      .from(schema.assets)
      .groupBy(schema.assets.kind)
      .all()
      .map((r) => [r.kind, r.c])
  );
  const totals = db.select({ c: sql<number>`count(*)`, b: sql<number>`coalesce(sum(size_bytes),0)` }).from(schema.assets).get();
  const unassigned = db.select({ c: sql<number>`count(*)` }).from(schema.assets).where(isNull(schema.assets.projectId)).get()?.c ?? 0;

  const cards: MediaCard[] = rows.map((a) => ({
    id: a.id,
    kind: a.kind,
    kindLabel: labelFor(t, "assetKinds", a.kind),
    originalName: a.originalName,
    caption: a.caption,
    thumbUrl: thumbUrlFor(a, 320),
    thumbSrcSet: thumbSrcSetFor(a, 320),
    url: mediaUrl(a.relPath),
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt,
    durationLabel: formatDuration(a.durationSec),
    isPublic: a.isPublic,
    projectId: a.projectId,
    projectLabel: a.projectId ? (projectLabels[a.projectId] ?? null) : null,
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

  const kindTabs = [{ key: "all", label: t.common.all, href: href({ kind: "all" }), count: totals?.c ?? 0 }, ...KINDS.map((k) => ({ key: k, label: labelFor(t, "assetKinds", k), href: href({ kind: k }), count: kindCounts[k] ?? 0 }))].filter((x) => x.key === "all" || x.count > 0);

  return (
    <>
      <PageHeader title={M.title} subtitle={M.subtitle} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={M.files} value={totals?.c ?? 0} hint={M.shown(rows.length)} />
        <StatCard label={M.storage} value={formatBytes(totals?.b ?? 0)} />
        <StatCard label={M.unassigned} value={unassigned} tone={unassigned ? "warning" : undefined} />
      </div>

      <Panel title={M.upload} className="mb-4">
        <UploadZone labels={{ label: M.uploadLibraryLabel, hint: M.uploadHint, busy: M.uploading, uploaded: M.uploaded, failed: M.uploadFailed }} />
      </Panel>

      <FilterBar className="flex-col items-stretch">
        <PillTabs items={kindTabs} current={kind} />
        <form action="/admin/media" className="flex w-full flex-wrap items-center gap-2">
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <Select name="project" defaultValue={projectFilter} className="w-full py-1.5 text-sm sm:w-64" aria-label={M.project}>
            <option value="all">{M.anyProject}</option>
            <option value="none">{M.unassignedOption}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.title}
              </option>
            ))}
          </Select>
          <Input name="q" defaultValue={q} placeholder={M.searchPlaceholder} className="w-full py-1.5 sm:w-56" aria-label={t.common.search} />
          <button type="submit" className="btn-secondary btn-sm">
            {t.common.apply}
          </button>
          <Link href="/admin/media" className="btn-ghost btn-sm">
            {t.common.reset}
          </Link>
        </form>
      </FilterBar>

      {cards.length === 0 ? (
        <Empty title={M.emptyTitle} text={q ? M.emptyFound(q) : M.emptyText} />
      ) : (
        <MediaLibrary
          assets={cards}
          projects={projects.map((p) => ({ id: p.id, label: `${p.code} ${p.title}` }))}
          labels={{
            selectAll: M.selectAll,
            selected: M.selected,
            unassignOption: M.unassignOption,
            assign: M.assign,
            deleteSelected: M.deleteSelected,
            deleteConfirm: M.deleteSelectedConfirm,
            publicShort: M.publicShort,
            noProject: M.noProject,
          }}
          assignAction={bulkAssignAssetsAction}
          deleteAction={bulkDeleteAssetsAction}
        />
      )}
    </>
  );
}
