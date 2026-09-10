"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Download } from "lucide-react";
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

/** The inside of one action cell: mono index + optional tag, serif label, mono note. */
function CellBody({ n, label, note, tag }: { n: number; label: string; note: string; tag?: string | null }) {
  return (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="index">{String(n).padStart(2, "0")}</span>
        {tag ? <span className="tag">{tag}</span> : null}
      </span>
      <span className="mt-6 flex items-start justify-between gap-3">
        <span className="font-display text-[1.3rem] leading-tight text-fg transition-colors group-hover:text-accent sm:text-[1.4rem]">{label}</span>
        <ArrowUpRight size={16} className="mt-1.5 flex-none text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
      </span>
      <span className="caption mt-2 block">{note}</span>
    </>
  );
}

const CELL = "group flex min-h-[9.5rem] w-full flex-col items-stretch justify-start p-5 text-left transition-colors hover:bg-surface-2 sm:p-6";

/**
 * The deliverables row: a three-column rule block. The Web Viewer is the default
 * for every client; Live 3D (Pixel Streaming) is a premium extra, marked with a tag.
 */
export function PortalActions({ slug, token, webViewerHref, liveUrl, glbUrl, usdzUrl, poster, qrDataUrl, labels }: PortalActionsProps) {
  const hasAr = !!(glbUrl || usdzUrl);
  if (!webViewerHref && !liveUrl && !hasAr) return null;
  const viewerExternal = !!webViewerHref && /^https?:\/\//.test(webViewerHref);
  const cells: ReactNode[] = [];
  let n = 0;

  if (webViewerHref) {
    n += 1;
    cells.push(
      <a
        key="viewer"
        href={webViewerHref}
        target={viewerExternal ? "_blank" : undefined}
        rel={viewerExternal ? "noopener noreferrer" : undefined}
        onClick={() => portalEvent(slug, token, "open_viewer")}
        className={CELL}
      >
        <CellBody n={n} label={labels.viewer} note={labels.viewerNote} />
      </a>
    );
  }
  if (hasAr) {
    n += 1;
    cells.push(
      <ArButton
        key="ar"
        glbUrl={glbUrl}
        usdzUrl={usdzUrl}
        poster={poster}
        qrDataUrl={qrDataUrl}
        label={labels.ar}
        note={labels.arNote}
        closeLabel={labels.close}
        onOpen={() => portalEvent(slug, token, "open_ar")}
        className={CELL}
        trigger={<CellBody n={n} label={labels.ar} note={labels.arNote} tag="AR" />}
      />
    );
  }
  if (liveUrl) {
    n += 1;
    cells.push(
      <a key="live" href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => portalEvent(slug, token, "open_live")} className={CELL}>
        <CellBody n={n} label={labels.live} note={labels.liveNote} tag={labels.premium} />
      </a>
    );
  }

  const cols = cells.length === 2 ? "sm:grid-cols-2 sm:divide-x sm:divide-y-0" : cells.length >= 3 ? "md:grid-cols-3 md:divide-x md:divide-y-0" : "";
  return <div className={`grid divide-y divide-line border-y border-line ${cols}`}>{cells}</div>;
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
