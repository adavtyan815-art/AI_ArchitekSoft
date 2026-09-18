"use client";

import { useState } from "react";
import { ArrowLeft, Check, Link2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewerDemo } from "@/components/site/viewer-demo";

export type ViewerShellLabels = {
  back: string;
  share: string;
  copied: string;
  hint: string;
  /** Kept for the viewer's own type; a client model is never repainted, so no swatch bar is rendered. */
  swatches: string;
  ar: string;
  reset: string;
  /** Accessible name of the 3D model. */
  alt: string;
  loading: string;
  error: string;
  retry: string;
  theme: { light: string; dark: string };
};

/**
 * Full-screen Web Viewer for one project: a thin top bar (64 px), the model on a
 * dark stage with a dot-grid floor and corner marks, and a mono status bar below.
 * The ViewerDemo inside inherits the stage tokens, so its toolbar goes dark.
 *
 * The opening of the viewer is recorded by <OpenViewerBeacon> on the page, not here,
 * so one click from the client page produces exactly one event.
 */
export function ViewerShell({
  title,
  code,
  glbUrl,
  iosSrc,
  poster,
  backHref,
  shareUrl,
  labels,
}: {
  title: string;
  /** Mono project code shown above the title, e.g. AT-2026-0042. */
  code?: string | null;
  glbUrl: string;
  iosSrc?: string | null;
  poster?: string | null;
  backHref: string;
  shareUrl: string;
  labels: ViewerShellLabels;
}) {
  const [copied, setCopied] = useState(false);

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
          <span className="hidden flex-none sm:block">
            <BrandLogo className="h-6" />
          </span>
          <div className="min-w-0 flex-1">
            {code ? <div className="caption truncate text-accent">{code}</div> : null}
            {/* the truncate lives on the span: global h1 styling sets text-wrap and would win on the heading itself */}
            <h1 className="min-w-0 font-display text-[15px] leading-tight font-medium tracking-[-0.01em] text-fg sm:text-[17px]">
              <span className="block truncate">{title}</span>
            </h1>
          </div>
          {/* No static aria-label: the button's own text is its accessible name, so "Copied" is announced. */}
          <button type="button" onClick={share} className="btn-secondary btn-sm flex-none gap-2 font-mono text-[11px] tracking-[0.08em] uppercase">
            {copied ? <Check size={14} strokeWidth={2} aria-hidden /> : <Link2 size={14} strokeWidth={1.75} aria-hidden />}
            <span className="sr-only sm:hidden">{labels.share}</span>
            <span className="hidden sm:inline">{copied ? labels.copied : labels.share}</span>
          </button>
          <ThemeToggle labels={labels.theme} className="flex-none" />
        </div>
      </header>
      {/* Screen readers are told about the copy even when focus stays on the button. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? labels.copied : ""}
      </span>

      {/* The stage fills the rest of the viewport: ViewerDemo brings the dark ground,
          the dot-grid floor, the corner marks and the mono toolbar. */}
      <div className="min-h-0 flex-1 bg-stage">
        <ViewerDemo
          autoload
          src={glbUrl}
          iosSrc={iosSrc ?? undefined}
          poster={poster ?? undefined}
          /* A client's own model keeps its finishes: the demo palette would repaint a real kitchen. */
          swatches={[]}
          labels={{ hint: labels.hint, swatches: labels.swatches, ar: labels.ar, reset: labels.reset, alt: labels.alt, loading: labels.loading, error: labels.error, retry: labels.retry }}
          className="flex h-full flex-col rounded-none! border-x-0! border-t-0! shadow-none!"
          height="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
