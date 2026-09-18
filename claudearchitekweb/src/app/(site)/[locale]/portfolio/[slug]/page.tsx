import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getPortfolio, getPortfolioItem } from "@/lib/public-data";
import { pageMeta } from "../../meta";
import { ButtonLink, Index, Spec } from "@/components/ui";
import { Lightbox } from "@/components/site/lightbox";
import { mediaSrcSetFromUrl } from "@/components/site/portfolio-grid";

type Params = Promise<{ locale: string; slug: string }>;

/** Page-local strings (the shared dictionary does not carry them). */
const LOCAL: Record<Locale, { project: string; category: string; plates: string; video: string; deliverable: string; webViewer: string; yes: string; no: string; prev: string; next: string; facts: string }> = {
  hy: { project: "Նախագիծ", category: "Կատեգորիա", plates: "Պատկերներ", video: "Տեսանյութ", deliverable: "Արդյունք", webViewer: "Web Viewer", yes: "Այո", no: "—", prev: "Նախորդ", next: "Հաջորդ", facts: "Տվյալներ" },
  ru: { project: "Проект", category: "Категория", plates: "Изображения", video: "Видео", deliverable: "Результат", webViewer: "Web Viewer", yes: "Да", no: "—", prev: "Предыдущий", next: "Следующий", facts: "Данные" },
  en: { project: "Project", category: "Category", plates: "Plates", video: "Video", deliverable: "Deliverable", webViewer: "Web Viewer", yes: "Yes", no: "—", prev: "Previous", next: "Next", facts: "Facts" },
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The 3D link is typed by hand in the admin, so the page only renders a link it can open: an
 * absolute http(s) address. Anything else (a `javascript:` URL, a stray word) simply has no button
 * rather than a control that throws when it is clicked.
 */
function webLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const item = getPortfolioItem(locale, slug);
  if (!item) return {};
  return pageMeta({
    locale,
    path: `/portfolio/${slug}`,
    title: item.title,
    description: item.summary || undefined,
    images: item.cover ? [item.cover] : undefined,
  });
}

