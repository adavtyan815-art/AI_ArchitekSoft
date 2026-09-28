"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Box, Maximize2, Minimize2, X } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./before-after";
import { KitchenViewer } from "./kitchen-viewer";

/**
 * Interactive showcase — the first screen of the homepage.
 * The stage (a framed canvas with corner marks) is the one dominant object; under it a hairline mode
 * strip with a single sliding ink indicator, then one caption line naming the selected mode.
 * The headline sits beside it on the open page, the intro + CTAs below the headline (on phones: after
 * the canvas, so the product is on the first screen).
 *   01 sketch → finished picture (comparison slider)
 *   02 Web Viewer — the live 3D kitchen configurator (the curated demo kitchen, no onboarding tour).
 *      Fine pointers: loads by itself once the page has finished loading, and plays inside the stage.
 *      Touch devices: a still with a start control; the tap loads it straight into the fullscreen overlay,
 *      because the viewer needs more room than a phone-sized stage (its phone layout wants ~360 × 560).
 *   03 Live 3D walkthrough (short muted clip, loaded only when opened)
 * Selection is manual only (strip, ← → keys); Web Viewer is the default mode, no autoplay.
 *
 * Fullscreen: on fine pointers the strip's last button requests native fullscreen on the stage. On touch
 * devices (no element fullscreen on iOS Safari) a control on the stage opens an overlay viewer instead:
 * the canvas fills the screen with the mode strip inside the safe area at the bottom and a close control
 * at the top; scrolling is locked; Escape, the back gesture or the close control exits.
 */
export type ShowcaseStrings = {
  tag: string;
  title: string;
  text: string;
  auto: string;
  paused: string;
  prev: string;
  next: string;
  choose: string;
  fullscreen: string;
  exitFullscreen: string;
  items: { key: string; tag: string; title: string; text: string; cta: string; href: string }[];
};

