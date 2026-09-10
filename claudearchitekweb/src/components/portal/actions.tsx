"use client";

import { Box, Download, ExternalLink, Monitor } from "lucide-react";
import { portalEvent } from "./beacon";
import { ArButton } from "./ar-button";

export type PortalActionsProps = {
  slug: string;
  token: string;
  liveUrl?: string | null;
  viewerUrl?: string | null;
  glbUrl?: string | null;
  usdzUrl?: string | null;
  poster?: string | null;
  qrDataUrl?: string | null;
  labels: { live: string; liveNote: string; viewer: string; ar: string; arNote: string };
};

export function PortalActions({ slug, token, liveUrl, viewerUrl, glbUrl, usdzUrl, poster, qrDataUrl, labels }: PortalActionsProps) {
  const hasAr = !!(glbUrl || usdzUrl);
  if (!liveUrl && !viewerUrl && !hasAr) return null;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {liveUrl ? (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => portalEvent(slug, token, "open_live")} className="btn-brand btn-lg w-full sm:w-auto">
            <Monitor size={18} />
            {labels.live}
            <ExternalLink size={14} className="opacity-70" />
          </a>
        ) : null}
        {viewerUrl ? (
          <a href={viewerUrl} target="_blank" rel="noopener noreferrer" onClick={() => portalEvent(slug, token, "open_viewer")} className="btn-secondary btn-lg w-full sm:w-auto">
            <Box size={18} />
            {labels.viewer}
          </a>
        ) : null}
        {hasAr ? <ArButton glbUrl={glbUrl} usdzUrl={usdzUrl} poster={poster} qrDataUrl={qrDataUrl} label={labels.ar} note={labels.arNote} onOpen={() => portalEvent(slug, token, "open_ar")} /> : null}
      </div>
      {liveUrl ? <p className="mt-3 text-sm text-ink-500">{labels.liveNote}</p> : null}
    </div>
  );
}

/** Download link that also reports a `download` event. */
export function DownloadLink({ slug, token, href, name, label, className }: { slug: string; token: string; href: string; name: string; label: string; className?: string }) {
  return (
    <a href={href} download={name} onClick={() => portalEvent(slug, token, "download", { name })} className={className ?? "btn-secondary"}>
      <Download size={16} />
      {label}
    </a>
  );
}
