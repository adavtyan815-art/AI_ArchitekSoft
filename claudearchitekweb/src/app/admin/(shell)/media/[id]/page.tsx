import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { formatDuration, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl, mediaSrcSet } from "@/lib/media";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { formatBytes, formatDate, parseJson } from "@/lib/utils";
import { FormActions, KV, PageHeader, Panel } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteAssetAction, updateAssetAction } from "@/app/admin/actions/media-actions";

export const dynamic = "force-dynamic";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { t } = await getAdminDict();
  const M = t.media;
  const { id } = await params;
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) notFound();
  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  const project = asset.projectId ? projects.find((p) => p.id === asset.projectId) : null;
  const url = mediaUrl(asset.relPath);
  const thumb = thumbUrlFor(asset, 640);
  const tags = parseJson<string[]>(asset.tags, []);
  const isImage = asset.mime.startsWith("image/");
  const isVideo = asset.mime.startsWith("video/");
  const isPdf = asset.mime === "application/pdf";

  const roles: string[] = [];
  if (project) {
    const p = db.select().from(schema.projects).where(eq(schema.projects.id, project.id)).get();
    if (p) {
      if (p.coverAssetId === asset.id) roles.push(M.roleLabels.cover);
      if (p.sketchAssetId === asset.id) roles.push(M.roleLabels.sketch);
      if (p.pdfAssetId === asset.id) roles.push(M.roleLabels.pdf);
      if (p.arGlbAssetId === asset.id) roles.push(M.roleLabels.ar_glb);
      if (p.arUsdzAssetId === asset.id) roles.push(M.roleLabels.ar_usdz);
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: M.title, href: "/admin/media" }, { label: asset.originalName }]}
        title={asset.caption || asset.originalName}
        subtitle={`${labelFor(t, "assetKinds", asset.kind)} · ${asset.mime} · ${formatBytes(asset.sizeBytes)} · ${M.uploadedAt.toLowerCase()} ${formatDate(asset.createdAt, true)}`}
        actions={
          <>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              <ExternalLink size={14} /> {t.common.open}
            </a>
            <a href={url} download={asset.originalName} className="btn-secondary btn-sm">
              <Download size={14} /> {t.common.download}
            </a>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title={M.preview}>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(asset.relPath, 1280)} srcSet={mediaSrcSet(asset.relPath, [640, 1280, 1920])} sizes="(max-width: 1024px) 100vw, 720px" alt={asset.caption ?? asset.originalName} className="mx-auto max-h-[60vh] w-auto rounded-xl" />
            ) : isVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={url} poster={thumb ?? undefined} controls className="mx-auto max-h-[60vh] w-full rounded-xl bg-black" />
            ) : isPdf ? (
              <div className="flex flex-col items-center gap-3 py-8">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={M.firstPage} loading="lazy" className="max-h-64 rounded-lg border border-line" />
                ) : null}
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                  {M.openPdf}
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-muted">
                <span className="text-3xl font-semibold uppercase">{asset.originalName.split(".").pop()}</span>
                <a href={url} download={asset.originalName} className="btn-secondary btn-sm">
                  {M.downloadFile}
                </a>
              </div>
            )}
          </Panel>

          <Panel title={M.edit}>
            <form action={updateAssetAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={asset.id} />
              <Field label={M.caption} className="sm:col-span-2">
                <Textarea name="caption" defaultValue={asset.caption ?? ""} rows={2} maxLength={500} placeholder={M.captionPlaceholder} />
              </Field>
              <Field label={M.kind}>
                <Select name="kind" defaultValue={asset.kind}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {labelFor(t, "assetKinds", k)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={M.project}>
                <Select name="projectId" defaultValue={asset.projectId ?? ""}>
                  <option value="">{M.unassignedSelect}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} {p.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.common.tags} hint={t.crm.form.tagsHint} className="sm:col-span-2">
                <Input name="tags" defaultValue={tags.join(", ")} placeholder="խոհանոց, 4k, երեկո" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-fg-2 sm:col-span-2">
                <input type="checkbox" name="isPublic" defaultChecked={asset.isPublic} className="h-4 w-4 rounded border-line-strong accent-[var(--accent)]" />
                {M.isPublic}
              </label>
              <FormActions className="sm:col-span-2">
                <Button type="submit">{M.save}</Button>
              </FormActions>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={M.metadata}>
            <KV label={M.originalName}>{asset.originalName}</KV>
            <KV label={M.storedAs}>{asset.fileName}</KV>
            <KV label={M.path}>{asset.relPath}</KV>
            <KV label={M.mime}>{asset.mime}</KV>
            <KV label={M.size}>{formatBytes(asset.sizeBytes)}</KV>
            <KV label={M.dimensions}>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"}</KV>
            <KV label={M.duration}>{asset.durationSec ? formatDuration(asset.durationSec) : "—"}</KV>
            <KV label={M.sortOrder}>{asset.sortOrder}</KV>
            <KV label={M.visibility}>{asset.isPublic ? <Badge tone="success">{M.publicShort}</Badge> : <Badge tone="neutral">{M.privateShort}</Badge>}</KV>
            <KV label={M.project}>
              {project ? (
                <Link href={`/admin/projects/${project.id}`} className="text-accent">
                  {project.code} {project.title}
                </Link>
              ) : (
                "—"
              )}
            </KV>
            <KV label={M.roles}>
              {roles.length ? (
                <span className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <Badge key={r} tone="dark">
                      {r}
                    </Badge>
                  ))}
                </span>
              ) : (
                "—"
              )}
            </KV>
            <KV label={M.uploadedAt}>{formatDate(asset.createdAt, true)}</KV>
          </Panel>

          <Panel title={M.danger}>
            <form action={deleteAssetAction}>
              <input type="hidden" name="id" value={asset.id} />
              <input type="hidden" name="returnTo" value="/admin/media" />
              <ConfirmButton message={M.deleteConfirm(asset.originalName)} className="btn-ghost btn-sm text-danger">
                {M.delete}
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
