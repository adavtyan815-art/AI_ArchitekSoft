"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { Smartphone, X } from "lucide-react";

const MODEL_VIEWER_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";

export type ArButtonProps = {
  glbUrl?: string | null;
  usdzUrl?: string | null;
  poster?: string | null;
  /** Data-URL of a QR code pointing to this page with #ar (desktop). */
  qrDataUrl?: string | null;
  label: string;
  note: string;
  closeLabel?: string;
  /** Called when the modal opens (used for analytics). */
  onOpen?: () => void;
  /** Auto-open when the URL hash is #ar (phone that scanned the QR). */
  autoOpenOnHash?: boolean;
  className?: string;
  /** Render inline (no modal) — used on the demo page. */
  inline?: boolean;
  /** Custom content for the trigger button (defaults to icon + label). */
  trigger?: ReactNode;
};

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export function ArButton({ glbUrl, usdzUrl, poster, qrDataUrl, label, note, closeLabel = "Close", onOpen, autoOpenOnHash = true, className, inline, trigger }: ArButtonProps) {
  const [open, setOpen] = useState(!!inline);
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    setMobile(isMobile());
    if (typeof window !== "undefined" && window.customElements?.get("model-viewer")) setReady(true);
    if (autoOpenOnHash && !inline && window.location.hash === "#ar") setOpen(true);
  }, [autoOpenOnHash, inline]);

  useEffect(() => {
    if (!open || inline) return;
    if (!opened.current) {
      opened.current = true;
      onOpen?.();
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, inline, onOpen]);

  if (!glbUrl && !usdzUrl) return null;

  const viewer = (
    <div className="stage frame-marks relative aspect-square w-full overflow-hidden rounded-lg border border-line sm:aspect-[4/3]">
      {open ? (
        <>
          {/* crossOrigin keeps Next's preload hint in the same CORS mode as the
              module fetch — without it the browser downloads the file twice. */}
          <Script src={MODEL_VIEWER_SRC} type="module" crossOrigin="anonymous" strategy="afterInteractive" onReady={() => setReady(true)} onLoad={() => setReady(true)} />
          <model-viewer
            src={glbUrl ?? undefined}
            ios-src={usdzUrl ?? undefined}
            poster={poster ?? undefined}
            alt="3D model"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            camera-controls
            auto-rotate
            touch-action="pan-y"
            shadow-intensity="1"
            style={{ width: "100%", height: "100%", backgroundColor: "transparent", "--poster-color": "transparent" } as React.CSSProperties}
          >
            <button slot="ar-button" type="button" className="btn-brand btn-lg absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <Smartphone size={18} aria-hidden />
              {label}
            </button>
            <div slot="progress-bar" />
          </model-viewer>
          {!ready ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (inline) {
    // Stacked: the inline variant lives in a narrow column, and putting the QR
    // beside the viewer squeezed the 3D model down to a thumbnail.
    return (
      <div className={className}>
        <div className="grid gap-5">
          {viewer}
          {qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={note} hidden={mobile} className="mx-auto" /> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "btn-secondary btn-lg w-full sm:w-auto"}>
        {trigger ?? (
          <>
            <Smartphone size={18} aria-hidden />
            {label}
          </>
        )}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(9,8,7,0.78)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl rounded-t-xl border border-line bg-surface p-4 sm:rounded-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="index">AR</span>
                <span className="truncate font-display text-[1.15rem] leading-tight text-fg">{label}</span>
              </span>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-icon flex-none rounded-md" aria-label={closeLabel}>
                <X size={18} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              {viewer}
              {qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={note} hidden={mobile} /> : null}
            </div>
            <p className="caption mt-4">{note}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** QR panel for desktop visitors: scan with a phone to open AR. Always on white so it scans. */
export function QrPanel({ qrDataUrl, note, hidden, className }: { qrDataUrl: string; note: string; hidden?: boolean; className?: string }) {
  if (hidden) return null;
  return (
    <figure className={`hidden w-fit flex-col items-center gap-3 rounded-lg border border-line bg-surface-2 p-4 md:flex ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="QR" width={176} height={176} className="h-44 w-44 rounded-sm bg-[#ffffff] p-2" style={{ filter: "none" }} />
      <figcaption className="caption max-w-[12rem] text-center">{note}</figcaption>
    </figure>
  );
}
