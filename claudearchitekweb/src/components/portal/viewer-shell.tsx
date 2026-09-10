"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Link2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewerDemo } from "@/components/site/viewer-demo";
import { portalEvent } from "./beacon";

export type ViewerShellLabels = {
  back: string;
  share: string;
  copied: string;
  hint: string;
  swatches: string;
  ar: string;
  reset: string;
  theme: { light: string; dark: string };
};

/**
 * Full-screen Web Viewer for one project: a thin top bar (64 px), the model on a
 * dark stage with a dot-grid floor and corner marks, and a mono status bar below.
 * The ViewerDemo inside inherits the stage tokens, so its swatch toolbar goes dark.
 */
export function ViewerShell({
  slug,
  token,
  title,
  code,
  logoSrc,
  glbUrl,
  iosSrc,
  poster,
  backHref,
  shareUrl,
  labels,
}: {
  slug: string;
  token: string;
  title: string;
  /** Mono project code shown above the title, e.g. AT-2026-0042. */
  code?: string | null;
  logoSrc: string;
  glbUrl: string;
  iosSrc?: string | null;
  poster?: string | null;
  backHref: string;
  shareUrl: string;
  labels: ViewerShellLabels;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const sent = useRef(false);

  // One "open_viewer" event per page load.
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    portalEvent(slug, token, "open_viewer", { via: "web_viewer" });
  }, [slug, token]);

  // ViewerDemo has no ios-src prop (it is owned by the site surface), so the
  // iOS Quick Look source is attached to the element as soon as it mounts.
  useEffect(() => {
    const root = wrap.current;
    if (!iosSrc || !root) return;
    const apply = () => {
      const mv = root.querySelector("model-viewer");
      if (!mv) return false;
      if (mv.getAttribute("ios-src") !== iosSrc) mv.setAttribute("ios-src", iosSrc);
      return true;
    };
    if (apply()) return;
    const mo = new MutationObserver(() => {
      if (apply()) mo.disconnect();
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [iosSrc]);

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title, url: shareUrl });
        return;
      } catch {
        return; // user dismissed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="h-16 flex-none border-b border-line bg-surface">
        <div className="flex h-full items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <a href={backHref} className="btn-ghost btn-icon flex-none rounded-md" aria-label={labels.back}>
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="hidden flex-none sm:block"><BrandLogo className="h-6" /></span>
          <div className="min-w-0 flex-1">
            {code ? <div className="caption truncate text-accent">{code}</div> : null}
            {/* the truncate lives on the span: global h1 styling sets text-wrap and would win on the heading itself */}
            <h1 className="min-w-0 font-display text-[15px] leading-tight font-medium tracking-[-0.01em] text-fg sm:text-[17px]">
              <span className="block truncate">{title}</span>
            </h1>
          </div>
          <button type="button" onClick={share} className="btn-secondary btn-sm flex-none gap-2 font-mono text-[11px] tracking-[0.08em] uppercase" aria-label={labels.share}>
            {copied ? <Check size={14} strokeWidth={2} aria-hidden /> : <Link2 size={14} strokeWidth={1.75} aria-hidden />}
            <span className="hidden sm:inline">{copied ? labels.copied : labels.share}</span>
          </button>
          <ThemeToggle labels={labels.theme} className="flex-none" />
        </div>
      </header>

      {/* The stage fills the rest of the viewport: ViewerDemo brings the dark ground,
          the dot-grid floor, the corner marks, the mono toolbar and the swatch bar. */}
      <div ref={wrap} className="min-h-0 flex-1 bg-stage">
        <ViewerDemo
          autoload
          src={glbUrl}
          poster={poster ?? undefined}
          labels={{ hint: labels.hint, swatches: labels.swatches, ar: labels.ar, reset: labels.reset }}
          className="flex h-full flex-col rounded-none! border-x-0! border-t-0! shadow-none!"
          height="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
