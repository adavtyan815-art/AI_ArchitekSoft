"use client";

import { ArrowUpRight, Box, Download, Monitor, Sparkles } from "lucide-react";
import { portalEvent } from "./beacon";
import { ArButton } from "./ar-button";

export type PortalActionLabels = {
  viewer: string;
  viewerNote: string;
  live: string;
  liveNote: string;
  premium: string;
  ar: string;
  arNote: string;
  close?: string;
};

export type PortalActionsProps = {
  slug: string;
  token: string;
  /** Web Viewer destination: /v/<slug>?k=… (own model) or the project's external viewerUrl. */
  webViewerHref?: string | null;
  liveUrl?: string | null;
  glbUrl?: string | null;
  usdzUrl?: string | null;
  poster?: string | null;
  qrDataUrl?: string | null;
  labels: PortalActionLabels;
};

/**
 * The deliverables card. The Web Viewer is the default for every client; Live 3D
 * (Pixel Streaming) is a premium extra and is visually secondary.
 */
export function PortalActions({ slug, token, webViewerHref, liveUrl, glbUrl, usdzUrl, poster, qrDataUrl, labels }: PortalActionsProps) {
  const hasAr = !!(glbUrl || usdzUrl);
  if (!webViewerHref && !liveUrl && !hasAr) return null;
  const viewerExternal = !!webViewerHref && /^https?:\/\//.test(webViewerHref);

  return (
    <div className="card overflow-hidden">
      {webViewerHref || hasAr ? (
        <div className="p-4 sm:p-5">
          {webViewerHref ? (
            <>
              <a
                href={webViewerHref}
                target={viewerExternal ? "_blank" : undefined}
                rel={viewerExternal ? "noopener noreferrer" : undefined}
                onClick={() => portalEvent(slug, token, "open_viewer")}
                className="btn-brand btn-lg min-h-[52px] w-full"
              >
                <Box size={18} aria-hidden />
                {labels.viewer}
                <ArrowUpRight size={16} className="opacity-70" aria-hidden />
              </a>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{labels.viewerNote}</p>
            </>
          ) : null}
          {hasAr ? (
            <div className={webViewerHref ? "mt-3" : ""}>
              <ArButton
                glbUrl={glbUrl}
                usdzUrl={usdzUrl}
                poster={poster}
                qrDataUrl={qrDataUrl}
                label={labels.ar}
                note={labels.arNote}
                closeLabel={labels.close}
                onOpen={() => portalEvent(slug, token, "open_ar")}
                className="btn-secondary btn-lg min-h-[52px] w-full"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {liveUrl ? (
        <div className="border-t border-line bg-surface-2 p-4 sm:p-5">
          <span className="badge border-transparent bg-accent-soft text-accent-soft-fg">
            <Sparkles size={12} aria-hidden />
            {labels.premium}
          </span>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => portalEvent(slug, token, "open_live")} className="btn-secondary btn-lg mt-3 min-h-[52px] w-full">
            <Monitor size={18} aria-hidden />
            {labels.live}
            <ArrowUpRight size={16} className="opacity-70" aria-hidden />
          </a>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">{labels.liveNote}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Download link that also reports a `download` event. */
export function DownloadLink({ slug, token, href, name, label, className }: { slug: string; token: string; href: string; name: string; label: string; className?: string }) {
  return (
    <a href={href} download={name} onClick={() => portalEvent(slug, token, "download", { name })} className={className ?? "btn-secondary"}>
      <Download size={16} aria-hidden />
      {label}
    </a>
  );
}
