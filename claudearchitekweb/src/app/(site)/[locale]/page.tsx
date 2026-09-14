import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Index } from "@/components/ui";
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

/** Material board shown inside the platform block: real decor names, no icons. */
const MATERIALS: { label: string; fill: string }[] = [
  { label: "EGGER H1180", fill: "linear-gradient(135deg,#b58a5a,#8d6238)" },
  { label: "EGGER U708", fill: "#c9c3b8" },
  { label: "EGGER W1000", fill: "#f1efe9" },
  { label: "Fenix 0720", fill: "#2b2a28" },
  { label: "EGGER H3131", fill: "linear-gradient(135deg,#a8865e,#7a5a3a)" },
  { label: "EGGER U626", fill: "#6c7a5c" },
];

/**
 * Homepage experiment v5 (scoped styles in home.css). First screen: text column + a large floating canvas
 * (the showcase) with a control dock; the selected demonstration is described next to the headline.
 * Below: stats ribbon → 02 the platform (dark canvas) → 03 who it is for (image cards) → 04 selected work
 * → 05 where next + CTA. Heavy content (3D model, video) loads only when its demonstration is opened.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const c = d.homeCompact;
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });

  return (
    <div className="home-x">
      {/* 01 — FIRST SCREEN */}
      <section className="container-x pt-6 sm:pt-8 lg:pt-10">
        <Showcase
          locale={locale}
          s={d.showcase}
          viewerLabels={{ hint: d.home.viewerHint, swatches: d.home.viewerSwatches, ar: d.home.viewerAr, load: d.common.tryDemo }}
          compareLabels={[d.portal.before, d.portal.after]}
          media={{ before: "/demo/sketch.webp", after: "/demo/render-1.webp", video: "/demo/showcase-live.mp4", videoPoster: "/demo/showcase-live-poster.jpg", viewerPoster: "/demo/wardrobe.webp" }}
          headline={
            <>
              <span className="hx-eyebrow rise" style={{ "--d": "60ms" } as React.CSSProperties}>
                <Index n={1} />
                {d.home.heroBadge}
              </span>
              <h1 className="hx-h1 rise" style={{ "--d": "120ms" } as React.CSSProperties}>
                {d.home.heroTitle}
              </h1>
            </>
          }
          intro={
            <p className="hx-intro rise" style={{ "--d": "200ms" } as React.CSSProperties}>
              {c.intro}
            </p>
          }
          ctas={
            <>
              <ButtonLink href={p("/start")}>
                {d.home.heroPrimary}
                <ArrowUpRight size={16} />
              </ButtonLink>
              <ButtonLink href={p("/viewer")} variant="secondary">
                {d.home.heroSecondary}
              </ButtonLink>
            </>
          }
        />
        <p className="caption hx-note">{d.home.heroNote}</p>
      </section>

      {/* Stats ribbon */}
      <section className="container-x mt-12 sm:mt-16">
        <ul className="hx-stats reveal-stagger">
          {d.home.proof.map((it) => (
            <li key={it.label} className="hx-stat glass-card spot">
              <div className="hx-stat-v">{it.value}</div>
              <div className="hx-stat-l">{it.label}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* 02 — THE PLATFORM */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="hx-platform reveal p-6 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="hx-kicker">
                <Index n={2} />
                {d.home.kitchenproTag}
              </div>
              <h2 className="hx-h2">{d.home.kitchenproTitle}</h2>
              <p className="hx-lead">{d.home.kitchenproText}</p>
              <ButtonLink href={p("/platform")} className="mt-7">
                {c.kitchenproCta}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <div className="lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-3 reveal-stagger">
                {d.home.pillars.map((pl, i) => (
                  <div key={pl.title} className="hx-pillar spot">
                    <div className="hx-pillar-idx">{String(i + 1).padStart(2, "0")}</div>
                    <div className="hx-pillar-t">{pl.title}</div>
                    <p className="hx-pillar-x">{pl.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-4" aria-hidden>
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
      <section className="container-x mt-16 sm:mt-24">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <div className="hx-kicker">
            <Index n={3} />
            {d.home.splitTitle}
          </div>
          <h2 className="hx-h2">{d.home.splitTitle}</h2>
          <p className="hx-lead">{d.home.splitSubtitle}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 md:gap-6 reveal-stagger">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.webp", code: "B2B" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.webp", code: "B2C" },
          ].map(({ card, href, img, code }) => (
            <Link key={href} href={href} className="hx-door">
              <Image src={img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              <div className="hx-door-body">
                <span className="hx-door-tag">
                  <b>{code}</b>
                  {card.tag}
                </span>
                <h3 className="hx-door-title">{card.title}</h3>
                <p className="hx-door-text">{card.text}</p>
                <span className="hx-door-link">
                  {card.cta}
                  <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 04 — SELECTED WORK */}
      {work.length ? (
        <section className="container-x mt-16 sm:mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div className="max-w-2xl">
              <div className="hx-kicker">
                <Index n={4} />
                {d.home.portfolioTag}
              </div>
              <h2 className="hx-h2">{c.proofTitle}</h2>
            </div>
            <Link href={p("/portfolio")} className="hx-live-link">
              {d.home.portfolioAll}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hx-work reveal">
            <PortfolioGrid items={work} locale={locale} labels={d.portfolio.filters} openLive={d.portfolio.openLive} />
          </div>
        </section>
      ) : null}

      {/* 05 — WHERE NEXT + CTA */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="hx-kicker">
              <Index n={5} />
              {c.linksTitle}
            </div>
            <div className="mt-5 grid gap-3 reveal-stagger">
              {c.links.map((l) => (
                <Link key={l.href} href={p(l.href)} className="hx-next glass-card spot">
                  <span className="min-w-0">
                    <span className="hx-next-t block">{l.title}</span>
                    <span className="hx-next-x block">{l.text}</span>
                  </span>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="hx-cta reveal p-7 sm:p-10 lg:p-12">
              <h2 className="text-[1.9rem] leading-[1.06] sm:text-[2.4rem]">{d.home.finalTitle}</h2>
              <p className="mt-3 max-w-md text-[15px] opacity-85">{d.home.finalText}</p>
              <ButtonLink href={p("/start")} size="lg" className="mt-7">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <div className="mt-8 border-t border-accent-fg/25 pt-5 [&_.caption]:text-accent-fg/70 [&_a]:text-accent-fg [&_a:hover]:text-accent-fg/80">
                <ContactChannels brand={brand} dict={d} compact />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
