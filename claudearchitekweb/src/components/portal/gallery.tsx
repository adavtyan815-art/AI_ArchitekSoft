"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryImage = { src: string; thumb: string; caption?: string | null; width?: number | null; height?: number | null };

export function Gallery({ images, title }: { images: GalleryImage[]; title?: string }) {
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
            className={`group relative block overflow-hidden rounded-2xl border border-line bg-ink-100 text-left shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${count === 1 ? "aspect-[16/10]" : i === 0 && count >= 3 ? "col-span-2 aspect-[16/10] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]"}`}
            aria-label={im.caption || `${title ?? "Image"} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i === 0 ? im.src : im.thumb} alt={im.caption ?? ""} loading={i < 3 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            {im.caption ? <span className="absolute right-2 bottom-2 left-2 truncate rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">{im.caption}</span> : null}
          </button>
        ))}
      </div>

      {current ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 text-white" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 text-sm text-white/80">
              <span className="font-medium text-white">
                {(open ?? 0) + 1} / {count}
              </span>
              {current.caption ? <span className="ml-3 truncate">{current.caption}</span> : null}
            </div>
            <button type="button" onClick={() => setOpen(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-2 pb-4 sm:px-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.caption ?? ""} className="max-h-full max-w-full rounded-xl object-contain shadow-card" onClick={(e) => e.stopPropagation()} />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute top-1/2 left-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4"
                  aria-label="Previous"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute top-1/2 right-2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4"
                  aria-label="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
