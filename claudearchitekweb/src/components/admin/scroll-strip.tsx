"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal strip that keeps its own scrollbar instead of widening the page.
 *
 * Two things a plain `overflow-x-auto` div does not do:
 *  - it brings the active item (`[aria-current="page"]`) into view on mount, so on a phone the
 *    user can see which tab they are on even when the strip is wider than the viewport;
 *  - it fades the edge that still has content, so the strip reads as scrollable instead of
 *    looking like a row that happens to be cut off.
 *
 * The caller supplies the width rule (`w-full` inside a flex row, nothing for a block strip);
 * `min-w-0` is always set so the strip can never push its parent wider than the viewport.
 */
export function ScrollStrip({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<"none" | "start" | "end" | "both">("none");

  const measure = useCallback(() => {
    const n = box.current;
    if (!n) return;
    const max = n.scrollWidth - n.clientWidth;
    if (max <= 1) {
      setEdge("none");
      return;
    }
    const atStart = n.scrollLeft <= 1;
    const atEnd = n.scrollLeft >= max - 1;
    setEdge(atStart ? "end" : atEnd ? "start" : "both");
  }, []);

  useEffect(() => {
    const n = box.current;
    if (!n) return;
    // Scroll the active item into view without touching the page scroll (scrollIntoView would
    // also scroll every ancestor, including the window).
    const active = n.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const a = active.getBoundingClientRect();
      const c = n.getBoundingClientRect();
      n.scrollLeft += a.left - c.left - (c.width - a.width) / 2;
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(n);
    if (n.firstElementChild) ro.observe(n.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={box}
      onScroll={measure}
      className={cn(
        "min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        edge === "end" && "[mask-image:linear-gradient(to_right,#000_calc(100%_-_28px),transparent)]",
        edge === "start" && "[mask-image:linear-gradient(to_left,#000_calc(100%_-_28px),transparent)]",
        edge === "both" && "[mask-image:linear-gradient(to_right,transparent,#000_28px,#000_calc(100%_-_28px),transparent)]",
        className
      )}
    >
      {children}
    </div>
  );
}
