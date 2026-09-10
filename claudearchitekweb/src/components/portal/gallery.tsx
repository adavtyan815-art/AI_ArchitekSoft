"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryImage = { src: string; thumb: string; srcSet?: string | null; thumbSrcSet?: string | null; caption?: string | null; width?: number | null; height?: number | null };

export type GalleryLabels = { close: string; prev: string; next: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** Editorial plate grid (first image large) with a dark stage lightbox. */
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
  const stageBtn = "inline-flex h-11 w-11 items-center justify-center rounded-md border border-line-strong text-fg transition-colors hover:border-fg hover:bg-surface-2";

  return (
    <>
      <div className={cn("grid gap-x-4 gap-y-6 sm:gap-x-5", count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {images.map((im, i) => {
          // A large opening plate only pays off when there are others to sit under it.
          const wide = count > 2 && i === 0;
          return (
            <button key={im.src} type="button" onClick={() => setOpen(i)} className={cn("group block text-left", wide && "col-span-2 sm:col-span-3")} aria-label={im.caption || `${title ?? "Image"} ${i + 1}`}>
              <figure className="frame img-zoom">
                <div className={cn("relative bg-surface-2", count === 1 ? "aspect-[16/10]" : wide ? "aspect-[16/9]" : "aspect-[4/3]")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={i === 0 ? im.src : im.thumb}
                    srcSet={(i === 0 ? im.srcSet : im.thumbSrcSet) ?? undefined}
                    sizes={wide ? "100vw" : "(min-width: 640px) 33vw, 50vw"}
                    alt={im.caption ?? ""}
                    loading={i < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
                  <span className="caption flex-none">
                    <span className="text-accent">{pad(i + 1)}</span>
                    <span className="mx-1.5 text-faint">/</span>
                    {pad(count)}
                  </span>
                  {im.caption ? <span className={cn("caption min-w-0 truncate text-fg-2", !wide && count > 1 && "hidden sm:block")}>{im.caption}</span> : null}
                </figcaption>
              </figure>
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="stage fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(null)}>
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <span className="caption min-w-0 text-fg tabular-nums">
              <span className="text-accent">{pad((open ?? 0) + 1)}</span>
              <span className="mx-1.5 text-faint">/</span>
              {pad(count)}
              {current.caption ? <span className="ml-4 truncate text-muted">{current.caption}</span> : null}
            </span>
            <button type="button" onClick={() => setOpen(null)} className={stageBtn} aria-label={l.close} autoFocus>
              <X size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-5 sm:px-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} srcSet={current.srcSet ?? undefined} sizes="100vw" alt={current.caption ?? ""} className="max-h-full max-w-full rounded-md object-contain" style={{ filter: "none" }} onClick={(e) => e.stopPropagation()} />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className={`absolute top-1/2 left-2 -translate-y-1/2 sm:left-5 ${stageBtn}`}
                  aria-label={l.prev}
                >
                  <ChevronLeft size={22} strokeWidth={1.25} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className={`absolute top-1/2 right-2 -translate-y-1/2 sm:right-5 ${stageBtn}`}
                  aria-label={l.next}
                >
                  <ChevronRight size={22} strokeWidth={1.25} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
