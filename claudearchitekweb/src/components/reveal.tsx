"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll reveal for `.reveal` / `.reveal-stagger` elements.
 *
 * Content is visible by default (nothing in CSS hides it). This component arms only the elements that
 * are below the viewport — adding `.reveal-armed` in the same tick it starts observing them — and marks
 * them `.is-in` when they enter. So if JavaScript never runs, hydrates late, or an observer never fires,
 * the page is complete; the reveal is an enhancement layered on top.
 *
 * Re-runs on every route change (client-side navigation keeps this layout mounted), and un-arms
 * everything it armed when it unmounts or the route changes, so nothing can be left hidden.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger"));
    const armed: HTMLElement[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // only what is clearly below the fold is animated; anything on screen (or above) stays as rendered
      if (r.top >= vh && !el.classList.contains("is-in")) {
        el.classList.add("reveal-armed");
        armed.push(el);
        io.observe(el);
      }
    }
    return () => {
      io.disconnect();
      for (const el of armed) el.classList.remove("reveal-armed", "is-in");
    };
  }, [pathname]);
  return null;
}
