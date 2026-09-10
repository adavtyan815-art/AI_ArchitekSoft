import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getPortfolioItem } from "@/lib/public-data";
import { pageMeta } from "../../meta";
import { ButtonLink } from "@/components/ui";
import { Lightbox } from "@/components/site/lightbox";

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
      <section className="container-x pt-10 pb-8 sm:pt-14">
        <Link href={p("/portfolio")} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} />
          {d.nav.portfolio}
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="eyebrow mb-3">{filters[item.category] ?? item.category}</div>
            <h1 className="h-section sm:text-5xl">{item.title}</h1>
            {item.summary ? <p className="lead mt-5">{item.summary}</p> : null}
          </div>
          {item.liveUrl ? (
            <ButtonLink href={item.liveUrl} size="lg" external>
              {d.portfolio.openLive}
              <ExternalLink size={16} />
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {item.cover ? (
        <section className="container-x pb-8">
          <div className="overflow-hidden rounded-3xl border border-line bg-ink-100 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cover} alt={item.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        </section>
      ) : null}

      {item.video ? (
        <section className="container-x pb-8">
          <div className="eyebrow mb-3">{d.portal.video}</div>
          <div className="overflow-hidden rounded-3xl border border-line bg-ink-950">
            <video controls playsInline preload="metadata" poster={item.cover ?? undefined} className="aspect-video w-full" src={item.video} />
          </div>
        </section>
      ) : null}

      {gallery.length ? (
        <section className="container-x pb-12">
          <div className="eyebrow mb-3">{d.portal.gallery}</div>
          <Lightbox images={gallery} alt={item.title} labels={{ close: d.common.close, prev: d.common.prevImage, next: d.common.nextImage }} />
        </section>
      ) : null}

      <section className="container-x pt-4 pb-8">
        <div className="rounded-3xl bg-brand-500 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg text-brand-100">{d.home.finalText}</p>
            </div>
            <ButtonLink href={p("/start")} size="lg" className="bg-white text-ink-950 hover:bg-brand-50">
              {d.common.startProject}
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
