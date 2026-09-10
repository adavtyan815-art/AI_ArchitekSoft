import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { formatDuration, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { cn, formatBytes } from "@/lib/utils";
import { Input } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteAssetAction, moveAssetAction, toggleAssetPublicAction, updateAssetCaptionAction } from "@/app/admin/actions/media-actions";
import { setProjectAssetRoleAction } from "@/app/admin/actions/project-actions";
import type { Asset, Project } from "@/lib/db/schema";

const ROLES = [
  { key: "cover", label: "Cover", col: "coverAssetId" },
  { key: "sketch", label: "Sketch", col: "sketchAssetId" },
  { key: "pdf", label: "PDF", col: "pdfAssetId" },
  { key: "ar_glb", label: "AR GLB", col: "arGlbAssetId" },
  { key: "ar_usdz", label: "AR USDZ", col: "arUsdzAssetId" },
] as const;

/** Project media tab: thumbnails, role assignment, caption, ordering, visibility, delete. Server component. */
export function ProjectMediaGrid({ project, assets }: { project: Project; assets: Asset[] }) {
  if (assets.length === 0) return <div className="text-sm text-ink-500">No files yet — upload renders, videos, PDFs or 3D models above.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((a, i) => {
        const thumb = thumbUrlFor(a);
        const url = mediaUrl(a.relPath);
        return (
          <div key={a.id} className="card overflow-hidden">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-ink-100">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={a.caption ?? a.originalName} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center text-sm font-semibold uppercase text-ink-500">{a.originalName.split(".").pop()}</div>
              )}
            </a>
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                <span className="truncate" title={a.originalName}>
                  {a.originalName}
                </span>
                <span className="whitespace-nowrap">
                  {a.kind}
                  {a.durationSec ? ` · ${formatDuration(a.durationSec)}` : ""} · {formatBytes(a.sizeBytes)}
                </span>
              </div>

              <form action={updateAssetCaptionAction} className="flex gap-1">
                <input type="hidden" name="id" value={a.id} />
                <Input name="caption" defaultValue={a.caption ?? ""} placeholder="Caption" className="py-1 text-xs" maxLength={500} />
                <button type="submit" className="btn-secondary btn-sm">
                  Save
                </button>
              </form>

              <div className="flex flex-wrap gap-1">
                {ROLES.map((r) => {
                  const active = project[r.col] === a.id;
                  return (
                    <form key={r.key} action={setProjectAssetRoleAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="assetId" value={a.id} />
                      <input type="hidden" name="role" value={r.key} />
                      <button type="submit" className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", active ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200 text-ink-600 hover:border-ink-400")} title={active ? `Clear ${r.label}` : `Set as ${r.label}`}>
                        {r.label}
                      </button>
                    </form>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <form action={moveAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={i === 0} className="btn-ghost btn-sm disabled:opacity-30" title="Move up">
                    <ArrowUp size={14} />
                  </button>
                </form>
                <form action={moveAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={i === assets.length - 1} className="btn-ghost btn-sm disabled:opacity-30" title="Move down">
                    <ArrowDown size={14} />
                  </button>
                </form>
                <form action={toggleAssetPublicAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={cn("btn-ghost btn-sm", a.isPublic && "text-success-500")} title={a.isPublic ? "Public — click to hide" : "Private — click to publish"}>
                    {a.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </form>
                <span className="flex-1" />
                <form action={deleteAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={`Delete ${a.originalName}? The file is removed from disk.`} className="btn-ghost btn-sm text-danger-500" title="Delete">
                    <Trash2 size={14} />
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
