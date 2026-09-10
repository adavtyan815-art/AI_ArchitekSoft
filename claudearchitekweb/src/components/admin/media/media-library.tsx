"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Film, Box, File as FileIcon } from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";

export type MediaCard = {
  id: string;
  kind: string;
  originalName: string;
  caption: string | null;
  thumbUrl: string | null;
  url: string;
  sizeBytes: number;
  createdAt: string;
  durationLabel: string;
  isPublic: boolean;
  projectId: string | null;
  projectLabel: string | null;
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
  assignAction,
  deleteAction,
}: {
  assets: MediaCard[];
  projects: { id: string; label: string }[];
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
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : assets.map((a) => a.id))} className="h-4 w-4 rounded border-ink-300" />
          {selected.length ? `${selected.length} selected` : "Select all"}
        </label>
        <span className="flex-1" />
        {selected.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <select name="projectId" className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm" defaultValue="" disabled={!selected.length}>
          <option value="">— unassign —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" formAction={assignAction} disabled={!selected.length} className="btn-secondary btn-sm disabled:opacity-40">
          Assign to project
        </button>
        <button
          type="submit"
          formAction={deleteAction}
          disabled={!selected.length}
          className="btn-ghost btn-sm text-danger-500 disabled:opacity-40"
          onClick={(e) => {
            if (!window.confirm(`Delete ${selected.length} file(s) permanently?`)) e.preventDefault();
          }}
        >
          Delete selected
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((a) => {
          const on = selected.includes(a.id);
          return (
            <div key={a.id} className={cn("card overflow-hidden transition-shadow", on && "ring-2 ring-brand-500")}>
              <div className="relative">
                <button type="button" onClick={() => toggle(a.id)} className="block w-full bg-ink-100 text-left" aria-pressed={on}>
                  {a.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbUrl} alt={a.caption ?? a.originalName} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 text-ink-500">
                      <KindIcon kind={a.kind} />
                      <span className="text-[11px] font-semibold uppercase">{a.originalName.split(".").pop()}</span>
                    </div>
                  )}
                </button>
                <span className="absolute left-2 top-2">
                  <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="h-4 w-4 rounded border-ink-300 bg-white" aria-label={`Select ${a.originalName}`} />
                </span>
                {a.durationLabel ? <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{a.durationLabel}</span> : null}
                {a.isPublic ? <span className="absolute right-2 top-2 rounded bg-green-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">public</span> : null}
              </div>
              <div className="space-y-0.5 p-2.5">
                <Link href={`/admin/media/${a.id}`} className="block truncate text-xs font-medium text-ink-900 hover:text-brand-600" title={a.originalName}>
                  {a.caption || a.originalName}
                </Link>
                <div className="truncate text-[11px] text-ink-500">
                  {a.kind} · {formatBytes(a.sizeBytes)} · {formatDate(a.createdAt)}
                </div>
                <div className="truncate text-[11px] text-ink-500">
                  {a.projectId && a.projectLabel ? (
                    <Link href={`/admin/projects/${a.projectId}`} className="hover:text-brand-600">
                      {a.projectLabel}
                    </Link>
                  ) : (
                    <span className="text-ink-400">unassigned</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}
