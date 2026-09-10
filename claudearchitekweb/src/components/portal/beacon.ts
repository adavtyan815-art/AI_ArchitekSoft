"use client";

/** Fire-and-forget event beacon to /api/portal/[slug]/event. Never throws. */
export function portalEvent(slug: string, token: string, type: "open_live" | "open_viewer" | "open_ar" | "download", meta?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ k: token, type, meta });
    const url = `/api/portal/${encodeURIComponent(slug)}/event`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}
