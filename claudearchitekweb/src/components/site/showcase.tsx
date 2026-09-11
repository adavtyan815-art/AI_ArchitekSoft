"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./before-after";
import { ViewerDemo } from "./viewer-demo";

/**
 * Interactive showcase — the product console on the first screen.
 * One stage, three demonstrations chosen with an always-visible selector (three option buttons;
 * the selected one is filled ink, larger and marked with the accent index):
 *   01 sketch → finished picture (comparison slider)
 *   02 Web Viewer (rotate, change colour; library + model load only when opened, tap-to-load on phones)
 *   03 Live 3D walkthrough (short muted clip, loaded only when opened)
 * Selection is manual only (buttons, ← → keys). No automatic switching. Fullscreen on the stage where
 * the API exists (hidden on iOS Safari).
 *
 * Layout: stage (8 cols) + rail (4 cols) on wide screens; on phones the headline comes first, then the stage,
 * the selector as a segmented row, then the intro. The page passes the text blocks in as slots.
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
  viewerLabels,
  compareLabels,
  media,
  headline,
  headlineMobile,
  ctas,
  introMobile,
}: {
  locale: Locale;
  s: ShowcaseStrings;
  viewerLabels: { hint: string; swatches: string; ar: string; reset?: string; load?: string };
  compareLabels: [string, string];
  media: { before: string; after: string; video: string; videoPoster: string; viewerPoster?: string };
  /** Rail content on wide screens: eyebrow, H1, intro. */
  headline: ReactNode;
  /** Compact headline shown above the stage on phones and tablets. */
  headlineMobile: ReactNode;
  /** Primary / secondary buttons. */
  ctas: ReactNode;
  /** Intro paragraph shown after the console on phones and tablets. */
  introMobile: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [fs, setFs] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [opened, setOpened] = useState<boolean[]>(() => s.items.map((_, k) => k === 0));
  const n = s.items.length;
  const p = (path: string) => localePath(locale, path);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    setDesktop(window.matchMedia("(pointer: fine)").matches && !nav.connection?.saveData);
    setFsSupported(!!document.fullscreenEnabled);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const select = useCallback(
    (k: number) => {
      const next = ((k % n) + n) % n;
      setI(next);
      setOpened((o) => (o[next] ? o : o.map((v, idx) => v || idx === next)));
    },
    [n],
  );

  // The clip plays only while its panel is active.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (s.items[i]?.key === "live") v.play().catch(() => {});
    else v.pause();
  }, [i, s.items, opened]);

  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen?.();
    } catch {
      /* unsupported */
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(i - 1);
    } else if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const cur = s.items[i];
  const idx = (k: number) => String(k + 1).padStart(2, "0");
  const chip = "inline-flex h-9 items-center gap-1.5 rounded-md border border-[#f4f2ed]/25 bg-[#17150f]/55 px-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f4f2ed] backdrop-blur transition-colors hover:border-[#f4f2ed]/60 hover:bg-[#17150f]/75";

  const stage = (
    <div
      ref={stageRef}
      className="showcase-stage stage relative aspect-[4/3] w-full outline-none sm:aspect-[16/9] lg:aspect-auto lg:min-h-[440px] lg:flex-1"
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

      {/* Stage chrome: counter (top-left), fullscreen (top-right) */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
        <span className={cn("pointer-events-auto", chip)} aria-live="polite">
          <span className="text-accent">{idx(i)}</span>
          <span className="opacity-60">/ {idx(n - 1)}</span>
          <span className="hidden sm:inline">· {cur?.tag}</span>
        </span>
        {fsSupported ? (
          <button type="button" className={cn("pointer-events-auto", chip)} onClick={toggleFs} aria-label={fs ? s.exitFullscreen : s.fullscreen}>
            {fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{fs ? s.exitFullscreen : s.fullscreen}</span>
          </button>
        ) : null}
      </div>

      {/* Fullscreen-only caption */}
      {fs ? (
        <div className="pointer-events-none absolute right-4 bottom-4 max-w-md rounded-md bg-[#17150f]/60 px-4 py-3 text-right text-[#f4f2ed] backdrop-blur">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-70">{cur?.tag}</div>
          <div className="mt-1 font-display text-[1.3rem] leading-tight">{cur?.title}</div>
        </div>
      ) : null}
    </div>
  );

  /** Three option buttons. Vertical list on wide screens (`lg:`), a segmented row below. */
  const selector = (
    <div role="tablist" aria-label={s.choose}>
      <div className="mb-2 flex items-center justify-between">
        <span className="kicker">{s.choose}</span>
        <span className="caption">
          <span className="text-accent">{idx(i)}</span> / {idx(n - 1)}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 lg:gap-2">
        {s.items.map((it, k) => {
          const active = k === i;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(k)}
              className={cn(
                "opt group relative min-w-0 rounded-lg border text-left transition-[background-color,border-color,color,padding,transform] duration-200",
                "px-3.5 py-2.5 lg:px-4",
                active ? "border-fg bg-fg text-bg py-3 pl-4 lg:py-4 lg:pl-5" : "border-line bg-surface text-fg-2 hover:border-fg hover:text-fg lg:py-3",
              )}
            >
              {active ? <span aria-hidden className="opt-bar absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent lg:inset-y-3" /> : null}
              <span className="flex items-center gap-2">
                <span className={cn("index", active ? "text-accent" : "text-faint")}>{idx(k)}</span>
                <span className={cn("truncate font-mono text-[10.5px] uppercase tracking-[0.12em]", active ? "text-bg/70" : "text-muted")}>{it.tag}</span>
              </span>
              <span className={cn("mt-0.5 block pr-6 font-display leading-tight transition-[font-size] duration-200", active ? "text-[1.15rem] lg:text-[1.3rem]" : "text-[1.02rem] lg:text-[1.1rem]")}>{it.title}</span>
              {active ? <ArrowRight size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-bg/70" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  /** Caption bar: what the active demonstration is, and the link to its page. */
  const caption = (
    <div className="flex flex-col gap-2 border-t border-line px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
      <p className="min-w-0 text-[13px] leading-relaxed text-fg-2 sm:truncate sm:text-[13.5px]">{cur?.text}</p>
      <Link href={p(cur?.href ?? "/")} className="link-arrow flex-none text-[13px]">
        {cur?.cta}
        <ArrowRight size={14} />
      </Link>
    </div>
  );

  return (
    <div className="console grid gap-5 lg:grid-cols-12 lg:gap-6">
      <div className="lg:hidden">{headlineMobile}</div>
      <div className="stage-frame stage-in frame overflow-hidden lg:col-span-8 lg:flex lg:flex-col">
        {stage}
        {caption}
      </div>
      <div className="flex flex-col lg:col-span-4">
        <div className="hidden lg:block">{headline}</div>
        <div className="rise lg:mt-5" style={{ "--d": "300ms" } as React.CSSProperties}>{selector}</div>
        <div className="rise mt-5 flex flex-col gap-2.5 sm:flex-row lg:mt-5 [&>a]:w-full sm:[&>a]:w-auto lg:[&>a]:flex-1" style={{ "--d": "380ms" } as React.CSSProperties}>{ctas}</div>
        <div className="mt-5 lg:hidden">{introMobile}</div>
      </div>
    </div>
  );
}
