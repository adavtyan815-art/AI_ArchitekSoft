"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Film, Box, File as FileIcon } from "lucide-react";
import { Notice } from "@/components/admin/notice";
import { cn, formatBytes, formatDate } from "@/lib/utils";

export type MediaCard = {
  id: string;
  kind: string;
  kindLabel: string;
  originalName: string;
  caption: string | null;
  thumbUrl: string | null;
  thumbSrcSet?: string;
  url: string;
  sizeBytes: number;
  createdAt: string;
  durationLabel: string;
  isPublic: boolean;
  projectId: string | null;
  projectLabel: string | null;
};

export type MediaLibraryLabels = {
  selectAll: string;
  /** Template containing `{n}`. */
  selected: string;
  unassignOption: string;
  assign: string;
  deleteSelected: string;
  /** Template containing `{n}`. */
  deleteConfirm: string;
  publicShort: string;
  noProject: string;
  /** Confirmation after a bulk assign, containing `{n}`. */
  assignedNotice?: string;
  /** Confirmation after a bulk unassign, containing `{n}`. */
  unassignedNotice?: string;
  /** Confirmation after a bulk delete, containing `{n}`. */
  deletedNotice?: string;
};

function KindIcon({ kind }: { kind: string }) {
  if (kind === "pdf") return <FileText size={22} />;
  if (kind === "video") return <Film size={22} />;
  if (kind === "model_glb" || kind === "model_usdz") return <Box size={22} />;
  return <FileIcon size={22} />;
}

/**
 * Media library grid with multi-select: assign the selection to a project, or delete it.
 *
 * The bulk actions run through a transition rather than a plain form submit so the component can
 * clear the selection once the server has answered. Submitting natively left the old ids selected
 * and reset the project dropdown to "— unassign —", so a second click on "Assign to project"
 * silently unassigned everything, and a second "Delete selected" pointed at rows that were gone.
 */
export function MediaLibrary({
  assets,
  projects,
  labels,
  assignAction,
  deleteAction,
}: {
  assets: MediaCard[];
  projects: { id: string; label: string }[];
  labels: MediaLibraryLabels;
  assignAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allSelected = assets.length > 0 && selected.length === assets.length;
  const busy = pending || !selected.length;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function run(action: (fd: FormData) => Promise<void>, template?: string) {
    const ids = selected;
    if (!ids.length) return;
    const fd = new FormData();
    for (const id of ids) fd.append("ids", id);
    fd.append("projectId", projectId);
    setNotice(null);
    start(async () => {
      await action(fd);
      setSelected([]);
      if (template) setNotice(template.replace("{n}", String(ids.length)));
    });
  }

  return (
    <div>
      {notice ? <Notice text={notice} tone="ok" /> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-line py-2">
        <label className="flex min-h-10 items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-fg-2 uppercase">
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : assets.map((a) => a.id))} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
          {selected.length ? labels.selected.replace("{n}", String(selected.length)) : labels.selectAll}
        </label>
        <span className="hidden flex-1 sm:block" />
        <select
          name="projectId"
          aria-label={labels.assign}
          className="input h-11 w-full text-[13.5px] sm:h-9 sm:w-56"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!selected.length}
        >
          <option value="">{labels.unassignOption}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => run(assignAction, projectId ? labels.assignedNotice : labels.unassignedNotice)} disabled={busy} className="btn-secondary btn-sm disabled:opacity-40">
          {labels.assign}
        </button>
        <button
          type="button"
          disabled={busy}
          className="btn-ghost btn-sm text-danger disabled:opacity-40"
          onClick={() => {
            if (!window.confirm(labels.deleteConfirm.replace("{n}", String(selected.length)))) return;
            run(deleteAction, labels.deletedNotice);
          }}
        >
          {labels.deleteSelected}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((a) => {
          const on = selected.includes(a.id);
          return (
            <figure key={a.id} className={cn("frame bg-surface", on ? "border-fg" : "hover:border-line-strong")}>
              <div className="relative">
                <button type="button" onClick={() => toggle(a.id)} className="block w-full bg-surface-2 text-left" aria-pressed={on}>
                  {a.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbUrl} srcSet={a.thumbSrcSet} sizes="(max-width: 640px) 45vw, 220px" loading="lazy" alt={a.caption ?? a.originalName} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 text-muted">
                      <KindIcon kind={a.kind} />
                      <span className="font-mono text-[10px] tracking-[0.1em] uppercase">{a.originalName.split(".").pop()}</span>
                    </div>
                  )}
                </button>
                {/* A 40px hit area around the 16px box — the checkbox itself is far below the tap
                    minimum, and a <label> makes the whole square tappable. */}
                <label className="absolute top-0 left-0 flex h-10 w-10 cursor-pointer items-center justify-center">
                  <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="h-4 w-4 rounded-none border-line-strong bg-surface accent-[var(--accent)]" aria-label={a.originalName} />
                </label>
                {a.durationLabel ? <span className="absolute right-2 bottom-2 rounded-sm bg-[#17150f]/75 px-1.5 py-0.5 font-mono text-[10px] text-[#f4f2ed]">{a.durationLabel}</span> : null}
                {a.isPublic ? <span className="absolute top-2 right-2 rounded-sm border border-success/40 bg-success-soft px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-success uppercase">{labels.publicShort}</span> : null}
              </div>
              <figcaption className="space-y-1 border-t border-line px-2.5 py-2">
                <Link href={`/admin/media/${a.id}`} className="flex min-h-10 items-center text-[12.5px] font-semibold text-fg transition-colors hover:text-accent sm:min-h-0 sm:py-0.5" title={a.originalName}>
                  <span className="truncate">{a.caption || a.originalName}</span>
                </Link>
                <div className="caption truncate">
                  {a.kindLabel} · {formatBytes(a.sizeBytes)} · {formatDate(a.createdAt)}
                </div>
                <div className="caption">
                  {a.projectId && a.projectLabel ? (
                    <Link href={`/admin/projects/${a.projectId}`} className="flex min-h-10 items-center transition-colors hover:text-accent sm:min-h-0">
                      <span className="truncate">{a.projectLabel}</span>
                    </Link>
                  ) : (
                    <span className="flex min-h-10 items-center truncate text-faint sm:min-h-0">{labels.noProject}</span>
                  )}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
