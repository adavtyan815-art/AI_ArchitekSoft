import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import type { PortfolioCard } from "@/lib/public-data";

/**
 * Responsive srcset for an uploaded-media URL (`/media/<rel>`), which the
 * /media route resizes on the fly via `?w=`. Public-data hands us finished
 * URLs, so the widths are appended here instead of via `mediaSrcSet(relPath)`.
 */
export function mediaSrcSetFromUrl(url: string, widths: number[] = [320, 480, 640, 960, 1280]): string | undefined {
  if (!url.startsWith("/media/") || !/\.(jpe?g|png|webp|avif)$/i.test(url.split("?")[0])) return undefined;
  return widths.map((w) => `${url}?w=${w} ${w}w`).join(", ");
}

export function PortfolioGrid({ items, locale, labels, openLive }: { items: PortfolioCard[]; locale: Locale; labels: Record<string, string>; openLive: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {items.map((it) => (
        <Link key={it.slug} href={localePath(locale, `/portfolio/${it.slug}`)} className="card card-hover group flex flex-col overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
            {it.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.cover}
                srcSet={mediaSrcSetFromUrl(it.cover)}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={it.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : null}
            {it.video ? (
              <span className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-fg shadow-soft backdrop-blur">
                <Play size={16} />
              </span>
            ) : null}
            <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-fg-2 backdrop-blur">{labels[it.category] ?? it.category}</span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="h-card">{it.title}</div>
            {it.summary ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{it.summary}</p> : null}
            {it.liveUrl ? (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                {openLive}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
