"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sketch → 3D comparison slider. Mono labels, hairline handle, no pills.
 *
 * Tracking: the divider follows the pointer 1:1. Pointer events do not go through React state — every
 * move (including coalesced events, so no position is lost) writes the position to a ref and one
 * requestAnimationFrame applies it straight to the DOM: a `clip-path` on the "before" layer and a
 * transform on the handle. Nothing re-lays out the images, so the main thread stays free and the
 * browser keeps delivering moves at full rate. React state only carries the value for the
 * accessibility attributes and is updated when the drag ends or a key is pressed.
 *
 * Touch: the grip strip around the divider has `touch-action: none`, so dragging it never turns into
 * a page scroll; the rest of the image keeps `pan-y`, so the page still scrolls when the finger lands
 * elsewhere (a tap there still moves the divider). Keyboard: ← → 1 unit, Shift ×10, Home/End.
 */
export function BeforeAfter({ before, after, labels = ["Before", "After"], aspect = "aspect-[16/10]", ariaLabel, labelsAt = "top" }: { before: string; after: string; labels?: [string, string]; aspect?: string; ariaLabel?: string; labelsAt?: "top" | "bottom" }) {
  const INITIAL = 55;
  const [announced, setAnnounced] = useState(INITIAL);
  const root = useRef<HTMLDivElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  const pos = useRef(INITIAL);
  const dragging = useRef(false);
  const raf = useRef(0);

  /** Paint the current position: clip-path + transforms only (no layout of the images). */
  const paint = useCallback(() => {
    raf.current = 0;
    const p = pos.current;
    if (clip.current) clip.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    if (handle.current) handle.current.style.left = `${p}%`;
    if (grip.current) grip.current.style.left = `${p}%`;
  }, []);
  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(paint);
  }, [paint]);
  const setFromX = useCallback(
    (clientX: number) => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      pos.current = Math.max(1, Math.min(99, ((clientX - r.left) / r.width) * 100));
      schedule();
    },
    [schedule],
  );
  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(raf.current);
  }, [paint]);

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    // the last coalesced event is the freshest position; earlier ones would only be repainted over
    const ne = e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
    const list = ne.getCoalescedEvents?.();
    setFromX(list && list.length ? list[list.length - 1].clientX : e.clientX);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setAnnounced(Math.round(pos.current));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    let next = pos.current;
    if (e.key === "ArrowLeft") next = Math.max(1, next - step);
    else if (e.key === "ArrowRight") next = Math.min(99, next + step);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 99;
    else return;
    e.preventDefault();
    // the slider owns these keys: a carousel/stage around it must not also react to them
    e.stopPropagation();
    pos.current = next;
    schedule();
    setAnnounced(Math.round(next));
  };

  const labelY = labelsAt === "bottom" ? "bottom-3" : "top-3";
  return (
    <div
      ref={root}
      className={`relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${aspect}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="slider"
      aria-label={ariaLabel ?? `${labels[0]} / ${labels[1]}`}
      aria-valuenow={announced}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${announced}% ${labels[0]}`}
      tabIndex={0}
      onKeyDown={onKey}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={labels[1]} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div ref={clip} className="absolute inset-0 will-change-[clip-path]" style={{ clipPath: `inset(0 ${100 - INITIAL}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={labels[0]} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <div ref={handle} className="ba-handle" style={{ left: `${INITIAL}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f4f2ed]/60 bg-[#17150f]/70 text-[#f4f2ed] backdrop-blur">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </div>
      </div>
      {/* grip: a 44 px strip on the divider that owns horizontal touch gestures */}
      <div ref={grip} className="absolute top-0 bottom-0 w-11 -translate-x-1/2 touch-none" style={{ left: `${INITIAL}%` }} aria-hidden />
      <span className={`absolute ${labelY} left-3 rounded-sm bg-[#17150f]/70 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur`}>{labels[0]}</span>
      <span className={`absolute ${labelY} right-3 rounded-sm bg-[#17150f]/70 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur`}>{labels[1]}</span>
    </div>
  );
}
