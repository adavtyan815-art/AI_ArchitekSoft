import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import type { PortfolioCard } from "@/lib/public-data";
import { cn } from "@/lib/utils";

/**
 * Responsive srcset for an uploaded-media URL (`/media/<rel>`), which the
 * /media route resizes on the fly via `?w=`.
 */
export function mediaSrcSetFromUrl(url: string, widths: number[] = [320, 480, 640, 960, 1280]): string | undefined {
  if (!url.startsWith("/media/") || !/\.(jpe?g|png|webp|avif)$/i.test(url.split("?")[0])) return undefined;
  return widths.map((w) => `${url}?w=${w} ${w}w`).join(", ");
}

/**
 * Editorial work tiles: image in a frame, mono index + category caption bar, serif title.
 * `columns` 2 = large tiles (portfolio page), 3 = compact (home).
 */
export function PortfolioGrid({ items, locale, labels, openLive, columns = 3, startIndex = 1 }: { items: PortfolioCard[]; locale: Locale; labels: Record<string, string>; openLive: string; columns?: 2 | 3; startIndex?: number }) {
  return (
    <div className={cn("grid gap-x-6 gap-y-10", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {items.map((it, i) => (
        <Link key={it.slug} href={localePath(locale, `/portfolio/${it.slug}`)} className="group block">
          <div className="frame frame-marks on-image img-zoom">
            <div className={cn("relative bg-surface-2", columns === 2 ? "aspect-[4/3]" : "aspect-[4/3]")}>
              {it.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.cover} srcSet={mediaSrcSetFromUrl(it.cover)} sizes={columns === 2 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} alt={it.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : null}
              {it.video ? (
                <span className="absolute right-4 bottom-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white backdrop-blur">
                  <Play size={14} className="ml-0.5" />
                </span>
              ) : null}
            </div>
            <div className="frame-bar flex items-center justify-between gap-3 border-t border-line px-3.5 py-2">
              <span className="caption min-w-0 truncate">
                <span className="text-accent">{String(startIndex + i).padStart(2, "0")}</span>
                <span className="mx-2 text-faint">/</span>
                {labels[it.category] ?? it.category}
              </span>
              {it.liveUrl ? <span className="caption text-fg">{openLive}</span> : null}
            </div>
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className={cn("font-display leading-tight text-fg", columns === 2 ? "text-[1.5rem]" : "text-[1.25rem]")}>{it.title}</div>
              {it.summary ? <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted">{it.summary}</p> : null}
            </div>
            <ArrowUpRight size={18} className="mt-1 flex-none text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
          </div>
        </Link>
      ))}
    </div>
  );
}
