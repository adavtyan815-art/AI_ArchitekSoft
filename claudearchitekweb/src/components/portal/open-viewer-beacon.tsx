"use client";

import { useEffect } from "react";
import { portalEvent } from "./beacon";

/** A reload or a back/forward within this window is the same viewing, not a new one. */
const WINDOW_MS = 30 * 60_000;
const fired = new Set<string>();

/**
 * The one recorder of "open_viewer" for our own /v route. It runs in the browser,
 * so link-preview robots that only fetch the HTML are not counted, and it remembers
 * the opening per tab, so reloading the viewer does not inflate the numbers.
 * (The /p page reports the click itself only for an externally hosted viewer.)
 */
export function OpenViewerBeacon({ slug, token, model }: { slug: string; token: string; model: boolean }) {
  useEffect(() => {
    const key = `at_open_viewer:${slug}`;
    if (fired.has(key)) return;
    try {
      const last = Number(window.sessionStorage.getItem(key));
      if (last && Date.now() - last < WINDOW_MS) {
        fired.add(key);
        return;
      }
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* storage blocked: the in-memory guard above still prevents a double send */
    }
    fired.add(key);
    portalEvent(slug, token, "open_viewer", { via: "web_viewer", model });
  }, [slug, token, model]);
  return null;
}
