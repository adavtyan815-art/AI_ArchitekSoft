"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Sketch → 3D comparison slider. Mono labels, hairline handle, no pills.
 * Precision: the divider follows the pointer continuously (fractional percent, no stepping).
 * Touch: the grip strip around the divider has `touch-action: none`, so dragging it never turns into a
 * page scroll; the rest of the image keeps `pan-y`, so the page still scrolls when the finger lands
 * elsewhere (a tap there still moves the divider). Keyboard: ← → move 1 unit, Shift ×10, Home/End.
 */
export function BeforeAfter({ before, after, labels = ["Before", "After"], aspect = "aspect-[16/10]", ariaLabel, labelsAt = "top" }: { before: string; after: string; labels?: [string, string]; aspect?: string; ariaLabel?: string; labelsAt?: "top" | "bottom" }) {
  const [pos, setPos] = useState(55);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    setPos(Math.max(1, Math.min(99, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    update(e.clientX);
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    update(e.clientX);
  };
  const end = (e: React.PointerEvent) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") setPos((p) => Math.max(1, p - step));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(99, p + step));
    else if (e.key === "Home") setPos(1);
    else if (e.key === "End") setPos(99);
    else return;
    e.preventDefault();
  };

  const labelY = labelsAt === "bottom" ? "bottom-3" : "top-3";
  return (
    <div
      ref={ref}
      className={`relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${aspect}`}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="slider"
      aria-label={ariaLabel ?? `${labels[0]} / ${labels[1]}`}
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(pos)}% ${labels[0]}`}
      tabIndex={0}
      onKeyDown={onKey}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={labels[1]} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={labels[0]} className="absolute inset-0 h-full w-full object-cover" style={{ width: `${10000 / pos}%`, maxWidth: "none" }} draggable={false} />
      </div>
      <div className="ba-handle" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f4f2ed]/60 bg-[#17150f]/70 text-[#f4f2ed] backdrop-blur">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </div>
      </div>
      {/* grip: a 44 px strip on the divider that owns horizontal touch gestures */}
      <div className="absolute top-0 bottom-0 w-11 -translate-x-1/2 touch-none" style={{ left: `${pos}%` }} aria-hidden />
      <span className={`absolute ${labelY} left-3 rounded-sm bg-[#17150f]/70 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur`}>{labels[0]}</span>
      <span className={`absolute ${labelY} right-3 rounded-sm bg-[#17150f]/70 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur`}>{labels[1]}</span>
    </div>
  );
}
