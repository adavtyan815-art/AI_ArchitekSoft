import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { formatDuration, thumbSrcSetFor, thumbUrlFor } from "@/lib/admin-helpers";
import { mediaUrl } from "@/lib/media";
import { getAdminDict, labelFor } from "@/lib/i18n/admin";
import { cn, formatBytes } from "@/lib/utils";
import { Input } from "@/components/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteAssetAction, moveAssetAction, toggleAssetPublicAction, updateAssetCaptionAction } from "@/app/admin/actions/media-actions";
import { setProjectAssetRoleAction } from "@/app/admin/actions/project-actions";
import type { Asset, Project } from "@/lib/db/schema";

const ROLES = [
  { key: "cover", col: "coverAssetId" },
  { key: "sketch", col: "sketchAssetId" },
  { key: "pdf", col: "pdfAssetId" },
  { key: "ar_glb", col: "arGlbAssetId" },
  { key: "ar_usdz", col: "arUsdzAssetId" },
] as const;

/** Project media tab: thumbnails, role assignment, caption, ordering, visibility, delete. Server component. */
export async function ProjectMediaGrid({ project, assets }: { project: Project; assets: Asset[] }) {
  const { t } = await getAdminDict();
  const M = t.media;
  if (assets.length === 0) return <div className="card p-6 text-center text-sm text-muted">{t.projects.noFiles}</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((a, i) => {
        const thumb = thumbUrlFor(a, 640);
        const url = mediaUrl(a.relPath);
        return (
          <div key={a.id} className="frame bg-surface">
            <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-surface-2">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} srcSet={thumbSrcSetFor(a, 320)} sizes="(max-width: 640px) 100vw, 380px" loading="lazy" alt={a.caption ?? a.originalName} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center font-mono text-[11px] tracking-[0.1em] text-muted uppercase">{a.originalName.split(".").pop()}</div>
              )}
            </a>
            <div className="space-y-2 border-t border-line p-3">
              <div className="caption flex items-center justify-between gap-2">
                <span className="truncate" title={a.originalName}>
                  {a.originalName}
                </span>
                <span className="whitespace-nowrap">
                  {labelFor(t, "assetKinds", a.kind)}
                  {a.durationSec ? ` · ${formatDuration(a.durationSec)}` : ""} · {formatBytes(a.sizeBytes)}
                </span>
              </div>

              <form action={updateAssetCaptionAction} className="flex gap-1">
                <input type="hidden" name="id" value={a.id} />
                <Input name="caption" defaultValue={a.caption ?? ""} placeholder={M.captionShort} className="h-9 text-[13px]" maxLength={500} />
                <button type="submit" className="btn-secondary btn-sm">
                  {t.common.save}
                </button>
              </form>

              <div className="flex flex-wrap gap-1">
                {ROLES.map((r) => {
                  const active = project[r.col] === a.id;
                  const label = M.roleLabels[r.key];
                  return (
                    <form key={r.key} action={setProjectAssetRoleAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="assetId" value={a.id} />
                      <input type="hidden" name="role" value={r.key} />
                      <button
                        type="submit"
                        className={cn("rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] uppercase transition-colors", active ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-line-strong")}
                        title={active ? M.clearRole(label) : M.setRole(label)}
                      >
                        {label}
                      </button>
                    </form>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <form action={moveAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={i === 0} className="btn-ghost btn-sm disabled:opacity-30" title={M.moveUp} aria-label={M.moveUp}>
                    <ArrowUp size={14} />
                  </button>
                </form>
                <form action={moveAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={i === assets.length - 1} className="btn-ghost btn-sm disabled:opacity-30" title={M.moveDown} aria-label={M.moveDown}>
                    <ArrowDown size={14} />
                  </button>
                </form>
                <form action={toggleAssetPublicAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={cn("btn-ghost btn-sm", a.isPublic && "text-success")} title={a.isPublic ? M.makePrivate : M.makePublic} aria-label={a.isPublic ? M.makePrivate : M.makePublic}>
                    {a.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </form>
                <span className="flex-1" />
                <form action={deleteAssetAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={M.deleteConfirm(a.originalName)} className="btn-ghost btn-sm text-danger" title={t.common.delete} aria-label={t.common.delete}>
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
