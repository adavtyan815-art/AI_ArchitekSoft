"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxLabels = { close: string; prev: string; next: string };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Editorial gallery grid (first plate large, the rest 2-up) inside hairline frames
 * with mono captions, plus a dark stage overlay with a mono counter.
 * The overlay is a modal dialog: it is named, takes focus, keeps Tab inside itself, closes on Escape
 * and hands focus back to the plate that opened it.
 */
export function Lightbox({ images, alt = "", labels }: { images: string[]; alt?: string; labels?: LightboxLabels }) {
  const l = labels ?? { close: "Close", prev: "Previous", next: "Next" };
  const [idx, setIdx] = useState<number | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = idx !== null;
  const close = useCallback(() => setIdx(null), []);
  const prev = useCallback(() => setIdx((i) => (i === null ? i : (i - 1 + images.length) % images.length)), [images.length]);
  const next = useCallback(() => setIdx((i) => (i === null ? i : (i + 1) % images.length)), [images.length]);

  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Tab") {
        // focus never leaves the overlay while it is open
        const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const at = document.activeElement;
        if (!dialog.current?.contains(at)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && at === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && at === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [idx, close, prev, next]);

  // Focus returns to the plate that opened the overlay.
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      opener.current?.focus();
      opener.current = null;
    };
  }, [isOpen]);

  // Thin hairline control on the dark stage.
  const stageBtn = "inline-flex h-11 w-11 items-center justify-center rounded-md border border-line-strong text-fg transition-colors hover:border-fg hover:bg-surface-2";

  return (
    <>
      <div className={cn("grid gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {images.map((src, i) => {
          // A large opening plate only pays off when there are others to sit under it.
          const wide = i === 0 && images.length > 2;
          return (
            <button
              key={src + i}
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setIdx(i);
              }}
              className={cn("group block text-left", wide && "col-span-2")} aria-label={`${alt} ${i + 1}`}>
              <figure className="frame img-zoom">
                <div className={cn("relative bg-surface-2", wide || images.length === 1 ? "aspect-[16/10]" : "aspect-[4/3]")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${alt} ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} sizes={wide ? "100vw" : "(min-width: 640px) 50vw, 50vw"} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-line px-3 py-2 sm:px-3.5">
                  <span className="caption flex-none">
                    <span className="text-accent">{pad(i + 1)}</span>
                    <span className="mx-1.5 text-faint">/</span>
                    {pad(images.length)}
                  </span>
                  <span className={cn("caption min-w-0 truncate text-faint transition-colors group-hover:text-fg", !wide && images.length > 1 && "hidden sm:block")}>{alt}</span>
                </figcaption>
              </figure>
            </button>
          );
        })}
      </div>

      {idx !== null ? (
        <div ref={dialog} className="stage fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label={alt || l.close} onClick={close}>
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <span className="caption text-fg tabular-nums" aria-live="polite">
              <span className="text-accent">{pad(idx + 1)}</span>
              <span className="mx-2 text-faint">/</span>
              {pad(images.length)}
              {alt ? <span className="ml-4 hidden text-muted sm:inline">{alt}</span> : null}
            </span>
            <button type="button" onClick={close} className={stageBtn} aria-label={l.close} autoFocus>
              <X size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[idx]} alt={`${alt} ${idx + 1}`} className="max-h-full max-w-full rounded-md object-contain" style={{ filter: "none" }} onClick={(e) => e.stopPropagation()} />
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className={`absolute top-1/2 left-3 -translate-y-1/2 sm:left-6 ${stageBtn}`}
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
                  className={`absolute top-1/2 right-3 -translate-y-1/2 sm:right-6 ${stageBtn}`}
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
