import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getPortfolioItem } from "@/lib/public-data";
import { pageMeta } from "../../meta";
import { Badge, ButtonLink } from "@/components/ui";
import { Lightbox } from "@/components/site/lightbox";
import { mediaSrcSetFromUrl } from "@/components/site/portfolio-grid";

type Params = Promise<{ locale: string; slug: string }>;

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
  const p = (path: string) => localePath(locale, path);
  const item = getPortfolioItem(locale, slug);
  if (!item) notFound();
  const filters = d.portfolio.filters as Record<string, string>;
  const gallery = item.images.filter((src) => src !== item.cover);

  return (
    <>
      {/* ───────────────────────── HEADER ───────────────────────── */}
      <section className="container-x pt-8 pb-6 sm:pt-12">
        <Link href={p("/portfolio")} className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-fg">
          <ArrowLeft size={16} />
          {d.nav.portfolio}
        </Link>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge tone="brand">{filters[item.category] ?? item.category}</Badge>
            <h1 className="mt-4 h-section sm:text-[3rem]">{item.title}</h1>
            {item.summary ? <p className="lead mt-5">{item.summary}</p> : null}
          </div>
          {item.liveUrl ? (
            <ButtonLink href={item.liveUrl} size="lg" external className="w-full sm:w-fit">
              {d.portfolio.openLive}
              <ExternalLink size={16} />
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {/* ───────────────────────── COVER ───────────────────────── */}
      {item.cover ? (
        <section className="container-x pb-8">
          <div className="overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cover} srcSet={mediaSrcSetFromUrl(item.cover)} sizes="(min-width: 1200px) 1140px, 100vw" alt={item.title} className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
          </div>
        </section>
      ) : null}

      {/* ───────────────────────── VIDEO ───────────────────────── */}
      {item.video ? (
        <section className="container-x pb-8">
          <div className="kicker mb-3">{d.portal.video}</div>
          <div className="overflow-hidden rounded-3xl border border-line bg-inverse-bg">
            <video controls playsInline preload="metadata" poster={item.cover ?? undefined} className="aspect-video w-full" src={item.video} />
          </div>
        </section>
      ) : null}

      {/* ───────────────────────── GALLERY ───────────────────────── */}
      {gallery.length ? (
        <section className="container-x pb-12">
          <div className="kicker mb-3">{d.portal.gallery}</div>
          <Lightbox images={gallery} alt={item.title} labels={{ close: d.common.close, prev: d.common.prevImage, next: d.common.nextImage }} />
        </section>
      ) : null}

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pt-2 pb-10 reveal">
        <div className="rounded-3xl bg-accent px-6 py-12 text-accent-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg opacity-85">{d.home.finalText}</p>
            </div>
            <ButtonLink href={p("/start")} size="lg" className="w-full bg-accent-fg text-accent hover:opacity-90 sm:w-fit">
              {d.common.startProject}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
