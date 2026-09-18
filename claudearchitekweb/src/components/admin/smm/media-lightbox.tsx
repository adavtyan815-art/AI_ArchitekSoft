"use client";

/**
 * Fullscreen viewer for the post editor's media strip: click a thumbnail, see the full-resolution
 * file, arrow through the rest with the on-screen buttons or the keyboard, Escape or a backdrop click
 * closes it. Same z-50/backdrop-click/Escape shape as the site's own lightbox (src/components/site/lightbox.tsx)
 * and the admin mobile-sheet dialog, minus full Tab focus-trapping — this is an internal editor tool,
 * not public-facing, so a lighter dialog is a reasonable simplification.
 */
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxItem = { id: string; name: string; url: string; mime: string };

export function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  labels,
}: {
  items: LightboxItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  labels: { close: string; prev: string; next: string };
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const n = items.length;
  const clamp = (i: number) => ((i % n) + n) % n;
  const go = (delta: number) => onIndexChange(clamp(index + delta));

  // Body scroll lock: once, for the lifetime of the dialog.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard nav: re-bound whenever the index changes, so ArrowLeft/Right always clamp from the
  // current position rather than a stale closure.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, n]);

  if (!n) return null;
  const shown = items[clamp(index)];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={shown.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-bg/92 p-4"
      onClick={onClose}
    >
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-inverse-fg/10 text-inverse-fg hover:bg-inverse-fg/20"
      >
        <X size={20} aria-hidden />
      </button>

      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label={labels.prev}
            className="absolute top-1/2 left-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-fg/10 text-inverse-fg hover:bg-inverse-fg/20 sm:left-4"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label={labels.next}
            className="absolute top-1/2 right-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-fg/10 text-inverse-fg hover:bg-inverse-fg/20 sm:right-4"
          >
            <ChevronRight size={22} aria-hidden />
          </button>
          <span aria-hidden className="num absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-inverse-fg/10 px-3 py-1.5 text-[12px] font-semibold text-inverse-fg">
            {clamp(index) + 1} / {n}
          </span>
        </>
      ) : null}

      <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {shown.mime.startsWith("video/") ? (
          <video key={shown.id} src={shown.url} controls autoPlay playsInline className="max-h-[85vh] max-w-[90vw] rounded-sm object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={shown.id} src={shown.url} alt={shown.name} className="max-h-[85vh] max-w-[90vw] rounded-sm object-contain" />
        )}
      </div>
      <span className="sr-only" aria-live="polite">{shown.name}, {clamp(index) + 1} / {n}</span>
    </div>
  );
}
