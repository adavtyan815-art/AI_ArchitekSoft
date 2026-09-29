"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/components/site/track";
import { viewerLang, viewerSrc, type ViewerParams } from "@/lib/webviewer";

type Theme = "light" | "dark";

/** The site's effective theme: `<html data-theme>`, or the OS preference when the visitor never chose one. */
function siteTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * The Architeksoft WebViewer (3D kitchen configurator) in an iframe, with the attributes its
 * integration guide requires. The viewer owns the whole box — toolbars, side panel / bottom sheet,
 * safe areas — and switches to its phone layout when the frame itself is ≤ 760 px wide.
 *
 * Modes: `demo` adds the public showcase behaviour (showreel, "Demo preview" card); without it the viewer
 * runs as the full client product. `compact` is layout only (panel folded, colour strip) for small boxes.
 *
 * Kept in sync with the page (postMessage, same origin):
 * - language: the first one goes in the URL, later changes are posted, so the viewer re-labels itself
 *   instantly instead of reloading (the `src` never changes after mount);
 * - theme: the site's light/dark switch (and the OS preference, when the visitor never chose) drives the
 *   viewer's studio — sent on load and on every change;
 * - panel: `panelOpen` opens or folds the viewer's desktop material panel (e.g. while the host is full screen).
 * The viewer reports "Start your project" in its demo card (`architeksoft:cta`), counted as a CTA click.
 *
 * iPhone / iPad AR: see `bridgeQuickLook` below.
 */