export function Showcase({
  locale,
  s,
  viewerCta,
  viewerTitle,
  compareLabels,
  media,
  headline,
  copy,
}: {
  locale: Locale;
  s: ShowcaseStrings;
  /** Label of the control that starts the 3D kitchen configurator on touch devices. */
  viewerCta: string;
  /** Accessible name of the 3D viewer frame. */
  viewerTitle: string;
  compareLabels: [string, string];
  media: { before: string; after: string; video: string; videoPoster: string; viewerPoster?: string };
  /** Eyebrow + H1 (page-owned). */
  headline: ReactNode;
  /** Intro, CTAs and note (page-owned): under the headline on desktop, under the canvas on phones. */
  copy: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const segs = useRef<(HTMLButtonElement | null)[]>([]);
  const [i, setI] = useState(1); // Web Viewer opens first
  const [fs, setFs] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const [live, setLive] = useState(false); // the 3D viewer frame is mounted
  const [opened, setOpened] = useState<boolean[]>(() => s.items.map((_, k) => k === 1));
  const n = s.items.length;
  const p = (path: string) => localePath(locale, path);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    setFsSupported(!!document.fullscreenEnabled);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // The indicator follows the selected segment (measured, so it is exact for any label length).
  useEffect(() => {
    const measure = () => {
      const el = segs.current[i];
      if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 350); // after web fonts settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [i, overlay]);

  const select = useCallback(
    (k: number) => {
      const next = ((k % n) + n) % n;
      setI(next);
      setOpened((o) => (o[next] ? o : o.map((v, idx) => v || idx === next)));
    },
    [n],
  );

  // Desktop: start the viewer once the page itself has loaded (never competes with the first paint).
  // Touch devices wait for a tap on the start control.
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const start = () => setLive(true);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  const startViewer = () => {
    setLive(true);
    if (coarse || !fsSupported) setOverlay(true);
  };

  // The clip plays only while its panel is active.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (s.items[i]?.key === "live") v.play().catch(() => {});
    else v.pause();
  }, [i, s.items, opened]);

  // Overlay viewer (touch devices): lock scroll, close on Escape / back gesture.
  useEffect(() => {
    if (!overlay) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    history.pushState({ showcaseOverlay: true }, "");
    const onPop = () => setOverlay(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") history.back();
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      if (history.state?.showcaseOverlay) history.back();
    };
  }, [overlay]);

  const toggleFs = async () => {
    if (coarse || !fsSupported) {
      if (overlay) history.back();
      else setOverlay(true);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen?.();
    } catch {
      setOverlay((o) => !o);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    // Arrow keys switch modes only when the stage itself (or a mode tab) has focus. Keys pressed inside
    // the stage — the comparison slider, the 3D viewer and its buttons — belong to those controls.
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(i + 1);
      segs.current[(i + 1) % n]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(i - 1);
      segs.current[(i - 1 + n) % n]?.focus();
    }
  };

  const cur = s.items[i];
  const big = fs || overlay;
  // The viewer keeps its own toolbar in the top corners, so over it the close control moves into the strip.
  const viewerOverlay = overlay && i === 1;

  const stage = (
    <div
      ref={stageRef}
      className="showcase-stage stage frame-marks on-image relative aspect-[4/3] w-full outline-none sm:aspect-[16/10]"
      tabIndex={0}
      onKeyDown={onKey}
      role="group"
      aria-roledescription="carousel"
      aria-label={s.title}
    >
      {/* 01 — sketch → picture */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", i === 0 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 0} inert={i !== 0 ? true : undefined}>
        {/* labels at the bottom: the top corners carry the Live chip and the touch fullscreen control */}
        <BeforeAfter before={media.before} after={media.after} labels={compareLabels} aspect="h-full w-full" labelsAt="bottom" />
      </div>

      {/* 02 — Web Viewer (desktop: loads after the page; touch: tap → fullscreen overlay) */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", i === 1 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 1} inert={i !== 1 ? true : undefined}>
        {opened[1] && live ? (
          // public showcase: demo behaviour + compact layout; full screen opens the viewer's material panel
          <KitchenViewer locale={locale} demo compact tour={false} panelOpen={fs} title={viewerTitle} fill />
        ) : opened[1] ? (
          <button type="button" onClick={startViewer} className="group absolute inset-0 flex flex-col items-center justify-center gap-4">
            {media.viewerPoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.viewerPoster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-85" />
            ) : null}
            <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-md border border-[#f4f2ed]/35 bg-[#17150f]/60 text-[#f4f2ed] backdrop-blur">
              <Box size={22} aria-hidden />
            </span>
            <span className="relative rounded-sm bg-[#17150f]/60 px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-[#f4f2ed] uppercase backdrop-blur">{viewerCta}</span>
          </button>
        ) : null}
      </div>

      {/* 03 — Live 3D walkthrough (clip loaded on first open) */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", i === 2 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 2} inert={i !== 2 ? true : undefined}>
        {opened[2] ? (
          <video ref={video} src={media.video} poster={media.videoPoster} muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={s.items[2]?.title} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.videoPoster} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-sm bg-[#17150f]/70 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur">
          <span className="dot bg-accent" />
          Live 3D
        </span>
      </div>

      {/* touch devices: fullscreen / close control on the stage itself */}
      {viewerOverlay ? null : (
        <button type="button" className="hx-stage-fs" onClick={toggleFs} aria-label={overlay ? s.exitFullscreen : s.fullscreen} title={overlay ? s.exitFullscreen : s.fullscreen}>
          {overlay ? <X size={18} /> : <Maximize2 size={17} />}
        </button>
      )}

      {/* Native fullscreen (desktop): one visible way back besides Esc — a frosted pill at the top centre, the one
          spot the 3D viewer keeps free (its title and tools sit top-left, its panel on the right, its dock at the
          bottom). Chrome's own "press Esc" notice covers the same spot for its first few seconds. */}
      {fs ? (
        <button type="button" className="hx-fs-exit" onClick={toggleFs}>
          <X size={15} aria-hidden />
          {s.exitFullscreen}
        </button>
      ) : null}
    </div>
  );

  /** Mode strip: three segments, one sliding indicator, fullscreen (fine pointers). Roving tabindex. */
  const strip = (
    <div className="hx-strip" role="tablist" aria-label={s.choose}>
      <span className="hx-strip-ind" aria-hidden style={ind ? { transform: `translateX(${ind.x}px)`, width: ind.w } : { opacity: 0 }} />
      {s.items.map((it, k) => {
        const active = k === i;
        return (
          <button
            key={it.key}
            ref={(el) => {
              segs.current[k] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => select(k)}
            onKeyDown={onKey}
            className={cn("hx-seg", active && "is-active")}
          >
            <span className="min-w-0">
              <span className="hx-seg-tag">{it.tag}</span>
              <span className="hx-seg-title">{it.title}</span>
            </span>
          </button>
        );
      })}
      {fsSupported || viewerOverlay ? (
        <button type="button" className={cn("hx-fs", viewerOverlay && "hx-fs-close")} onClick={toggleFs} aria-label={big ? s.exitFullscreen : s.fullscreen} title={big ? s.exitFullscreen : s.fullscreen}>
          {viewerOverlay ? <X size={18} /> : big ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      ) : null}
    </div>
  );

  /** "Now showing": one caption line. */
  const now = (
    <div className="hx-now" key={cur?.key}>
      <span className="hx-now-title">{cur?.title}</span>
      <Link href={p(cur?.href ?? "/")} className="hx-now-link">
        {cur?.cta}
        <ArrowRight size={14} />
      </Link>
    </div>
  );

  return (
    <div className="hx-hero">
      <div className="hx-hero-text">{headline}</div>
      <div className={cn("hx-hero-canvas", overlay && "is-overlay")} role={overlay ? "dialog" : undefined} aria-modal={overlay || undefined} aria-label={overlay ? s.title : undefined}>
        <div className="hx-canvas">{stage}</div>
        {strip}
        {now}
      </div>
      <div className="hx-hero-copy">{copy}</div>
    </div>
  );
}
