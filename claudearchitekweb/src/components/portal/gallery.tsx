"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FocusSentinel, focusEdge, useDialogFocus } from "./use-dialog-focus";

export type GalleryImage = { src: string; thumb: string; srcSet?: string | null; thumbSrcSet?: string | null; caption?: string | null; width?: number | null; height?: number | null };

export type GalleryLabels = { close: string; prev: string; next: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** A horizontal drag this long (px), and clearly more horizontal than vertical, is a swipe. */
const SWIPE_MIN = 40;

/** Editorial plate grid (first image large) with a dark stage lightbox. */
export function Gallery({ images, title, labels }: { images: GalleryImage[]; title?: string; labels?: GalleryLabels }) {
  const l = labels ?? { close: "Close", prev: "Previous", next: "Next" };
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;
  const isOpen = open !== null;

  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  /** The plate that opened the lightbox, then the one last shown: focus returns there on close. */
  const lastShown = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);

  const prev = useCallback(() => setOpen((i) => (i === null ? null : (i - 1 + count) % count)), [count]);
  const next = useCallback(() => setOpen((i) => (i === null ? null : (i + 1) % count)), [count]);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (open !== null) lastShown.current = open;
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, prev, next, close]);

  // Focus goes to the close button and returns to the plate the visitor came from (or last looked at).
  useDialogFocus(isOpen, closeRef, () => (lastShown.current === null ? null : (thumbs.current[lastShown.current] ?? null)));

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

  function onTouchStart(e: React.TouchEvent) {
    // two fingers = pinch zoom, not a swipe
    touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    const end = e.changedTouches[0];
    if (!start || !end || count < 2) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swipedAt.current = Date.now();
    if (dx < 0) next();
    else prev();
  }
  /** Tapping the dark area closes the lightbox, but the tap that ends a swipe must not. */
  function onBackdropClick() {
    if (Date.now() - swipedAt.current < 400) return;
    close();
  }

  return (
    <>
      <div className={cn("grid gap-x-4 gap-y-6 sm:gap-x-5", count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {images.map((im, i) => {
          // A large opening plate only pays off when there are others to sit under it.
          const wide = count > 2 && i === 0;
          return (
            <button
              key={im.src}
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              onClick={() => setOpen(i)}
              aria-haspopup="dialog"
              className={cn("group block min-w-0 text-left", wide && "col-span-2 sm:col-span-3")}
              aria-label={im.caption || `${title ?? "Image"} ${i + 1}`}
            >
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
        <div ref={dialogRef} className="stage fixed inset-0 z-50 flex flex-col outline-none" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={onBackdropClick}>
          <FocusSentinel onFocus={() => focusEdge(dialogRef.current, "last")} />
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <span className="caption flex min-w-0 items-baseline text-fg tabular-nums" aria-live="polite">
              <span className="flex-none text-accent">{pad((open ?? 0) + 1)}</span>
              <span className="mx-1.5 flex-none text-faint">/</span>
              <span className="flex-none">{pad(count)}</span>
              {current.caption ? <span className="ml-4 min-w-0 truncate text-muted">{current.caption}</span> : null}
            </span>
            <button ref={closeRef} type="button" onClick={close} className={cn(stageBtn, "flex-none")} aria-label={l.close}>
              <X size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 touch-pan-y touch-pinch-zoom items-center justify-center px-3 py-5 sm:px-20" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} srcSet={current.srcSet ?? undefined} sizes="100vw" alt={current.caption ?? ""} draggable={false} className="max-h-full max-w-full rounded-md object-contain select-none" style={{ filter: "none" }} onClick={(e) => e.stopPropagation()} />
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
          <FocusSentinel onFocus={() => focusEdge(dialogRef.current, "first")} />
        </div>
      ) : null}
    </>
  );
}
