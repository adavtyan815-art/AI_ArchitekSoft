"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Sends a cookie-free page-view beacon to our own /api/track. */
export function Track({ locale }: { locale: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const utm = { source: search.get("utm_source") ?? undefined, medium: search.get("utm_medium") ?? undefined, campaign: search.get("utm_campaign") ?? undefined };
    const body = JSON.stringify({ type: "page_view", path: pathname, locale, referrer: document.referrer, utm });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* ignore */
    }
  }, [pathname, locale, search]);
  return null;
}

export function trackEvent(type: string, extra: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({ type, path: location.pathname, ...extra });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    /* ignore */
  }
}
