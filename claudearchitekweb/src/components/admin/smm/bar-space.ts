"use client";

import { useEffect } from "react";

/**
 * Below `lg` the composer and the post editor pin their action bar above the phone tab bar. The bar is
 * fixed, so on its own it covers whatever the page renders last — and the side panels (Telegram approval,
 * summary) are rendered by the page around these components, not inside them. This gives the page's
 * <main> enough bottom padding for the bar plus the tab bar while such a bar is mounted, and restores the
 * layout's own padding on unmount. Desktop keeps the class-based padding (the bar is static there).
 */
export function useStickyBarSpace(staticFrom = "(min-width: 1024px)") {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    const wide = window.matchMedia(staticFrom);
    const apply = () => {
      main.style.paddingBottom = wide.matches ? "" : "calc(8.5rem + max(0.75rem, env(safe-area-inset-bottom)))";
    };
    apply();
    wide.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      main.style.paddingBottom = "";
    };
  }, [staticFrom]);
}

/**
 * Bottom offset that puts a fixed bar exactly on top of the phone tab bar: the bar's own content height
 * (59px) plus the safe-area padding the tab bar reserves (`.pb-safe`, min 0.75rem).
 */
export const ABOVE_TAB_BAR = "calc(59px + max(0.75rem, env(safe-area-inset-bottom)))";