export default async function PortfolioItemPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const t = LOCAL[locale];
  const p = (path: string) => localePath(locale, path);
  const all = getPortfolio(locale);
  const pos = all.findIndex((i) => i.slug === slug);
  const item = pos >= 0 ? all[pos] : getPortfolioItem(locale, slug);
  if (!item) notFound();
  const filters = d.portfolio.filters as Record<string, string>;
  const categoryLabel = filters[item.category] ?? item.category;
  const gallery = item.images.filter((src) => src !== item.cover);
  const liveUrl = webLink(item.liveUrl);
  const prevItem = pos > 0 ? all[pos - 1] : null;
  const nextItem = pos >= 0 && pos < all.length - 1 ? all[pos + 1] : null;
  const code = `AT—${pad(pos >= 0 ? pos + 1 : 1)}`;

  const facts: { k: string; v: React.ReactNode }[] = [
    { k: t.category, v: categoryLabel },
    { k: t.plates, v: <span className="num">{pad(item.images.length || (item.cover ? 1 : 0))}</span> },
    { k: t.video, v: item.video ? t.yes : t.no },
    {
      k: t.deliverable,
      v: liveUrl ? (
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="u-link inline-flex items-center gap-1.5 text-fg">
          {d.portfolio.openLive}
          <ExternalLink size={13} aria-hidden />
        </a>
      ) : (
        t.webViewer
      ),
    },
  ];

  return (
    <>
      {/* 01 — PROJECT SHEET HEAD */}
      <section className="container-x pt-8 sm:pt-12">
        <Link href={p("/portfolio")} className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase transition-colors hover:text-fg">
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
          {d.nav.portfolio}
        </Link>

        <div className="mt-7 grid gap-10 border-t border-line pt-7 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <Index n={code} />
              <span className="eyebrow">
                {t.project}
                <span className="text-faint">/</span>
                {categoryLabel}
              </span>
            </div>
            <h1 className="h-display mt-5 text-[2.4rem] sm:text-[3.2rem] lg:text-[3.6rem]">{item.title}</h1>
            {item.summary ? <p className="lead mt-6 max-w-[34rem]">{item.summary}</p> : null}
            {liveUrl ? (
              <ButtonLink href={liveUrl} size="lg" external className="mt-8 w-full sm:w-fit">
                {d.portfolio.openLive}
                <ExternalLink size={16} />
              </ButtonLink>
            ) : null}
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="kicker mb-3">{t.facts}</div>
            <Spec rows={facts} />
          </div>
        </div>
      </section>

      {/* 02 — HERO PLATE */}
      {item.cover ? (
        <section className="container-x pt-10 sm:pt-14">
          <figure className="frame frame-marks on-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cover} srcSet={mediaSrcSetFromUrl(item.cover)} sizes="(min-width: 1240px) 1160px, 100vw" alt={item.title} className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
            <figcaption className="flex items-center justify-between gap-4 border-t border-line px-3.5 py-2">
              <span className="caption truncate">
                <span className="text-accent">{code}</span>
                <span className="mx-2 text-faint">/</span>
                {item.title}
              </span>
              <span className="caption hidden flex-none sm:block">{categoryLabel}</span>
            </figcaption>
          </figure>
        </section>
      ) : null}

      {/* 03 — VIDEO */}
      {item.video ? (
        <section className="container-x reveal pt-14 sm:pt-20">
          <div className="mb-5 flex items-center gap-3 border-t border-line pt-6">
            <Index n={1} />
            <span className="eyebrow">{d.portal.video}</span>
          </div>
          <figure className="frame">
            <video controls playsInline preload="metadata" poster={item.cover ?? undefined} className="aspect-video w-full bg-stage" src={item.video} />
            <figcaption className="flex items-center justify-between gap-4 border-t border-line px-3.5 py-2">
              <span className="caption truncate">{item.title}</span>
              <span className="caption flex-none">MP4</span>
            </figcaption>
          </figure>
        </section>
      ) : null}

      {/* 04 — GALLERY */}
      {gallery.length ? (
        <section className="container-x reveal pt-14 sm:pt-20">
          <div className="mb-6 flex items-center gap-3 border-t border-line pt-6">
            <Index n={item.video ? 2 : 1} />
            <span className="eyebrow">{d.portal.gallery}</span>
          </div>
          <Lightbox images={gallery} alt={item.title} labels={{ close: d.common.close, prev: d.common.prevImage, next: d.common.nextImage }} />
        </section>
      ) : null}

      {/* 05 — PREV / NEXT */}
      {prevItem || nextItem ? (
        <section className="container-x pt-16 sm:pt-24">
          <ul className="divide-y divide-line border-y border-line">
            {prevItem ? (
              <li>
                <Link href={p(`/portfolio/${prevItem.slug}`)} className="group flex items-center gap-5 py-5">
                  <ArrowLeft size={16} className="flex-none text-faint transition-transform group-hover:-translate-x-1 group-hover:text-fg" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="caption block">{t.prev}</span>
                    <span className="mt-0.5 block truncate font-display text-[1.25rem] leading-tight text-fg sm:text-[1.4rem]">{prevItem.title}</span>
                  </span>
                  <span className="caption hidden flex-none sm:block">{filters[prevItem.category] ?? prevItem.category}</span>
                </Link>
              </li>
            ) : null}
            {nextItem ? (
              <li>
                <Link href={p(`/portfolio/${nextItem.slug}`)} className="group flex items-center gap-5 py-5">
                  <span className="min-w-0 flex-1">
                    <span className="caption block">{t.next}</span>
                    <span className="mt-0.5 block truncate font-display text-[1.25rem] leading-tight text-fg sm:text-[1.4rem]">{nextItem.title}</span>
                  </span>
                  <span className="caption hidden flex-none sm:block">{filters[nextItem.category] ?? nextItem.category}</span>
                  <ArrowRight size={16} className="flex-none text-faint transition-transform group-hover:translate-x-1 group-hover:text-fg" aria-hidden />
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* 06 — CTA */}
      <section className="container-x pt-12 pb-16 sm:pb-24">
        <div className="reveal grid gap-8 rounded-xl bg-accent px-6 py-12 text-accent-fg sm:px-10 sm:py-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 className="font-display text-[1.9rem] leading-[1.08] font-medium sm:text-[2.5rem]">{d.home.finalTitle}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed opacity-85">{d.home.finalText}</p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
            <ButtonLink href={p("/start")} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
              {d.common.startProject}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
