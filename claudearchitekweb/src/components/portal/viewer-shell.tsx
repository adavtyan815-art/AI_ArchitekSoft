"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Share2 } from "lucide-react";
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
 * Full-screen Web Viewer for one project: thin top bar (64px) + <model-viewer>
 * filling the rest of the viewport, with the material swatches docked underneath.
 */
export function ViewerShell({
  slug,
  token,
  title,
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
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* box-border: the 64px includes the hairline, so the viewer below is exactly 100dvh-64px. */}
      <header className="h-16 border-b border-line bg-surface">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6">
          <a href={backHref} className="btn-ghost btn-icon flex-none" aria-label={labels.back}>
            <ArrowLeft size={18} aria-hidden />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" aria-hidden className="hidden h-6 w-auto flex-none sm:block dark:brightness-[1.35]" />
          {/* the truncate lives on the span: global h1 styling sets text-wrap and would win on the heading itself */}
          <h1 className="min-w-0 flex-1 font-display text-[15px] font-semibold tracking-[-0.01em] text-fg sm:text-base">
            <span className="block truncate">{title}</span>
          </h1>
          <button type="button" onClick={share} className="btn-secondary btn-sm flex-none gap-1.5" aria-label={labels.share}>
            {copied ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
            <span className="hidden sm:inline">{copied ? labels.copied : labels.share}</span>
          </button>
          <ThemeToggle labels={labels.theme} className="flex-none" />
        </div>
      </header>

      <div ref={wrap} className="h-[calc(100dvh-64px)]">
        <ViewerDemo
          autoload
          src={glbUrl}
          poster={poster ?? undefined}
          labels={{ hint: labels.hint, swatches: labels.swatches, ar: labels.ar, reset: labels.reset }}
          className="flex h-full flex-col rounded-none! border-0! shadow-none!"
          height="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