export function KitchenViewer({
  locale,
  bundle,
  cfg,
  doors,
  tour,
  demo,
  compact,
  panelOpen,
  active,
  onLayout,
  minDesktopWidth,
  title,
  fill = false,
  className,
}: Omit<ViewerParams, "lang"> & {
  locale: string;
  title: string;
  /** Open (true) or fold (false) the viewer's desktop material panel; undefined leaves it to the viewer. */
  panelOpen?: boolean;
  /** false once the host no longer shows the viewer (e.g. another showcase mode): ends its first-look camera sway. */
  active?: boolean;
  /** Where the viewer's 3D canvas is — centre and width as fractions of the frame (the panel takes the rest). */
  onLayout?: (layout: { cx: number; w: number }) => void;
  /**
   * Keep the viewer's desktop layout in a box narrower than its phone breakpoint (760 px): on mouse/trackpad
   * devices the frame is laid out at this width and scaled down to fit (never below 70 %). Touch devices keep the
   * phone layout, which is what they need.
   */
  minDesktopWidth?: number;
  /** Fill the parent box (which must have a height) instead of the default min(100dvh, 860px). */
  fill?: boolean;
  className?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const lang = viewerLang(locale);
  const [src] = useState(() => viewerSrc({ bundle, lang, cfg, doors, tour, demo, compact }));
  const sent = useRef(lang);
  const panelSent = useRef(panelOpen);
  const box = useRef<HTMLDivElement>(null);
  const layoutCb = useRef(onLayout);
  layoutCb.current = onLayout;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!minDesktopWidth || !el || !window.matchMedia("(pointer: fine)").matches) return;
    const measure = () => {
      const w = el.clientWidth;
      setScale(w && w < minDesktopWidth && w >= minDesktopWidth * 0.7 ? w / minDesktopWidth : 1);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [minDesktopWidth]);

  const post = (msg: Record<string, unknown>) => {
    const f = frame.current;
    if (!f?.contentWindow) return;
    f.contentWindow.postMessage(msg, new URL(f.src, window.location.href).origin);
  };

  useEffect(() => {
    if (sent.current === lang) return;
    sent.current = lang;
    post({ type: "architeksoft:lang", lang });
  }, [lang]);

  // Only a change is sent: the first state is whatever the viewer starts with (compact: folded).
  useEffect(() => {
    if (panelOpen === undefined || panelSent.current === panelOpen) return;
    panelSent.current = panelOpen;
    post({ type: "architeksoft:panel", open: panelOpen });
  }, [panelOpen]);

  useEffect(() => {
    if (active === false) post({ type: "architeksoft:ambient", on: false });
  }, [active]);

  useEffect(() => {
    const sendTheme = () => post({ type: "architeksoft:theme", theme: siteTheme() });
    const html = new MutationObserver(sendTheme);
    html.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const os = window.matchMedia("(prefers-color-scheme: dark)");
    os.addEventListener("change", sendTheme);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.origin !== window.location.origin) return;
      if (e.data?.type === "architeksoft:cta") trackEvent("cta_click", { locale, meta: { label: "viewer-demo-card", href: "/start" } });
      if (e.data?.type === "architeksoft:layout") {
        const cx = Number(e.data.cx), w = Number(e.data.w);
        if (cx > 0 && cx < 1 && w > 0 && w <= 1) layoutCb.current?.({ cx, w });
      }
    };
    window.addEventListener("message", onMessage);
    // The frame can finish loading before hydration attaches onLoad: treat a document that is already there as loaded.
    const f = frame.current;
    if (f && f.contentDocument?.readyState === "complete" && f.contentDocument.URL !== "about:blank") onFrameLoad(f);
    return () => {
      html.disconnect();
      os.removeEventListener("change", sendTheme);
      window.removeEventListener("message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFrameLoad = (f: HTMLIFrameElement) => {
    bridgeQuickLook(f);
    post({ type: "architeksoft:theme", theme: siteTheme() });
  };

  return (
    // No explicit width: a block fills its line anyway, and "auto" lets a caller bleed it past the page
    // gutter with negative margins (the viewer needs at least ~360 px).
    <div ref={box} className={cn("kitchen-viewer", className)} style={{ position: "relative", height: fill ? "100%" : "min(100dvh, 860px)", overflow: scale < 1 ? "hidden" : undefined }}>
      <iframe
        ref={frame}
        id="kitchenViewer"
        title={title}
        src={src}
        allow="xr-spatial-tracking; fullscreen; clipboard-write; web-share"
        allowFullScreen
        loading="lazy"
        onLoad={(e) => onFrameLoad(e.currentTarget)}
        style={
          scale < 1
            ? { position: "absolute", left: 0, top: 0, width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }
            : { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }
        }
      />
    </div>
  );
}

const bridged = new WeakSet<Document>();

function isAppleTouch(): boolean {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS reports "Macintosh"
}

/**
 * AR Quick Look on iPhone / iPad, launched by the top-level page.
 *
 * The viewer builds the USDZ of the configured kitchen in the browser and offers it as an
 * `<a rel="ar" href="blob:…">` link. Safari reliably opens Quick Look only for such a link in the
 * top-level document, not inside an iframe. The viewer is on our own origin, so this page can see that
 * tap as it happens (capture phase, same click, so it still counts as the user's gesture), cancel it,
 * and follow the same link itself — the blob: URL belongs to this origin and resolves here too. The
 * customer taps "Open AR" once, exactly as on the full-screen page.
 */
function bridgeQuickLook(f: HTMLIFrameElement) {
  if (!isAppleTouch()) return;
  let doc: Document | null = null;
  try {
    doc = f.contentDocument; // null or throws for a foreign origin: then there is nothing to bridge
  } catch {
    return;
  }
  if (!doc || bridged.has(doc)) return;
  bridged.add(doc);
  doc.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      const link = typeof target?.closest === "function" ? (target.closest('a[rel~="ar"]') as HTMLAnchorElement | null) : null;
      if (!link?.href) return;
      e.preventDefault();
      // Safari's Quick Look contract: rel="ar" and an <img> as the link's first child.
      const a = document.createElement("a");
      a.rel = "ar";
      a.href = link.href;
      a.appendChild(document.createElement("img"));
      a.click();
    },
    true,
  );
}
