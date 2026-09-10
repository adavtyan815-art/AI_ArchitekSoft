"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./before-after";
import { ViewerDemo } from "./viewer-demo";

/**
 * Interactive showcase — the visual centre of the first screen.
 * One stage, three demonstrations chosen with three always-visible option tiles under the stage
 * (the selected tile is larger and stronger):
 *   01 sketch → finished picture (comparison slider)
 *   02 Web Viewer (rotate, change colour; library + model load only when opened, tap-to-load on phones)
 *   03 Live 3D walkthrough (short muted clip, loaded only when opened)
 * Manual controls: tiles, prev/next chips, ← → keys. Idle behaviour: advances every 5 s and keeps cycling
 * while the visitor is idle; any click, drag, key or tile choice stops the auto mode for good
 * (a play chip can restart it). Cycling pauses off-screen, in a hidden tab and in fullscreen.
 * Fullscreen on the stage where the API exists (hidden on iOS Safari).
 */
const AUTO_MS = 5000;

export type ShowcaseStrings = {
  tag: string;
  title: string;
  text: string;
  auto: string;
  paused: string;
  prev: string;
  next: string;
  fullscreen: string;
  exitFullscreen: string;
  items: { key: string; tag: string; title: string; text: string; cta: string; href: string }[];
};

export function Showcase({
  locale,
  s,
  viewerLabels,
  compareLabels,
  media,
  className,
}: {
  locale: Locale;
  s: ShowcaseStrings;
  viewerLabels: { hint: string; swatches: string; ar: string; reset?: string; load?: string };
  compareLabels: [string, string];
  media: { before: string; after: string; video: string; videoPoster: string; viewerPoster?: string };
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const [fs, setFs] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [opened, setOpened] = useState<boolean[]>(() => s.items.map((_, k) => k === 0));
  const [tick, setTick] = useState(0); // restarts the progress line
  const n = s.items.length;
  const p = (path: string) => localePath(locale, path);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    setDesktop(window.matchMedia("(pointer: fine)").matches && !nav.connection?.saveData);
    setFsSupported(!!document.fullscreenEnabled);
    const onVis = () => setDocHidden(document.hidden);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  // Only cycle while the stage is actually on screen.
  useEffect(() => {
    const el = stage.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const select = useCallback(
    (k: number) => {
      const next = ((k % n) + n) % n;
      setI(next);
      setOpened((o) => (o[next] ? o : o.map((v, idx) => v || idx === next)));
      setTick((t) => t + 1);
    },
    [n],
  );

  // Reduced-motion users keep the auto-advance (a content change, not motion); the global rule drops the progress animation.
  const running = auto && visible && !docHidden && !fs;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => select(i + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [running, i, tick, select]);

  // Any real interaction inside the showcase stops the auto mode permanently.
  const stop = useCallback(() => setAuto(false), []);
  const manual = (k: number) => {
    stop();
    select(k);
  };

  // The clip plays only while its panel is active.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (s.items[i]?.key === "live") v.play().catch(() => {});
    else v.pause();
  }, [i, s.items, opened]);

  const toggleFs = async () => {
    stop();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen?.();
    } catch {
      /* unsupported */
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      manual(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      manual(i - 1);
    } else if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const cur = s.items[i];
  const idx = (k: number) => String(k + 1).padStart(2, "0");
  const chip = "inline-flex h-9 items-center gap-1.5 rounded-md border border-[#f4f2ed]/25 bg-[#17150f]/55 px-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f4f2ed] backdrop-blur transition-colors hover:border-[#f4f2ed]/60 hover:bg-[#17150f]/75";

  return (
    <div ref={root} className={cn("frame overflow-hidden", className)} onPointerDownCapture={stop} onKeyDownCapture={stop} data-auto={auto} data-running={running}>
      {/* Stage */}
      <div
        ref={stage}
        className="showcase-stage stage relative aspect-[4/3] outline-none sm:aspect-[16/9] xl:aspect-[2.6/1]"
        tabIndex={0}
        onKeyDown={onKey}
        role="group"
        aria-roledescription="carousel"
        aria-label={s.title}
      >
        {/* 01 — sketch → picture */}
        <div className={cn("absolute inset-0 transition-opacity duration-500", i === 0 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 0}>
          <BeforeAfter before={media.before} after={media.after} labels={compareLabels} aspect="h-full w-full" labelsAt="bottom" />
        </div>

        {/* 02 — Web Viewer (mounted on first open; phones get tap-to-load) */}
        <div className={cn("absolute inset-0 transition-opacity duration-500", i === 1 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 1}>
          {opened[1] ? <ViewerDemo labels={viewerLabels} poster={media.viewerPoster} className="flex h-full flex-col rounded-none border-0" height="min-h-0 flex-1" autoload={desktop && i === 1} /> : null}
        </div>

        {/* 03 — Live 3D walkthrough (clip loaded on first open) */}
        <div className={cn("absolute inset-0 transition-opacity duration-500", i === 2 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 2}>
          {opened[2] ? (
            <video ref={video} src={media.video} poster={media.videoPoster} muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={s.items[2]?.title} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.videoPoster} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-sm bg-[#17150f]/70 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur">
            <span className="dot bg-accent animate-pulse" />
            Live 3D
          </span>
        </div>

        {/* Stage chrome: counter + status (top-left), controls (top-right) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
          <span className={cn("pointer-events-auto", chip)} aria-live="polite">
            <span className="text-accent">{idx(i)}</span>
            <span className="opacity-60">/ {idx(n - 1)}</span>
            <span className="hidden sm:inline">· {cur?.tag}</span>
            <span className="ml-1 hidden items-center gap-1.5 border-l border-[#f4f2ed]/25 pl-2 opacity-80 md:inline-flex">
              <span className={cn("dot", running ? "bg-accent animate-pulse" : "bg-[#f4f2ed]/50")} />
              {auto ? s.auto : s.paused}
            </span>
          </span>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button type="button" className={chip} onClick={() => manual(i - 1)} aria-label={s.prev}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" className={chip} onClick={() => manual(i + 1)} aria-label={s.next}>
              <ChevronRight size={14} />
            </button>
            {auto ? (
              <button type="button" className={chip} onClick={stop} aria-label={s.paused}>
                <Pause size={13} />
              </button>
            ) : (
              <button
                type="button"
                className={chip}
                onClick={(e) => {
                  e.stopPropagation();
                  setAuto(true);
                  setTick((t) => t + 1);
                }}
                onPointerDownCapture={(e) => e.stopPropagation()}
                aria-label={s.auto}
              >
                <Play size={13} />
              </button>
            )}
            {fsSupported ? (
              <button type="button" className={chip} onClick={toggleFs} aria-label={fs ? s.exitFullscreen : s.fullscreen}>
                {fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden sm:inline">{fs ? s.exitFullscreen : s.fullscreen}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Fullscreen-only caption */}
        {fs ? (
          <div className="pointer-events-none absolute right-4 bottom-4 max-w-md rounded-md bg-[#17150f]/60 px-4 py-3 text-right text-[#f4f2ed] backdrop-blur">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-70">{cur?.tag}</div>
            <div className="mt-1 font-display text-[1.3rem] leading-tight">{cur?.title}</div>
          </div>
        ) : null}
      </div>

      {/* Option tiles: all three visible, the selected one larger and stronger */}
      <div className="flex divide-x divide-line border-t border-line bg-surface" role="tablist" aria-label={s.tag}>
        {s.items.map((it, k) => {
          const active = k === i;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => manual(k)}
              className={cn(
                "group relative min-w-0 px-3 pt-3.5 pb-3 text-left transition-[flex-grow,background-color,color] duration-300 sm:px-5 sm:pt-4 sm:pb-3.5",
                active ? "flex-[1.9] bg-surface-2 text-fg" : "flex-1 text-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              {/* accent rule with the 5 s progress on the active tile */}
              <span className={cn("absolute inset-x-0 top-0 h-[2px] overflow-hidden", active ? "bg-line" : "bg-transparent")}>
                {active ? <span key={tick} className={cn("absolute inset-y-0 left-0 bg-accent", running ? "showcase-progress" : "w-full")} /> : null}
              </span>
              <span className="flex items-center gap-2">
                <span className={cn("index", !active && "text-faint")}>{idx(k)}</span>
                <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em]">{it.tag}</span>
              </span>
              <span className={cn("mt-1.5 block font-display leading-tight transition-[font-size] duration-300", active ? "text-[1.1rem] sm:text-[1.35rem] lg:text-[1.5rem]" : "text-[0.95rem] sm:text-[1.05rem] lg:text-[1.15rem]")}>{it.title}</span>
              <span className={cn("mt-2 hidden max-w-md text-[13.5px] leading-relaxed text-muted lg:block", !active && "lg:hidden")}>{it.text}</span>
              {active ? (
                <Link href={p(it.href)} className="link-arrow mt-3 hidden text-[13px] lg:inline-flex" onClick={(e) => e.stopPropagation()}>
                  {it.cta}
                  <ArrowRight size={14} />
                </Link>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Phone / tablet: the selected item's text + link */}
      <div className="border-t border-line px-4 py-3.5 lg:hidden">
        <p className="text-[13.5px] leading-relaxed text-fg-2">{cur?.text}</p>
        <Link href={p(cur?.href ?? "/")} className="link-arrow mt-2 text-[13px]">
          {cur?.cta}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
