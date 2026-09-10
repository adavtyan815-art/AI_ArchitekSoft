"use client";

import { useEffect, useRef, useState } from "react";
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
};

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export function ArButton({ glbUrl, usdzUrl, poster, qrDataUrl, label, note, closeLabel = "Close", onOpen, autoOpenOnHash = true, className, inline }: ArButtonProps) {
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
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-100 sm:aspect-[4/3]">
      {open ? (
        <>
          <Script src={MODEL_VIEWER_SRC} type="module" strategy="afterInteractive" onReady={() => setReady(true)} onLoad={() => setReady(true)} />
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
            style={{ width: "100%", height: "100%", backgroundColor: "#f3f4f6" }}
          >
            <button slot="ar-button" type="button" className="btn-brand btn-lg absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-card">
              <Smartphone size={18} />
              {label}
            </button>
            <div slot="progress-bar" />
          </model-viewer>
          {!ready ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (inline) {
    return (
      <div className={className}>
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          {viewer}
          {qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={note} hidden={mobile} /> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "btn-secondary btn-lg w-full sm:w-auto"}>
        <Smartphone size={18} />
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl rounded-t-3xl bg-white p-4 shadow-card sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-ink-950">{label}</div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200" aria-label={closeLabel}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              {viewer}
              {qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={note} hidden={mobile} /> : null}
            </div>
            <p className="mt-3 text-sm text-ink-500">{note}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QrPanel({ qrDataUrl, note, hidden }: { qrDataUrl: string; note: string; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="hidden flex-col items-center gap-2 rounded-2xl border border-line bg-paper-2 p-4 md:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="QR" width={176} height={176} className="h-44 w-44 rounded-xl bg-white p-2" />
      <span className="max-w-[12rem] text-center text-xs text-ink-500">{note}</span>
    </div>
  );
}
