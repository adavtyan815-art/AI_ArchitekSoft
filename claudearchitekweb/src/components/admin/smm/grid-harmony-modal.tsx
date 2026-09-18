"use client";

/**
 * "📱 Instagram 3×3 Grid": a read-only check, not an editing tool — this post's own cover (top-left,
 * as it would land if published right now) next to the last 8 posts near going out, in a phone-framed
 * grid, so the operator can catch two similarly-toned covers landing next to each other before either
 * one is actually live. Data is fetched on open via `gridHarmonyAction`, not preloaded on every editor
 * page load. Same z-50/backdrop-click/Escape dialog shape as MediaLightbox.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { gridHarmonyAction } from "@/app/admin/actions/smm-actions";

export type GridHarmonyLabels = {
  gridHarmonyTitle: string;
  gridHarmonyHint: string;
  gridHarmonyEmpty: string;
  gridHarmonyNew: string;
  gridHarmonyLoading: string;
  lightboxClose: string;
};

type Neighbor = { id: string; title: string; status: string; coverUrl: string };

export function GridHarmonyModal({ postId, labels, onClose }: { postId: string; labels: GridHarmonyLabels; onClose: () => void }) {
  const L = labels;
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<{ coverUrl: string } | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    gridHarmonyAction({ id: postId }).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setCurrent(r.current);
        setNeighbors(r.neighbors);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const tiles: { coverUrl: string; isCurrent: boolean }[] = current ? [{ coverUrl: current.coverUrl, isCurrent: true }, ...neighbors.map((n) => ({ coverUrl: n.coverUrl, isCurrent: false }))] : [];
  while (tiles.length < 9 && tiles.length > 0) tiles.push({ coverUrl: "", isCurrent: false });

  return (
    <div role="dialog" aria-modal="true" aria-label={L.gridHarmonyTitle} className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-bg/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-md border border-line bg-surface shadow-lift" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-[1.05rem] leading-tight font-medium tracking-[-0.01em] text-fg">{L.gridHarmonyTitle}</h2>
          <button ref={closeBtnRef} type="button" onClick={onClose} aria-label={L.lightboxClose} className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-fg">
            <X size={16} aria-hidden />
          </button>
        </header>
        <div className="p-4">
          <p className="mb-4 text-xs text-muted">{L.gridHarmonyHint}</p>
          {loading ? (
            <p className="py-10 text-center text-xs text-muted">{L.gridHarmonyLoading}</p>
          ) : tiles.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">{L.gridHarmonyEmpty}</p>
          ) : (
            <div className="mx-auto w-[280px] rounded-[26px] border-[3px] border-fg/70 bg-black p-2 shadow-lift">
              <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-sm bg-black">
                {tiles.map((t, i) => (
                  <div key={i} className="relative aspect-square bg-surface-2">
                    {t.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : null}
                    {t.isCurrent ? (
                      <span className="absolute top-1 left-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-accent-fg uppercase">{L.gridHarmonyNew}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
