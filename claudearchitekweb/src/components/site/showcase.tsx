"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./before-after";
import { ViewerDemo } from "./viewer-demo";

/**
 * Interactive showcase — the first screen of the homepage.
 * A large floating canvas (the stage, with drafting corner marks) and a glass control dock under it;
 * two glass cards beside it carry the headline and a "now showing" block that describes the selected
 * demonstration.
 *   01 sketch → finished picture (comparison slider)
 *   02 Web Viewer (rotate, change colour; library + model load only when opened, tap-to-load on phones)
 *   03 Live 3D walkthrough (short muted clip, loaded only when opened)
 * Selection is manual only (dock segments, ← → keys). No automatic switching. Fullscreen on the stage
 * where the API exists (hidden on iOS Safari). On phones the intro paragraph moves under the canvas
 * so the product itself is on the first screen.
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
  intro,
  ctas,
}: {
  locale: Locale;
  s: ShowcaseStrings;
  viewerLabels: { hint: string; swatches: string; ar: string; reset?: string; load?: string };
  compareLabels: [string, string];
  media: { before: string; after: string; video: string; videoPoster: string; viewerPoster?: string };
  /** Eyebrow + H1 (page-owned). */
  headline: ReactNode;
  /** Intro paragraph: under the headline on desktop, under the canvas on phones. */
  intro?: ReactNode;
  /** Primary / secondary buttons (page-owned). */
  ctas: ReactNode;
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

  const stage = (
    <div
      ref={stageRef}
      className="showcase-stage stage cad-host relative aspect-[4/3] w-full outline-none sm:aspect-[16/10]"
      tabIndex={0}
      onKeyDown={onKey}
      role="group"
      aria-roledescription="carousel"
      aria-label={s.title}
    >
      {/* 01 — sketch → picture */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", i === 0 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={i !== 0}>
        <BeforeAfter before={media.before} after={media.after} labels={compareLabels} aspect="h-full w-full" labelsAt="top" />
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
        <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-[#f4f2ed]/15 bg-[#17150f]/70 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#f4f2ed] backdrop-blur">
          <span className="dot bg-accent animate-pulse" />
          Live 3D
        </span>
      </div>

      {/* drafting corner marks */}
      <span className="cad cad-tl" aria-hidden />
      <span className="cad cad-tr" aria-hidden />
      <span className="cad cad-bl" aria-hidden />
      <span className="cad cad-br" aria-hidden />

      {/* Fullscreen-only caption */}
      {fs ? (
        <div className="pointer-events-none absolute right-5 bottom-5 max-w-md rounded-xl border border-[#f4f2ed]/12 bg-[#17150f]/65 px-4 py-3 text-right text-[#f4f2ed] backdrop-blur">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-70">{cur?.tag}</div>
          <div className="mt-1 text-[1.2rem] font-semibold leading-tight tracking-[-0.02em]">{cur?.title}</div>
        </div>
      ) : null}
    </div>
  );

  /** Control dock: three segments + fullscreen. Roving tabindex: only the selected segment is in the tab order. */
  const dock = (
    <div className="hx-dock glass-strong" role="tablist" aria-label={s.choose}>
      {s.items.map((it, k) => {
        const active = k === i;
        return (
          <button key={it.key} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => select(k)} onKeyDown={onKey} className={cn("hx-seg", active && "is-active")}>
            <span className="hx-seg-idx">{idx(k)}</span>
            <span className="min-w-0">
              <span className="hx-seg-tag">{it.tag}</span>
              <span className="hx-seg-title">{it.title}</span>
            </span>
          </button>
        );
      })}
      {fsSupported ? (
        <button type="button" className="hx-fs" onClick={toggleFs} aria-label={fs ? s.exitFullscreen : s.fullscreen} title={fs ? s.exitFullscreen : s.fullscreen}>
          {fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      ) : null}
    </div>
  );

  /** "Now showing": the selected demonstration, described in the text column. */
  const live = (
    <div className="hx-live" key={cur?.key}>
      <div className="hx-live-meta">
        <span className="hx-live-dot" />
        <span>{s.choose}</span>
        <span className="hx-live-count">
          <span className="text-accent">{idx(i)}</span> / {idx(n - 1)}
        </span>
      </div>
      <h2 className="hx-live-title">{cur?.title}</h2>
      <p className="hx-live-text">{cur?.text}</p>
      <Link href={p(cur?.href ?? "/")} className="hx-live-link">
        {cur?.cta}
        <ArrowRight size={15} />
      </Link>
    </div>
  );

  return (
    <div className="hx-hero">
      <div className="hx-hero-text glass-card">
        {headline}
        {intro ? <div className="hx-intro-desktop">{intro}</div> : null}
      </div>
      <div className="hx-hero-canvas">
        <div className="hx-canvas">{stage}</div>
        {dock}
      </div>
      <div className="hx-hero-live glass-card">
        {live}
        {intro ? <div className="hx-intro-mobile">{intro}</div> : null}
        <div className="hx-ctas">{ctas}</div>
      </div>
    </div>
  );
}
