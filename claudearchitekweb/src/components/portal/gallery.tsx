"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryImage = { src: string; thumb: string; srcSet?: string | null; thumbSrcSet?: string | null; caption?: string | null; width?: number | null; height?: number | null };

export type GalleryLabels = { close: string; prev: string; next: string };

/** Responsive image grid with a keyboard-navigable lightbox. */
export function Gallery({ images, title, labels }: { images: GalleryImage[]; title?: string; labels?: GalleryLabels }) {
  const l = labels ?? { close: "Close", prev: "Previous", next: "Next" };
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;

  const prev = useCallback(() => setOpen((i) => (i === null ? null : (i - 1 + count) % count)), [count]);
  const next = useCallback(() => setOpen((i) => (i === null ? null : (i + 1) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
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
  }, [open, prev, next]);

  // Preload neighbours for snappy navigation.
  useEffect(() => {
    if (open === null) return;
    [images[(open + 1) % count], images[(open - 1 + count) % count]].forEach((im) => {
      if (!im) return;
      const img = new Image();
      img.src = im.src;
    });
  }, [open, images, count]);

  if (!count) return null;
  const current = open === null ? null : images[open];

  return (
    <>
      <div className={count === 1 ? "grid gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
        {images.map((im, i) => (
          <button
            key={im.src}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative block overflow-hidden rounded-2xl border border-line bg-surface-2 text-left shadow-soft transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-card ${count === 1 ? "aspect-[16/10]" : i === 0 && count >= 3 ? "col-span-2 aspect-[16/10] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]"}`}
            aria-label={im.caption || `${title ?? "Image"} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={i === 0 ? im.src : im.thumb}
              srcSet={(i === 0 ? im.srcSet : im.thumbSrcSet) ?? undefined}
              sizes={i === 0 && count >= 3 ? "(min-width: 640px) 66vw, 100vw" : "(min-width: 640px) 33vw, 50vw"}
              alt={im.caption ?? ""}
              loading={i < 3 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {im.caption ? <span className="absolute right-2 bottom-2 left-2 truncate rounded-full bg-[rgba(9,10,12,0.55)] px-3 py-1 text-xs font-medium text-[#f4f4f1] backdrop-blur">{im.caption}</span> : null}
          </button>
        ))}
      </div>

      {current ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[rgba(9,10,12,0.96)] text-[#f4f4f1]" role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 text-sm text-[#f4f4f1]/75">
              <span className="font-semibold text-[#f4f4f1] tabular-nums">
                {(open ?? 0) + 1} / {count}
              </span>
              {current.caption ? <span className="ml-3 truncate">{current.caption}</span> : null}
            </div>
            <button type="button" onClick={() => setOpen(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] transition-colors hover:bg-[rgba(255,255,255,0.22)]" aria-label={l.close} autoFocus>
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-2 pb-4 sm:px-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} srcSet={current.srcSet ?? undefined} sizes="100vw" alt={current.caption ?? ""} className="max-h-full max-w-full rounded-xl object-contain" style={{ filter: "none" }} onClick={(e) => e.stopPropagation()} />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute top-1/2 left-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] transition-colors hover:bg-[rgba(255,255,255,0.22)] sm:left-4"
                  aria-label={l.prev}
                >
                  <ChevronLeft size={24} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute top-1/2 right-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] transition-colors hover:bg-[rgba(255,255,255,0.22)] sm:right-4"
                  aria-label={l.next}
                >
                  <ChevronRight size={24} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
