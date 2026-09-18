"use client";

/**
 * Platform-accurate visual preview for one SMM variant card in post-editor.tsx.
 *
 * - A Mobile app / Desktop feed toggle, local to each card.
 * - A dedicated mockup per platform: Facebook (page header, a real collage grid, video player,
 *   like/comment/share bar), Instagram (feed carousel with dot pagination + "i/n" counter, or a
 *   9:16 Reels player with the engagement sidebar and a music/profile tag when the format is
 *   vertical), Telegram (a grouped "album" card plus a static preview of the Armenian approval
 *   keyboard the bot actually sends), LinkedIn (a professional feed card). Anything else (YouTube,
 *   TikTok, …) falls back to a generic feed card.
 * - Every image goes through the same Smart Canvas the publish pipeline uses (see
 *   /api/admin/media-canvas -> lib/social/canvas.ts): "what you see is what gets published", not a
 *   second source of truth. A single hero image (Facebook's/Telegram's lone photo, Instagram's
 *   carousel) is framed at the canvas's own aspect ratio so the no-crop padding is actually visible;
 *   a multi-photo grid tile stays a cropped thumbnail, the same simplification every one of these
 *   apps itself makes for a grid cell.
 *
 * Pure presentation: no data fetching beyond the canvas endpoint's own image bytes, no server
 * actions. Canvas mode/matte are chosen by the caller (VariantCard, from the variant's own saved
 * or default choice) — this component only renders them.
 */
import { useRef, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Globe, Heart, MessageCircle, Monitor, Music2, Send, Share2, Smartphone, ThumbsUp } from "lucide-react";
import type { PlatformMeta } from "@/components/admin/smm/platform-chip";
import { cn } from "@/lib/utils";

export type PreviewAsset = { id: string; name: string; mime: string; thumbUrl: string; url: string };

/** Mirrors lib/social/canvas.ts's CanvasMode/CanvasMatte — duplicated as a plain client-safe type
 * (that module pulls in sharp/fs and must never enter the browser bundle). */
export type CanvasMode = "original" | "smart_4_5" | "story_9_16";
export type CanvasMatte = "blur" | "dark";

export type PreviewLabels = {
  preview: string;
  deviceMobile: string;
  deviceDesktop: string;
  noMedia: string;
  noVideoAttached: string;
  safeZoneCaption: string;
  safeZoneUi: string;
  carouselPrev: string;
  carouselNext: string;
  seeMore: string;
  seeLess: string;
  likeWord: string;
  commentWord: string;
  shareWord: string;
  sendWord: string;
  publicWord: string;
};

type Device = "mobile" | "desktop";
/** A swipe shorter than this is a tap or a scroll attempt, not a page turn. */
const SWIPE_THRESHOLD_PX = 40;

/** The exact render the publish pipeline would use for this image: the source file untouched for
 * "original", or the padded/blurred Smart Canvas JPEG from the same code path as lib/smm.ts. */
function canvasSrc(asset: PreviewAsset, mode: CanvasMode, matte: CanvasMatte): string {
  if (mode === "original") return asset.url || asset.thumbUrl;
  return `/api/admin/media-canvas?assetId=${encodeURIComponent(asset.id)}&mode=${mode}&matte=${matte}`;
}

/** The frame a single, full-size image should sit in: the canvas's own target ratio once a Smart
 * Canvas mode is chosen (so the letterbox/pillarbox padding is visible, not cropped back off by the
 * mock's own frame), otherwise the caller's platform-default. */
function frameAspect(mode: CanvasMode, fallback: string): string {
  if (mode === "smart_4_5") return "4 / 5";
  if (mode === "story_9_16") return "9 / 16";
  return fallback;
}

function DeviceToggle({ device, onChange, labels }: { device: Device; onChange: (d: Device) => void; labels: PreviewLabels }) {
  return (
    <div role="group" aria-label={labels.preview} className="inline-flex flex-none rounded-sm border border-line p-0.5">
      {(["mobile", "desktop"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={device === d}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-sm px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors",
            device === d ? "bg-fg text-inverse-fg" : "text-muted hover:text-fg",
          )}
        >
          {d === "mobile" ? <Smartphone size={12} aria-hidden /> : <Monitor size={12} aria-hidden />}
          {d === "mobile" ? labels.deviceMobile : labels.deviceDesktop}
        </button>
      ))}
    </div>
  );
}

