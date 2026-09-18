"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FocusSentinel, focusEdge, useDialogFocus } from "./use-dialog-focus";
import { ViewerLink } from "./viewer-link";

const MODEL_VIEWER_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";

/** Localised texts of the AR sheet. Every key is optional: a missing one falls back to `note` / a neutral alt. */
export type ArTexts = {
  /** Desktop: the QR code is the way in. */
  noteDesktop?: string;
  /** Phone: the button on the model is the way in (there is no QR code on a phone). */
  notePhone?: string;
  /** Phone without AR support: say so instead of showing a silent 3D box. */
  unsupported?: string;
  /** The 3D library or the model did not load. */
  error?: string;
  modelAlt?: string;
  qrAlt?: string;
};

export type ArButtonProps = {
  glbUrl?: string | null;
  usdzUrl?: string | null;
  poster?: string | null;
  /** Data-URL of a QR code pointing to this page with #ar (desktop). */
  qrDataUrl?: string | null;
  label: string;
  note: string;
  texts?: ArTexts;
  closeLabel?: string;
  /** Offered next to the "AR is not available" note. */
  viewerLink?: { slug: string; token: string; href: string; label: string } | null;
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

type ArElement = HTMLElement & { canActivateAR?: boolean; loaded?: boolean };

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export function ArButton({ glbUrl, usdzUrl, poster, qrDataUrl, label, note, texts, closeLabel = "Close", viewerLink, onOpen, autoOpenOnHash = true, className, inline, trigger }: ArButtonProps) {
  const [open, setOpen] = useState(!!inline);
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  /** null = not known yet (the model is still loading). */
  const [arAvailable, setArAvailable] = useState<boolean | null>(null);
  const opened = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<ArElement>(null);
  const modal = open && !inline;

  useEffect(() => {
    setMobile(isMobile());
    if (typeof window !== "undefined" && window.customElements?.get("model-viewer")) setReady(true);
    if (autoOpenOnHash && !inline && window.location.hash === "#ar") setOpen(true);
  }, [autoOpenOnHash, inline]);

  useEffect(() => {
    if (!modal) return;
    if (!opened.current) {
      opened.current = true;
      onOpen?.();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modal, onOpen]);

  // Focus moves into the sheet and comes back to the trigger when it closes.
  useDialogFocus(modal, closeRef, () => triggerRef.current);

  // Whether this device can actually start AR is known once the model has loaded.
  useEffect(() => {
    if (!open || !ready) return;
    const el = viewerRef.current;
    if (!el) return;
    const check = () => setArAvailable(!!el.canActivateAR);
    const onStatus = (e: Event) => {
      if ((e as CustomEvent<{ status?: string }>).detail?.status === "failed") setArAvailable(false);
    };
    const onError = () => setFailed(true);
    el.addEventListener("load", check);
    el.addEventListener("ar-status", onStatus);
    el.addEventListener("error", onError);
    if (el.loaded) check();
    return () => {
      el.removeEventListener("load", check);
      el.removeEventListener("ar-status", onStatus);
      el.removeEventListener("error", onError);
    };
  }, [open, ready]);

  if (!glbUrl && !usdzUrl) return null;

  const qrVisible = !!qrDataUrl && !mobile;
  const unsupported = mobile && arAvailable === false;
  // One instruction, fitted to the device: phones never see the QR code, desktops never see the AR button.
  const instruction = failed && texts?.error ? texts.error : unsupported ? (texts?.unsupported ?? note) : mobile ? (texts?.notePhone ?? note) : (texts?.noteDesktop ?? note);

  const viewer = (
    <div className="stage frame-marks relative aspect-square w-full overflow-hidden rounded-lg border border-line sm:aspect-[4/3]">
      {open ? (
        <>
          {/* crossOrigin keeps the preload hint in the same CORS mode as the
              module fetch: without it the browser downloads the file twice. */}
          <Script src={MODEL_VIEWER_SRC} type="module" crossOrigin="anonymous" strategy="afterInteractive" onReady={() => setReady(true)} onLoad={() => setReady(true)} onError={() => setFailed(true)} />
          <model-viewer
            ref={viewerRef}
            src={glbUrl ?? undefined}
            ios-src={usdzUrl ?? undefined}
            poster={poster ?? undefined}
            alt={texts?.modelAlt ?? label}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            camera-controls
            auto-rotate
            touch-action="pan-y"
            shadow-intensity="1"
            style={{ width: "100%", height: "100%", backgroundColor: "transparent", "--poster-color": "transparent" } as React.CSSProperties}
          >
            <button slot="ar-button" type="button" className="btn-brand btn-lg absolute bottom-4 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2">
              <Smartphone size={18} className="flex-none" aria-hidden />
              {label}
            </button>
            <div slot="progress-bar" />
          </model-viewer>
          {!ready && !failed ? (
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
          {qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={texts?.noteDesktop ?? note} alt={texts?.qrAlt} hidden={mobile} className="mx-auto" /> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className ?? "btn-secondary btn-lg w-full sm:w-auto"}>
        {trigger ?? (
          <>
            <Smartphone size={18} aria-hidden />
            {label}
          </>
        )}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(9,8,7,0.78)] p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className="max-h-dvh w-full max-w-3xl overflow-y-auto rounded-t-xl border border-line bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:rounded-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <FocusSentinel onFocus={() => focusEdge(dialogRef.current, "last")} />
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="index">AR</span>
                <span className="truncate font-display text-[1.15rem] leading-tight text-fg">{label}</span>
              </span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="btn-ghost btn-icon h-11 w-11 flex-none rounded-md" aria-label={closeLabel}>
                <X size={18} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className={cn("grid gap-5", qrVisible && "md:grid-cols-[1fr_auto] md:items-center")}>
              {viewer}
              {/* Desktop: the instruction is the caption of the QR code, shown once. */}
              {qrVisible && qrDataUrl ? <QrPanel qrDataUrl={qrDataUrl} note={instruction} alt={texts?.qrAlt} alwaysVisible className="mx-auto" /> : null}
            </div>
            {!qrVisible ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role={unsupported || failed ? "status" : undefined}>
                <p className="caption wrap-anywhere">{instruction}</p>
                {(unsupported || failed) && viewerLink ? (
                  <ViewerLink slug={viewerLink.slug} token={viewerLink.token} href={viewerLink.href} className="btn-secondary min-h-[44px] flex-none">
                    {viewerLink.label}
                  </ViewerLink>
                ) : null}
              </div>
            ) : null}
            <FocusSentinel onFocus={() => focusEdge(dialogRef.current, "first")} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * QR panel for desktop visitors: scan with a phone to open AR. Always on white so it scans.
 * By default it only shows from md up (server-rendered pages cannot know the device yet);
 * `alwaysVisible` is for places that already know they are not on a phone.
 */
export function QrPanel({ qrDataUrl, note, alt = "QR", hidden, alwaysVisible, className }: { qrDataUrl: string; note: string; alt?: string; hidden?: boolean; alwaysVisible?: boolean; className?: string }) {
  if (hidden) return null;
  return (
    <figure className={cn("w-fit flex-col items-center gap-3 rounded-lg border border-line bg-surface-2 p-4", alwaysVisible ? "flex" : "hidden md:flex", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt={alt} width={176} height={176} className="h-44 w-44 rounded-sm bg-[#ffffff] p-2" style={{ filter: "none" }} />
      <figcaption className="caption max-w-[12rem] text-center">{note}</figcaption>
    </figure>
  );
}
