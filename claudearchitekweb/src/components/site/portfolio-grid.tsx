import Link from "next/link";
import { Play } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import type { PortfolioCard } from "@/lib/public-data";

export function PortfolioGrid({ items, locale, labels, openLive }: { items: PortfolioCard[]; locale: Locale; labels: Record<string, string>; openLive: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Link key={it.slug} href={localePath(locale, `/portfolio/${it.slug}`)} className="card group overflow-hidden transition-shadow hover:shadow-card">
          <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
            {it.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.cover} alt={it.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            ) : null}
            {it.video ? (
              <span className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-soft">
                <Play size={16} />
              </span>
            ) : null}
            <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-800">{labels[it.category] ?? it.category}</span>
          </div>
          <div className="p-5">
            <div className="text-base font-semibold text-ink-950">{it.title}</div>
            {it.summary ? <p className="mt-1 line-clamp-2 text-sm text-ink-600">{it.summary}</p> : null}
            {it.liveUrl ? <div className="mt-3 text-xs font-semibold text-brand-600">{openLive} →</div> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
