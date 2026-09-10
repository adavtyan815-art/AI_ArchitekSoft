"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Film, Box, File as FileIcon } from "lucide-react";
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
};

function KindIcon({ kind }: { kind: string }) {
  if (kind === "pdf") return <FileText size={22} />;
  if (kind === "video") return <Film size={22} />;
  if (kind === "model_glb" || kind === "model_usdz") return <Box size={22} />;
  return <FileIcon size={22} />;
}

/** Media library grid with multi-select: assign the selection to a project, or delete it. */
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
  const allSelected = assets.length > 0 && selected.length === assets.length;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <form>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-line py-2">
        <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-fg-2 uppercase">
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : assets.map((a) => a.id))} className="h-4 w-4 rounded-none border-line-strong accent-[var(--accent)]" />
          {selected.length ? labels.selected.replace("{n}", String(selected.length)) : labels.selectAll}
        </label>
        <span className="hidden flex-1 sm:block" />
        {selected.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <select name="projectId" className="input h-9 w-full text-[13.5px] sm:w-56" defaultValue="" disabled={!selected.length}>
          <option value="">{labels.unassignOption}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" formAction={assignAction} disabled={!selected.length} className="btn-secondary btn-sm disabled:opacity-40">
          {labels.assign}
        </button>
        <button
          type="submit"
          formAction={deleteAction}
          disabled={!selected.length}
          className="btn-ghost btn-sm text-danger disabled:opacity-40"
          onClick={(e) => {
            if (!window.confirm(labels.deleteConfirm.replace("{n}", String(selected.length)))) e.preventDefault();
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
                <span className="absolute top-2 left-2">
                  <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="h-4 w-4 rounded-none border-line-strong bg-surface accent-[var(--accent)]" aria-label={a.originalName} />
                </span>
                {a.durationLabel ? <span className="absolute right-2 bottom-2 rounded-sm bg-[#17150f]/75 px-1.5 py-0.5 font-mono text-[10px] text-[#f4f2ed]">{a.durationLabel}</span> : null}
                {a.isPublic ? <span className="absolute top-2 right-2 rounded-sm border border-success/40 bg-success-soft px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-success uppercase">{labels.publicShort}</span> : null}
              </div>
              <figcaption className="space-y-1 border-t border-line px-2.5 py-2">
                <Link href={`/admin/media/${a.id}`} className="block truncate text-[12.5px] font-semibold text-fg transition-colors hover:text-accent" title={a.originalName}>
                  {a.caption || a.originalName}
                </Link>
                <div className="caption truncate">
                  {a.kindLabel} · {formatBytes(a.sizeBytes)} · {formatDate(a.createdAt)}
                </div>
                <div className="caption truncate">
                  {a.projectId && a.projectLabel ? (
                    <Link href={`/admin/projects/${a.projectId}`} className="transition-colors hover:text-accent">
                      {a.projectLabel}
                    </Link>
                  ) : (
                    <span className="text-faint">{labels.noProject}</span>
                  )}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </form>
  );
}
