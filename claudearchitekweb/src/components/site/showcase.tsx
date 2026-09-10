"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./before-after";
import { ViewerDemo } from "./viewer-demo";

/**
 * Interactive showcase: three demonstrations in one stage.
 *   01 sketch → finished picture (comparison slider)
 *   02 Web Viewer (rotate, change colour; loads only when opened, tap-to-load on phones)
 *   03 Live 3D walkthrough (short muted clip, loaded only when opened)
 * Manual controls (tabs, prev/next, keyboard). With no interaction it advances every 5 s and keeps
 * cycling while the visitor is idle; any interaction (click, drag, key, tab) stops the auto mode for good.
 * Fullscreen is offered on the stage (Fullscreen API; hidden where unsupported, e.g. iOS Safari).
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
  index: sectionIndex,
  viewerLabels,
  compareLabels,
  media,
}: {
  locale: Locale;
  s: ShowcaseStrings;
  index: number;
  viewerLabels: { hint: string; swatches: string; ar: string; reset?: string; load?: string };
  compareLabels: [string, string];
  media: { before: string; after: string; video: string; videoPoster: string; viewerPoster?: string };
}) {
  const root = useRef<HTMLElement>(null);
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
  const [tick, setTick] = useState(0); // restarts the progress animation
  const n = s.items.length;
  const p = (path: string) => localePath(locale, path);

  // Environment: fine pointer (desktop), reduced motion, fullscreen support.
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    setDesktop(window.matchMedia("(pointer: fine)").matches && !nav.connection?.saveData);
    setFsSupported(!!document.fullscreenEnabled);
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  // Only cycle while the showcase is actually on screen.
  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { threshold: 0.35 });
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

  // Reduced-motion users keep the auto-advance (it is a content change, not motion); only the progress animation is dropped by the global rule.
  const running = auto && visible && !docHidden && !fs;

  // Auto-advance every 5 s while idle.
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

  // Video: play only while its panel is active.
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

  const items = useMemo(() => s.items, [s.items]);
  const cur = items[i];
  const idx = (k: number) => String(k + 1).padStart(2, "0");
  const chip = "inline-flex h-9 items-center gap-1.5 rounded-md border border-[#f4f2ed]/25 bg-[#17150f]/55 px-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f4f2ed] backdrop-blur transition-colors hover:border-[#f4f2ed]/60 hover:bg-[#17150f]/75";

  return (
    <section ref={root} className="container-x" aria-labelledby="showcase-title" onPointerDownCapture={stop} onKeyDownCapture={stop} data-auto={auto} data-running={running}>
      {/* Header row */}
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="index">{idx(sectionIndex - 1)}</span>
            <span className="eyebrow">{s.tag}</span>
          </div>
          <h2 id="showcase-title" className="h-section">
            {s.title}
          </h2>
          <p className="lead mt-4 max-w-xl">{s.text}</p>
        </div>
        <div className="caption flex items-center gap-2" aria-live="polite">
          <span className={cn("dot", running ? "bg-accent animate-pulse" : auto ? "bg-accent" : "bg-faint")} />
          {auto ? s.auto : s.paused}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Stage */}
        <div className="lg:col-span-9">
          <div
            ref={stage}
            className="showcase-stage frame stage relative aspect-[4/3] outline-none sm:aspect-[16/9]"
            tabIndex={0}
            onKeyDown={onKey}
            role="group"
            aria-roledescription="carousel"
            aria-label={s.title}
          >
            {/* 01 — sketch → picture */}
            <div className={cn("absolute inset-0 transition-opacity duration-500", i === 0 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 0}>
              <BeforeAfter before={media.before} after={media.after} labels={compareLabels} aspect="h-full w-full" />
            </div>

            {/* 02 — Web Viewer (mounted on first open; phones get tap-to-load) */}
            <div className={cn("absolute inset-0 transition-opacity duration-500", i === 1 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 1}>
              {opened[1] ? (
                <ViewerDemo labels={viewerLabels} poster={media.viewerPoster} className="flex h-full flex-col rounded-none border-0" height="min-h-0 flex-1" autoload={desktop && i === 1} />
              ) : null}
            </div>

            {/* 03 — Live 3D walkthrough (clip loaded on first open) */}
            <div className={cn("absolute inset-0 transition-opacity duration-500", i === 2 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 2}>
              {opened[2] ? (
                <video ref={video} src={media.video} poster={media.videoPoster} muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={items[2]?.title} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.videoPoster} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-sm bg-[#17150f]/70 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur">
                <span className="dot bg-accent animate-pulse" />
                Live 3D
              </span>
            </div>

            {/* Stage chrome: counter (top-left) and controls (top-right) */}
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
              <span className={cn("pointer-events-auto", chip, i === 2 && "invisible")}>
                <span className="text-accent">{idx(i)}</span>
                <span className="opacity-60">/ {idx(n - 1)}</span>
                <span className="hidden sm:inline">· {cur?.tag}</span>
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

            {/* Fullscreen-only caption so the visitor still knows what they are looking at */}
            {fs ? (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
                <div className="max-w-xl rounded-md bg-[#17150f]/60 px-4 py-3 text-[#f4f2ed] backdrop-blur">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-70">{cur?.tag}</div>
                  <div className="mt-1 font-display text-[1.4rem] leading-tight">{cur?.title}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Rail: tabs with a 5 s progress line */}
        <div className="lg:col-span-3" role="tablist" aria-label={s.tag}>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-line lg:border-y lg:border-line">
            {items.map((it, k) => {
              const active = k === i;
              return (
                <button
                  key={it.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => manual(k)}
                  className={cn("group relative flex flex-col items-start text-left transition-colors lg:py-4", active ? "text-fg" : "text-muted hover:text-fg")}
                >
                  <span className="relative block h-px w-full overflow-hidden bg-line lg:hidden">
                    {active ? <span key={tick} className={cn("absolute inset-y-0 left-0 bg-accent", running ? "showcase-progress" : "w-full")} /> : null}
                  </span>
                  <span className="mt-2.5 flex items-center gap-2 lg:mt-0">
                    <span className={cn("index", !active && "text-faint")}>{idx(k)}</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em]">{it.tag}</span>
                  </span>
                  <span className={cn("mt-1 font-display leading-tight", "text-[1rem] sm:text-[1.15rem] lg:text-[1.25rem]")}>{it.title}</span>
                  <span className="mt-1.5 hidden text-[13.5px] leading-relaxed text-muted lg:block">{it.text}</span>
                  {active ? (
                    <Link href={p(it.href)} className="link-arrow mt-3 hidden text-[13px] lg:inline-flex" onClick={(e) => e.stopPropagation()}>
                      {it.cta}
                      <ArrowRight size={14} />
                    </Link>
                  ) : null}
                  <span className="relative mt-3 hidden h-px w-full overflow-hidden bg-line lg:block">
                    {active ? <span key={tick} className={cn("absolute inset-y-0 left-0 bg-accent", running ? "showcase-progress" : "w-full")} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Phone: the active item's text + link under the tabs */}
          <div className="mt-4 lg:hidden">
            <p className="text-[14px] leading-relaxed text-fg-2">{cur?.text}</p>
            <Link href={p(cur?.href ?? "/")} className="link-arrow mt-3 text-[13px]">
              {cur?.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
