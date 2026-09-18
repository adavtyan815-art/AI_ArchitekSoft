"use client";

/**
 * Platform-accurate visual preview for one SMM variant card in post-editor.tsx.
 *
 * - A Mobile app / Desktop feed toggle, local to each card.
 * - A real image carousel (prev/next, swipe, "i/n" counter) for the `image` / `carousel` formats,
 *   built from the post's own attached media in the order the owner set in the media strip.
 * - A 9:16 phone mockup with video controls and dashed safe-zone overlays (top brand bar, bottom
 *   caption band, right-edge action-button column) for `video` / `reel` / `short`, so the owner can
 *   see whether the caption text or a kitchen/furniture detail near an edge would be covered by the
 *   platform's own UI.
 *
 * Pure presentation: no data fetching, no server actions. Everything it draws comes from props the
 * caller already has on screen (the same media strip and text every variant publishes from), so this
 * is "what you see is what gets published", not a second source of truth.
 */
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Monitor, Smartphone } from "lucide-react";
import type { PlatformMeta } from "@/components/admin/smm/platform-chip";
import { cn } from "@/lib/utils";

export type PreviewAsset = { id: string; name: string; mime: string; thumbUrl: string; url: string };

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
};

type Device = "mobile" | "desktop";
/** A swipe shorter than this is a tap or a scroll attempt, not a page turn. */
const SWIPE_THRESHOLD_PX = 40;

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

/** One image at a time: prev/next arrows, a touch swipe, and an "i / n" counter — only shown past one image. */
function ImageCarousel({ images, device, labels }: { images: PreviewAsset[]; device: Device; labels: PreviewLabels }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const n = images.length;
  const clamp = (i: number) => (n ? ((i % n) + n) % n : 0);
  const go = (delta: number) => setIndex((i) => clamp(i + delta));

  if (!n) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 p-6 text-center text-[11px] text-muted", device === "desktop" ? "aspect-[1.91/1]" : "aspect-square")}>
        {labels.noMedia}
      </div>
    );
  }
  const shown = images[clamp(index)];
  return (
    <div
      className={cn("relative overflow-hidden bg-surface-2", device === "desktop" ? "aspect-[1.91/1]" : "aspect-square")}
      onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shown.thumbUrl || shown.url} alt="" loading="lazy" className="h-full w-full object-cover" />
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
          <span className="sr-only" aria-live="polite">{clamp(index) + 1} / {n}</span>
        </>
      ) : null}
    </div>
  );
}

/** Feed-style card for image / carousel formats: mobile app card vs. a wider desktop feed post. */
function FeedCard({
  device, meta, brandName, images, needsTitle, title, text, cta, tags, labels,
}: {
  device: Device;
  meta?: PlatformMeta;
  brandName: string;
  images: PreviewAsset[];
  needsTitle: boolean;
  title: string;
  text: string;
  cta: string;
  tags: string;
  labels: PreviewLabels;
}) {
  return (
    <div className={cn("frame overflow-hidden bg-surface transition-[max-width]", device === "desktop" ? "mx-auto max-w-md" : "mx-auto max-w-[300px]")}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span aria-hidden className="h-7 w-7 flex-none rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
        <span className="truncate text-[12.5px] font-semibold text-fg">{brandName}</span>
        <span className="ml-auto flex-none font-mono text-[10px] tracking-[0.08em] text-faint uppercase">{meta?.label}</span>
      </div>
      <ImageCarousel images={images} device={device} labels={labels} />
      <div className="space-y-2 px-3 py-2.5 text-xs text-fg-2">
        {needsTitle && title ? <p className="font-semibold text-fg">{title}</p> : null}
        <p className="line-clamp-6 whitespace-pre-wrap">{text}</p>
        {cta ? <p className="font-medium text-fg">{cta}</p> : null}
        {tags ? <p className="text-accent">{tags}</p> : null}
      </div>
      {/* Engagement row is a desktop-feed convention (Facebook/LinkedIn); the mobile app card leaves it out. */}
      {device === "desktop" ? (
        <div aria-hidden className="flex items-center gap-4 border-t border-line px-3 py-2 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Vertical 9:16 phone mockup for `video` / `reel` / `short`: a real `<video controls>` (or the
 * cover thumbnail while nothing decodes yet), a brand bar top-left, and two dashed safe-zone
 * overlays — the bottom caption band (where the actual on-screen caption text is drawn, so a long
 * caption visibly crowds it) and the right-edge action-button column every short-video platform
 * reserves for like/comment/share.
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

        {/* Top brand bar */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent px-2.5 py-2">
          <span className="h-5 w-5 flex-none rounded-full" style={{ backgroundColor: meta?.color ?? "var(--faint)" }} />
          <span className="truncate text-[10.5px] font-semibold text-white/95">{brandName}</span>
        </div>

        {/* Right-edge safe zone: where the platform draws like / comment / share */}
        <div aria-hidden className="pointer-events-none absolute top-1/3 right-1.5 flex flex-col items-center gap-2.5">
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 font-mono text-[6.5px] font-semibold tracking-wide text-white/85 uppercase [writing-mode:vertical-rl]">
            {labels.safeZoneUi}
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 w-6 rounded-full border border-dashed border-white/55" />
          ))}
        </div>

        {/* Bottom safe zone: the caption band, showing the real title + text so overflow is visible */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[26%] flex-col justify-end gap-1 border-t border-dashed border-white/45 bg-gradient-to-t from-black/75 to-transparent px-2.5 pt-4 pb-2.5">
          <span className="font-mono text-[7px] font-semibold tracking-wide text-white/70 uppercase">{labels.safeZoneCaption}</span>
          {caption}
        </div>
      </div>
    </div>
  );
}

export function VariantPreview({
  format, meta, images, video, needsTitle, title, text, cta, tags, brandName, labels,
}: {
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
}) {
  const [device, setDevice] = useState<Device>("mobile");
  const isReel = format === "reel" || format === "video" || format === "short";

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{labels.preview}</span>
        <DeviceToggle device={device} onChange={setDevice} labels={labels} />
      </div>
      {isReel ? (
        <ReelPreview
          video={video}
          poster={images[0]?.thumbUrl ?? ""}
          device={device}
          meta={meta}
          brandName={brandName}
          labels={labels}
          caption={
            <>
              {needsTitle && title ? <p className="line-clamp-1 text-[11px] font-semibold text-white">{title}</p> : null}
              <p className="line-clamp-2 text-[11px] text-white/90">{text || "…"}</p>
            </>
          }
        />
      ) : (
        <FeedCard
          device={device}
          meta={meta}
          brandName={brandName}
          images={images}
          needsTitle={needsTitle}
          title={title}
          text={text.slice(0, 600) || "…"}
          cta={cta}
          tags={tags}
          labels={labels}
        />
      )}
    </div>
  );
}