/** Caption text that clamps past a few lines with a "See more / See less" toggle, like every one of
 * these apps does for a long post. */
function Caption({ children, labels, lines = 3, className }: { children: React.ReactNode; labels: PreviewLabels; lines?: 2 | 3 | 6; className?: string }) {
  const [open, setOpen] = useState(false);
  const clampCls = lines === 2 ? "line-clamp-2" : lines === 6 ? "line-clamp-6" : "line-clamp-3";
  return (
    <div className={className}>
      <p className={cn("whitespace-pre-wrap", !open && clampCls)}>{children}</p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[11px] font-medium text-muted hover:text-fg">
        {open ? labels.seeLess : labels.seeMore}
      </button>
    </div>
  );
}

/**
 * Facebook-style collage: 1 photo full width, 2 split evenly, 3 as one large + two stacked, 4+ as a
 * 2x2 grid with a "+N" badge on the last tile. Reused by the Telegram album card, which groups media
 * the same way. A single photo is framed at the Smart Canvas ratio (see `frameAspect`); a grid tile
 * stays a cropped thumbnail, matching how these apps themselves render a grid cell.
 */
function Collage({ images, canvasMode, canvasMatte, device, labels }: { images: PreviewAsset[]; canvasMode: CanvasMode; canvasMatte: CanvasMatte; device: Device; labels: PreviewLabels }) {
  const n = images.length;
  if (n === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 p-6 text-center text-[11px] text-muted", device === "desktop" ? "aspect-[1.91/1]" : "aspect-square")}>
        {labels.noMedia}
      </div>
    );
  }
  const src = (a: PreviewAsset) => canvasSrc(a, canvasMode, canvasMatte);
  if (n === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src(images[0])} alt="" loading="lazy" className="w-full bg-surface-2 object-cover" style={{ aspectRatio: frameAspect(canvasMode, device === "desktop" ? "1.91 / 1" : "1 / 1") }} />
    );
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-surface-2" style={{ aspectRatio: "2 / 1" }}>
        {images.slice(0, 2).map((a) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={src(a)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ))}
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 bg-surface-2" style={{ aspectRatio: "4 / 3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(images[0])} alt="" loading="lazy" className="row-span-2 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(images[1])} alt="" loading="lazy" className="h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(images[2])} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }
  const shown = images.slice(0, 4);
  const extra = n - 4;
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 bg-surface-2" style={{ aspectRatio: "1 / 1" }}>
      {shown.map((a, i) => (
        <div key={a.id} className="relative h-full w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(a)} alt="" loading="lazy" className="h-full w-full object-cover" />
          {i === 3 && extra > 0 ? (
            <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-inverse-bg/55 font-display text-lg font-semibold text-inverse-fg">
              +{extra}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** One image at a time: prev/next arrows, a touch swipe, and either a dot row (Instagram) or an
 * "i / n" counter badge. Framed at the Smart Canvas ratio once a mode is chosen, so the operator
 * sees the actual no-crop padding, not a re-cropped thumbnail. */
function SwipeCarousel({
  images, canvasMode, canvasMatte, aspect, dots, labels,
}: {
  images: PreviewAsset[];
  canvasMode: CanvasMode;
  canvasMatte: CanvasMatte;
  aspect: string;
  dots?: boolean;
  labels: PreviewLabels;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const n = images.length;
  const clamp = (i: number) => (n ? ((i % n) + n) % n : 0);
  const go = (delta: number) => setIndex((i) => clamp(i + delta));

  if (!n) {
    return (
      <div className="flex items-center justify-center bg-surface-2 p-6 text-center text-[11px] text-muted" style={{ aspectRatio: aspect }}>
        {labels.noMedia}
      </div>
    );
  }
  const shown = images[clamp(index)];
  return (
    <div
      className="relative overflow-hidden bg-surface-2"
      style={{ aspectRatio: frameAspect(canvasMode, aspect) }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={canvasSrc(shown, canvasMode, canvasMatte)} alt="" loading="lazy" className="h-full w-full object-cover" />
      {n > 1 ? (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={labels.carouselPrev} className="absolute top-1/2 left-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-bg/60 text-inverse-fg transition-colors hover:bg-inverse-bg/80">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} aria-label={labels.carouselNext} className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-bg/60 text-inverse-fg transition-colors hover:bg-inverse-bg/80">
            <ChevronRight size={16} aria-hidden />
          </button>
          <span aria-hidden className="num absolute right-1.5 bottom-1.5 rounded bg-inverse-bg/80 px-1.5 py-0.5 text-[10px] font-semibold text-inverse-fg">
            {clamp(index) + 1}/{n}
          </span>
          {dots ? (
            <div aria-hidden className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1">
              {images.map((a, i) => (
                <span key={a.id} className={cn("h-1.5 w-1.5 rounded-full transition-colors", clamp(index) === i ? "bg-inverse-fg" : "bg-inverse-fg/40")} />
              ))}
            </div>
          ) : null}
          <span className="sr-only" aria-live="polite">{clamp(index) + 1} / {n}</span>
        </>
      ) : null}
    </div>
  );
}

/** Facebook page post: avatar + page name header, the real collage grid (or a playable video), and
 * the authentic Like / Comment / Share bar. */
function FacebookMock({
  device, meta, brandName, images, video, canvasMode, canvasMatte, needsTitle, title, text, cta, tags, labels,
}: {
  device: Device; meta?: PlatformMeta; brandName: string; images: PreviewAsset[]; video?: PreviewAsset;
  canvasMode: CanvasMode; canvasMatte: CanvasMatte; needsTitle: boolean; title: string; text: string; cta: string; tags: string; labels: PreviewLabels;
}) {
  return (
    <div className={cn("frame overflow-hidden bg-surface transition-[max-width]", device === "desktop" ? "mx-auto max-w-md" : "mx-auto max-w-[300px]")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span aria-hidden className="h-9 w-9 flex-none rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{brandName}</p>
          <p className="flex items-center gap-1 text-[10.5px] text-faint">
            <Globe size={9} aria-hidden /> {labels.publicWord}
          </p>
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-2.5 text-[12.5px] text-fg-2">
        {needsTitle && title ? <p className="font-semibold text-fg">{title}</p> : null}
        <Caption labels={labels}>{text}</Caption>
        {cta ? <p className="font-medium text-fg">{cta}</p> : null}
        {tags ? <p className="text-accent">{tags}</p> : null}
      </div>
      {video ? (
        <video src={video.url} controls playsInline className="w-full bg-black object-contain" style={{ aspectRatio: "16 / 9" }} />
      ) : (
        <Collage images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} device={device} labels={labels} />
      )}
      <div className="flex items-center gap-4 border-t border-line px-3 py-2 text-[11px] font-medium text-muted">
        <span className="inline-flex items-center gap-1.5"><ThumbsUp size={14} aria-hidden /> {labels.likeWord}</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} aria-hidden /> {labels.commentWord}</span>
        <span className="ml-auto inline-flex items-center gap-1.5"><Share2 size={14} aria-hidden /> {labels.shareWord}</span>
      </div>
    </div>
  );
}

/** LinkedIn feed post: same shape as Facebook's card (LinkedIn's own multi-photo grid behaves the
 * same way), a professional header, and LinkedIn's own reaction words. */
function LinkedInMock({
  device, meta, brandName, images, video, canvasMode, canvasMatte, needsTitle, title, text, cta, tags, labels,
}: {
  device: Device; meta?: PlatformMeta; brandName: string; images: PreviewAsset[]; video?: PreviewAsset;
  canvasMode: CanvasMode; canvasMatte: CanvasMatte; needsTitle: boolean; title: string; text: string; cta: string; tags: string; labels: PreviewLabels;
}) {
  return (
    <div className={cn("frame overflow-hidden bg-surface transition-[max-width]", device === "desktop" ? "mx-auto max-w-md" : "mx-auto max-w-[300px]")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span aria-hidden className="h-9 w-9 flex-none rounded-sm" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{brandName}</p>
          <p className="text-[10.5px] text-faint">{labels.publicWord}</p>
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-2.5 text-[12.5px] text-fg-2">
        {needsTitle && title ? <p className="font-semibold text-fg">{title}</p> : null}
        <Caption labels={labels}>{text}</Caption>
        {cta ? <p className="font-medium text-fg">{cta}</p> : null}
        {tags ? <p className="text-accent">{tags}</p> : null}
      </div>
      {video ? (
        <video src={video.url} controls playsInline className="w-full bg-black object-contain" style={{ aspectRatio: "16 / 9" }} />
      ) : (
        <Collage images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} device={device} labels={labels} />
      )}
      <div className="flex items-center gap-4 border-t border-line px-3 py-2 text-[11px] font-medium text-muted">
        <span className="inline-flex items-center gap-1.5"><ThumbsUp size={14} aria-hidden /> {labels.likeWord}</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} aria-hidden /> {labels.commentWord}</span>
        <span className="ml-auto inline-flex items-center gap-1.5"><Share2 size={14} aria-hidden /> {labels.shareWord}</span>
      </div>
    </div>
  );
}

/** Instagram feed post: gradient avatar ring, a real swipeable 4:5 carousel with dot pagination and
 * an "i/n" counter, then Heart / Comment / Share / Save and the "username caption" line. */
function InstagramFeedMock({
  device, brandName, images, canvasMode, canvasMatte, text, cta, tags, labels,
}: {
  device: Device; brandName: string; images: PreviewAsset[]; canvasMode: CanvasMode; canvasMatte: CanvasMatte; text: string; cta: string; tags: string; labels: PreviewLabels;
}) {
  const handle = brandName.toLowerCase().replace(/\s+/g, "");
  return (
    <div className={cn("frame overflow-hidden bg-surface transition-[max-width]", device === "desktop" ? "mx-auto max-w-md" : "mx-auto max-w-[300px]")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span aria-hidden className="h-8 w-8 flex-none rounded-full" style={{ background: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)" }} />
        <span className="truncate text-[12.5px] font-semibold text-fg">{handle}</span>
      </div>
      <SwipeCarousel images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} aspect="4 / 5" dots labels={labels} />
      <div className="flex items-center gap-3 px-3 pt-2.5 text-fg">
        <Heart size={19} aria-hidden />
        <MessageCircle size={19} aria-hidden />
        <Send size={19} aria-hidden />
        <Bookmark size={19} aria-hidden className="ml-auto" />
      </div>
      <div className="space-y-1 px-3 py-2 text-[12.5px] text-fg-2">
        <Caption labels={labels}>
          <span className="mr-1 font-semibold text-fg">{handle}</span>
          {text}
        </Caption>
        {cta ? <p className="font-medium text-fg">{cta}</p> : null}
        {tags ? <p className="text-accent">{tags}</p> : null}
      </div>
    </div>
  );
}

/**
 * Vertical 9:16 phone mockup for `reel` / `short` (Instagram Reels, TikTok, YouTube Shorts) or a
 * platform-generic `video`: a real `<video controls>` (or the cover thumbnail while nothing decodes
 * yet), a brand bar top-left, and two dashed safe-zone overlays — the bottom caption band (drawn from
 * the real title + text, so a long caption visibly crowds it) and the right-edge action-button column
 * every short-video platform reserves for like/comment/share.
 */
function ReelPreview({
  video, poster, device, meta, brandName, labels, caption,
}: {
  video?: PreviewAsset;
  poster: string;
  device: Device;
  meta?: PlatformMeta;
  brandName: string;
  labels: PreviewLabels;
  caption: React.ReactNode;
}) {
  return (
    <div className="flex justify-center bg-surface-2 py-4">
      <div
        className={cn("relative overflow-hidden rounded-[26px] border-[3px] border-fg/70 bg-black shadow-lift", device === "desktop" ? "w-[300px]" : "w-[220px]")}
        style={{ aspectRatio: "9 / 16" }}
      >
        {video ? (
          <video src={video.url} poster={poster || undefined} controls playsInline className="h-full w-full object-cover" />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[11px] text-white/60">
            {labels.noVideoAttached}
          </div>
        )}

        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent px-2.5 py-2">
          <span className="h-5 w-5 flex-none rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
          <span className="truncate text-[10.5px] font-semibold text-white/95">{brandName}</span>
        </div>

        <div aria-hidden className="pointer-events-none absolute top-1/3 right-1.5 flex flex-col items-center gap-2.5">
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 font-mono text-[6.5px] font-semibold tracking-wide text-white/85 uppercase [writing-mode:vertical-rl]">
            {labels.safeZoneUi}
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 w-6 rounded-full border border-dashed border-white/55" />
          ))}
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[26%] flex-col justify-end gap-1 border-t border-dashed border-white/45 bg-gradient-to-t from-black/75 to-transparent px-2.5 pt-4 pb-2.5">
          <span className="font-mono text-[7px] font-semibold tracking-wide text-white/70 uppercase">{labels.safeZoneCaption}</span>
          {caption}
        </div>
      </div>
    </div>
  );
}

/** Instagram Reels: the same vertical frame, but with the real Instagram chrome — profile handle and
 * a music/sound note bottom-left, and a Heart / Comment / Share column on the right instead of the
 * generic dashed safe-zone markers other platforms get. */
function InstagramReelsMock({
  video, poster, device, brandName, labels, caption,
}: {
  video?: PreviewAsset; poster: string; device: Device; brandName: string; labels: PreviewLabels; caption: React.ReactNode;
}) {
  return (
    <div className="flex justify-center bg-surface-2 py-4">
      <div
        className={cn("relative overflow-hidden rounded-[26px] border-[3px] border-fg/70 bg-black shadow-lift", device === "desktop" ? "w-[300px]" : "w-[220px]")}
        style={{ aspectRatio: "9 / 16" }}
      >
        {video ? (
          <video src={video.url} poster={poster || undefined} controls playsInline className="h-full w-full object-cover" />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[11px] text-white/60">
            {labels.noVideoAttached}
          </div>
        )}

        <div aria-hidden className="pointer-events-none absolute right-1.5 bottom-16 flex flex-col items-center gap-3.5 text-white">
          <Heart size={20} aria-hidden />
          <MessageCircle size={20} aria-hidden />
          <Send size={20} aria-hidden />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-8 pb-3 pr-10">
          <p className="truncate text-[11px] font-semibold text-white">@{brandName.toLowerCase().replace(/\s+/g, "")}</p>
          {caption}
          <p className="flex items-center gap-1 text-[9.5px] text-white/75">
            <Music2 size={10} aria-hidden /> {brandName}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Telegram: a grouped "album" card (the same collage a channel post shows for multiple photos) plus
 * a static preview of the real approval keyboard the bot sends — always Armenian, regardless of the
 * admin UI's own language (see approvalButtons in lib/smm.ts). */
function TelegramMock({
  device, images, video, canvasMode, canvasMatte, needsTitle, title, text, cta, tags, labels,
}: {
  device: Device; images: PreviewAsset[]; video?: PreviewAsset; canvasMode: CanvasMode; canvasMatte: CanvasMatte;
  needsTitle: boolean; title: string; text: string; cta: string; tags: string; labels: PreviewLabels;
}) {
  return (
    <div className={cn("mx-auto transition-[max-width]", device === "desktop" ? "max-w-md" : "max-w-[300px]")}>
      <div className="frame overflow-hidden bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Send size={13} aria-hidden className="text-accent" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">Telegram</span>
        </div>
        {video ? (
          <video src={video.url} controls playsInline className="w-full bg-black object-contain" style={{ aspectRatio: "16 / 9" }} />
        ) : (
          <Collage images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} device={device} labels={labels} />
        )}
        <div className="space-y-1.5 px-3 py-2.5 text-[12.5px] text-fg-2">
          {needsTitle && title ? <p className="font-semibold text-fg">{title}</p> : null}
          <Caption labels={labels}>{text}</Caption>
          {cta ? <p className="font-medium text-fg">{cta}</p> : null}
          {tags ? <p className="text-accent">{tags}</p> : null}
        </div>
      </div>
      <div aria-hidden className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[11.5px] font-medium text-fg-2">
        <span className="rounded-sm border border-line bg-surface-2 py-1.5">✅ Հաստատել</span>
        <span className="rounded-sm border border-line bg-surface-2 py-1.5">✏️ Փոխել տեքստը</span>
        <span className="rounded-sm border border-line bg-surface-2 py-1.5">🕐 Հետաձգել</span>
        <span className="rounded-sm border border-line bg-surface-2 py-1.5">❌ Չեղարկել</span>
      </div>
    </div>
  );
}

/** Generic feed card for platforms without a bespoke mockup (YouTube, TikTok, …): a simple carousel
 * plus caption, no platform-specific chrome. */
function FeedCard({
  device, meta, brandName, images, canvasMode, canvasMatte, needsTitle, title, text, cta, tags, labels,
}: {
  device: Device; meta?: PlatformMeta; brandName: string; images: PreviewAsset[]; canvasMode: CanvasMode; canvasMatte: CanvasMatte;
  needsTitle: boolean; title: string; text: string; cta: string; tags: string; labels: PreviewLabels;
}) {
  return (
    <div className={cn("frame overflow-hidden bg-surface transition-[max-width]", device === "desktop" ? "mx-auto max-w-md" : "mx-auto max-w-[300px]")}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span aria-hidden className="h-7 w-7 flex-none rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
        <span className="truncate text-[12.5px] font-semibold text-fg">{brandName}</span>
        <span className="ml-auto flex-none font-mono text-[10px] tracking-[0.08em] text-faint uppercase">{meta?.label}</span>
      </div>
      <SwipeCarousel images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} aspect={device === "desktop" ? "1.91 / 1" : "1 / 1"} labels={labels} />
      <div className="space-y-2 px-3 py-2.5 text-xs text-fg-2">
        {needsTitle && title ? <p className="font-semibold text-fg">{title}</p> : null}
        <p className="line-clamp-6 whitespace-pre-wrap">{text}</p>
        {cta ? <p className="font-medium text-fg">{cta}</p> : null}
        {tags ? <p className="text-accent">{tags}</p> : null}
      </div>
    </div>
  );
}

export function VariantPreview({
  platform, format, meta, images, video, needsTitle, title, text, cta, tags, brandName, labels, canvasMode, canvasMatte,
}: {
  platform: string;
  format: string;
  meta?: PlatformMeta;
  images: PreviewAsset[];
  video?: PreviewAsset;
  needsTitle: boolean;
  title: string;
  text: string;
  cta: string;
  tags: string;
  brandName: string;
  labels: PreviewLabels;
  /** The effective Smart Canvas choice for this variant (already resolved from "auto" by the caller). */
  canvasMode: CanvasMode;
  canvasMatte: CanvasMatte;
}) {
  const [device, setDevice] = useState<Device>("mobile");
  // Reel/Short is a vertical placement on every platform; a platform's own longer-form "video" stays
  // in its normal feed frame (a Facebook video post is not a phone-shaped 9:16 clip).
  const isVertical = format === "reel" || format === "short";
  const feedVideo = format === "video" ? video : undefined;
  const clippedText = text.slice(0, 600) || "…";

  let body: React.ReactNode;
  if (isVertical) {
    const poster = images[0] ? canvasSrc(images[0], canvasMode, canvasMatte) : "";
    const caption = (
      <>
        {needsTitle && title ? <p className="line-clamp-1 text-[11px] font-semibold text-white">{title}</p> : null}
        <p className="line-clamp-2 text-[11px] text-white/90">{text || "…"}</p>
      </>
    );
    body = platform === "instagram" ? (
      <InstagramReelsMock video={video} poster={poster} device={device} brandName={brandName} labels={labels} caption={caption} />
    ) : (
      <ReelPreview video={video} poster={poster} device={device} meta={meta} brandName={brandName} labels={labels} caption={caption} />
    );
  } else if (platform === "facebook") {
    body = <FacebookMock device={device} meta={meta} brandName={brandName} images={images} video={feedVideo} canvasMode={canvasMode} canvasMatte={canvasMatte} needsTitle={needsTitle} title={title} text={clippedText} cta={cta} tags={tags} labels={labels} />;
  } else if (platform === "instagram") {
    body = <InstagramFeedMock device={device} brandName={brandName} images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} text={clippedText} cta={cta} tags={tags} labels={labels} />;
  } else if (platform === "telegram") {
    body = <TelegramMock device={device} images={images} video={feedVideo} canvasMode={canvasMode} canvasMatte={canvasMatte} needsTitle={needsTitle} title={title} text={clippedText} cta={cta} tags={tags} labels={labels} />;
  } else if (platform === "linkedin") {
    body = <LinkedInMock device={device} meta={meta} brandName={brandName} images={images} video={feedVideo} canvasMode={canvasMode} canvasMatte={canvasMatte} needsTitle={needsTitle} title={title} text={clippedText} cta={cta} tags={tags} labels={labels} />;
  } else {
    body = <FeedCard device={device} meta={meta} brandName={brandName} images={images} canvasMode={canvasMode} canvasMatte={canvasMatte} needsTitle={needsTitle} title={title} text={clippedText} cta={cta} tags={tags} labels={labels} />;
  }

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.preview}</span>
        <DeviceToggle device={device} onChange={setDevice} labels={labels} />
      </div>
      {body}
    </div>
  );
}
