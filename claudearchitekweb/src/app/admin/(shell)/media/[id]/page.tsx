import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { formatDuration, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { formatBytes, formatDate, parseJson } from "@/lib/utils";
import { KV, PageHeader, Panel } from "@/components/admin/shell";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteAssetAction, updateAssetAction } from "@/app/admin/actions/media-actions";

export const dynamic = "force-dynamic";

const KINDS = ["render", "video", "sketch", "pdf", "model_glb", "model_usdz", "poster", "client_upload", "other"] as const;

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const asset = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!asset) notFound();
  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title }).from(schema.projects).orderBy(desc(schema.projects.createdAt)).all();
  const project = asset.projectId ? projects.find((p) => p.id === asset.projectId) : null;
  const url = mediaUrl(asset.relPath);
  const thumb = thumbUrlFor(asset);
  const tags = parseJson<string[]>(asset.tags, []);
  const isImage = asset.mime.startsWith("image/");
  const isVideo = asset.mime.startsWith("video/");
  const isPdf = asset.mime === "application/pdf";

  const roles: string[] = [];
  if (project) {
    const p = db.select().from(schema.projects).where(eq(schema.projects.id, project.id)).get();
    if (p) {
      if (p.coverAssetId === asset.id) roles.push("cover");
      if (p.sketchAssetId === asset.id) roles.push("sketch");
      if (p.pdfAssetId === asset.id) roles.push("pdf");
      if (p.arGlbAssetId === asset.id) roles.push("AR GLB");
      if (p.arUsdzAssetId === asset.id) roles.push("AR USDZ");
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Media", href: "/admin/media" }, { label: asset.originalName }]}
        title={asset.caption || asset.originalName}
        subtitle={`${asset.kind} · ${asset.mime} · ${formatBytes(asset.sizeBytes)} · uploaded ${formatDate(asset.createdAt, true)}`}
        actions={
          <>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              <ExternalLink size={14} /> Open
            </a>
            <a href={url} download={asset.originalName} className="btn-secondary btn-sm">
              <Download size={14} /> Download
            </a>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Preview">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={asset.caption ?? asset.originalName} className="mx-auto max-h-[60vh] w-auto rounded-xl" />
            ) : isVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={url} poster={thumb ?? undefined} controls className="mx-auto max-h-[60vh] w-full rounded-xl bg-black" />
            ) : isPdf ? (
              <div className="flex flex-col items-center gap-3 py-8">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="First page" className="max-h-64 rounded-lg border border-line" />
                ) : null}
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                  Open PDF
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-ink-500">
                <span className="text-3xl font-semibold uppercase">{asset.originalName.split(".").pop()}</span>
                <a href={url} download={asset.originalName} className="btn-secondary btn-sm">
                  Download file
                </a>
              </div>
            )}
          </Panel>

          <Panel title="Edit">
            <form action={updateAssetAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={asset.id} />
              <Field label="Caption" className="sm:col-span-2">
                <Textarea name="caption" defaultValue={asset.caption ?? ""} rows={2} maxLength={500} placeholder="Shown on the client page and portfolio" />
              </Field>
              <Field label="Kind">
                <Select name="kind" defaultValue={asset.kind}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Project">
                <Select name="projectId" defaultValue={asset.projectId ?? ""}>
                  <option value="">— unassigned —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} {p.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tags" hint="Comma separated" className="sm:col-span-2">
                <Input name="tags" defaultValue={tags.join(", ")} placeholder="kitchen, 4k, night" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink-800 sm:col-span-2">
                <input type="checkbox" name="isPublic" defaultChecked={asset.isPublic} className="h-4 w-4 rounded border-ink-300" />
                Public — may appear on the website / portfolio
              </label>
              <div className="sm:col-span-2">
                <Button type="submit">Save file</Button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Metadata">
            <KV label="Original name">{asset.originalName}</KV>
            <KV label="Stored as">{asset.fileName}</KV>
            <KV label="Path">{asset.relPath}</KV>
            <KV label="MIME">{asset.mime}</KV>
            <KV label="Size">{formatBytes(asset.sizeBytes)}</KV>
            <KV label="Dimensions">{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"}</KV>
            <KV label="Duration">{asset.durationSec ? formatDuration(asset.durationSec) : "—"}</KV>
            <KV label="Sort order">{asset.sortOrder}</KV>
            <KV label="Visibility">{asset.isPublic ? <Badge tone="success">public</Badge> : <Badge tone="neutral">private</Badge>}</KV>
            <KV label="Project">{project ? <Link href={`/admin/projects/${project.id}`} className="text-brand-600">{project.code} {project.title}</Link> : "—"}</KV>
            <KV label="Roles">{roles.length ? <span className="flex flex-wrap gap-1">{roles.map((r) => <Badge key={r} tone="dark">{r}</Badge>)}</span> : "—"}</KV>
            <KV label="Uploaded">{formatDate(asset.createdAt, true)}</KV>
          </Panel>

          <Panel title="Danger zone">
            <form action={deleteAssetAction}>
              <input type="hidden" name="id" value={asset.id} />
              <input type="hidden" name="returnTo" value="/admin/media" />
              <ConfirmButton message={`Delete ${asset.originalName}? The file is removed from disk.`} className="btn-ghost btn-sm text-danger-500">
                Delete file
              </ConfirmButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
