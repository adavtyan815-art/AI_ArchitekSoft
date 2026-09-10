"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxLabels = { close: string; prev: string; next: string };

/** Thumbnail grid + full-screen viewer with keyboard navigation. */
export function Lightbox({ images, alt = "", labels }: { images: string[]; alt?: string; labels?: LightboxLabels }) {
  const l = labels ?? { close: "Close", prev: "Previous", next: "Next" };
  const [idx, setIdx] = useState<number | null>(null);
  const close = useCallback(() => setIdx(null), []);
  const prev = useCallback(() => setIdx((i) => (i === null ? i : (i - 1 + images.length) % images.length)), [images.length]);
  const next = useCallback(() => setIdx((i) => (i === null ? i : (i + 1) % images.length)), [images.length]);

  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [idx, close, prev, next]);

  const overlayBtn = "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#fff]/12 text-[#fff] backdrop-blur transition-colors hover:bg-[#fff]/25";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIdx(i)}
            className="group overflow-hidden rounded-2xl border border-line bg-surface-2 transition-colors hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`${alt} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${alt} ${i + 1}`} loading="lazy" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          </button>
        ))}
      </div>

      {idx !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090b]/95 p-4 sm:p-6" role="dialog" aria-modal="true" onClick={close}>
          <button type="button" onClick={close} className={`absolute top-4 right-4 z-10 ${overlayBtn}`} aria-label={l.close}>
            <X size={20} />
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className={`absolute top-1/2 left-3 z-10 -translate-y-1/2 sm:left-6 ${overlayBtn}`}
                aria-label={l.prev}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className={`absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:right-6 ${overlayBtn}`}
                aria-label={l.next}
              >
                <ChevronRight size={22} />
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[idx]} alt={`${alt} ${idx + 1}`} className="max-h-[82vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#fff]/12 px-3 py-1 text-xs font-medium text-[#fff] backdrop-blur">
            {idx + 1} / {images.length}
          </div>
        </div>
      ) : null}
    </>
  );
}
