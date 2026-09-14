import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Index, Stat, Ticks } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { Showcase } from "@/components/site/showcase";
import { pageMeta } from "./meta";
import "./home.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/", title: d.meta.title, description: d.meta.description });
}

/** Material board shown inside the platform band: real decor names, no icons. */
const MATERIALS: { label: string; fill: string }[] = [
  { label: "EGGER H1180", fill: "linear-gradient(135deg,#b58a5a,#8d6238)" },
  { label: "EGGER U708", fill: "#c9c3b8" },
  { label: "EGGER W1000", fill: "#f1efe9" },
  { label: "Fenix 0720", fill: "#2b2a28" },
  { label: "EGGER H3131", fill: "linear-gradient(135deg,#a8865e,#7a5a3a)" },
  { label: "EGGER U626", fill: "#6c7a5c" },
];

/**
 * Homepage v7 — "the drafting table" (scoped styles in home.css).
 * 01 first screen: serif headline on the open page beside the showcase canvas (mode strip + caption under it)
 * → ticks + spec strip → 02 the platform (tonal band: rule list + material board) → 03 who it is for
 * (framed images, caption bars, text below) → 04 selected work → 05 where next (rule list) + closing band.
 * Heavy content (3D model, video) loads only when its demonstration is opened.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const c = d.homeCompact;
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });
  const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

  return (
    <div className="home-x">
      {/* 01 — FIRST SCREEN */}
      <section className="container-x pt-8 sm:pt-10 lg:pt-14">
        <Showcase
          locale={locale}
          s={d.showcase}
          viewerLabels={{ hint: d.home.viewerHint, swatches: d.home.viewerSwatches, ar: d.home.viewerAr, load: d.common.tryDemo }}
          compareLabels={[d.portal.before, d.portal.after]}
          media={{ before: "/demo/sketch.webp", after: "/demo/render-1.webp", video: "/demo/showcase-live.mp4", videoPoster: "/demo/showcase-live-poster.jpg", viewerPoster: "/demo/wardrobe.webp" }}
          headline={
            <>
              <div className="hx-eyebrow rise" style={delay(40)}>
                <Index n={1} />
                <span>{d.home.heroBadge}</span>
              </div>
              <h1 className="hx-h1 rise" style={delay(110)}>
                {d.home.heroTitle}
              </h1>
            </>
          }
          copy={
            <>
              <p className="hx-intro rise" style={delay(200)}>
                {c.intro}
              </p>
              <div className="hx-ctas rise" style={delay(260)}>
                <ButtonLink href={p("/start")}>
                  {d.home.heroPrimary}
                  <ArrowUpRight size={16} />
                </ButtonLink>
                <ButtonLink href={p("/viewer")} variant="secondary">
                  {d.home.heroSecondary}
                </ButtonLink>
              </div>
              <p className="caption hx-note rise" style={delay(320)}>
                {d.home.heroNote}
              </p>
            </>
          }
        />
      </section>

      {/* Spec strip */}
      <section className="container-x mt-14 sm:mt-20">
        <Ticks />
        <ul className="hx-spec reveal-stagger">
          {d.home.proof.map((it) => (
            <li key={it.label}>
              <Stat value={it.value} label={it.label} />
            </li>
          ))}
        </ul>
      </section>

      {/* 02 — THE PLATFORM */}
      <section className="container-x mt-20 sm:mt-28">
        <div className="hx-band reveal p-6 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <div className="hx-kicker">
                <Index n={2} />
                <span>{d.home.kitchenproTag}</span>
              </div>
              <h2 className="hx-h2">{d.home.kitchenproTitle}</h2>
              <p className="hx-lead">{d.home.kitchenproText}</p>
              <ButtonLink href={p("/platform")} className="mt-8">
                {c.kitchenproCta}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <div className="lg:col-span-7 lg:pt-1">
              <ol className="hx-list">
                {d.home.pillars.map((pl, i) => (
                  <li key={pl.title}>
                    <span className="hx-list-idx">{String(i + 1).padStart(2, "0")}</span>
                    <span className="hx-list-t">{pl.title}</span>
                    <p className="hx-list-x">{pl.text}</p>
                  </li>
                ))}
              </ol>
              <div className="hx-materials" aria-hidden>
                {MATERIALS.map((m) => (
                  <div key={m.label} className="hx-material">
                    <span style={{ background: m.fill }} />
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — WHO IT IS FOR */}
      <section className="container-x mt-20 sm:mt-28">
        <div className="mb-8 max-w-2xl border-t border-line pt-6 sm:mb-12 sm:pt-8">
          <div className="hx-kicker">
            <Index n={3} />
            <span>{d.home.splitTitle}</span>
          </div>
          <h2 className="hx-h2">{d.home.splitTitle}</h2>
          <p className="hx-lead">{d.home.splitSubtitle}</p>
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-8 reveal-stagger">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.webp", code: "B2B" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.webp", code: "B2C" },
          ].map(({ card, href, img, code }) => (
            <Link key={href} href={href} className="hx-door group">
              <div className="frame frame-marks on-image img-zoom">
                <div className="relative aspect-[4/3] bg-surface-2">
                  <Image src={img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="frame-bar flex items-center justify-between gap-3 border-t border-line px-3.5 py-2">
                  <span className="caption min-w-0 truncate">
                    <span className="text-accent">{code}</span>
                    <span className="mx-2 text-faint">/</span>
                    {card.tag}
                  </span>
                  <ArrowUpRight size={14} className="flex-none text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                </div>
              </div>
              <h3 className="hx-door-title">{card.title}</h3>
              <p className="hx-door-text">{card.text}</p>
              <span className="hx-door-link">
                {card.cta}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 04 — SELECTED WORK */}
      {work.length ? (
        <section className="container-x mt-20 sm:mt-28">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6 sm:mb-12 sm:pt-8">
            <div className="max-w-2xl">
              <div className="hx-kicker">
                <Index n={4} />
                <span>{d.home.portfolioTag}</span>
              </div>
              <h2 className="hx-h2">{c.proofTitle}</h2>
            </div>
            <Link href={p("/portfolio")} className="link-arrow">
              {d.home.portfolioAll}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="reveal">
            <PortfolioGrid items={work} locale={locale} labels={d.portfolio.filters} openLive={d.portfolio.openLive} />
          </div>
        </section>
      ) : null}

      {/* 05 — WHERE NEXT + CLOSING CALL */}
      <section className="container-x mt-20 sm:mt-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <div className="hx-kicker">
              <Index n={5} />
              <span>{c.linksTitle}</span>
            </div>
            <div className="hx-next-list mt-6">
              {c.links.map((l) => (
                <Link key={l.href} href={p(l.href)} className="hx-next">
                  <span className="min-w-0">
                    <span className="hx-next-t block">{l.title}</span>
                    <span className="hx-next-x block">{l.text}</span>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="hx-band reveal p-7 sm:p-10 lg:p-12">
              <h2 className="text-[1.9rem] leading-[1.08] sm:text-[2.5rem]">{d.home.finalTitle}</h2>
              <p className="mt-4 max-w-md text-[15.5px] text-fg-2">{d.home.finalText}</p>
              <ButtonLink href={p("/start")} variant="brand" size="lg" className="mt-8">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <div className="mt-9 border-t border-line pt-5">
                <ContactChannels brand={brand} dict={d} compact />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
