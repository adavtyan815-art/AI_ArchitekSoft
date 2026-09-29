import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, ClipboardCheck, Link2, Ruler, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Index } from "@/components/ui";
import { TrackedCta } from "@/components/site/cta";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { Showcase } from "@/components/site/showcase";
import { B2BStory, B2CStory } from "@/components/site/home-stories";
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
 * A storytelling photo for a "Who it is for" card, when one has been added under public/home/ (else the composed
 * scene is shown). B2B: b2b-story.webp; B2C: b2c-ar.webp — 1600 × 1200 px (4:3), WebP; see home-stories.tsx.
 */
function storyPhoto(name: string): string | null {
  return fs.existsSync(path.join(process.cwd(), "public", "home", name)) ? `/home/${name}` : null;
}

/**
 * Homepage v7 — "the drafting table" (scoped styles in home.css).
 * 01 first screen: serif headline on the open page beside the showcase canvas (mode strip + caption under it)
 * → 02 the platform (tonal band: rule list + material board) → 03 who it is for
 * (framed images, caption bars, text below) → 04 selected work → 05 where next (rule list) + closing band.
 * Heavy content (3D model, video) loads only when its demonstration is opened.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const c = d.homeCompact;
  const p =(path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });
  const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

  return (
    <div className="home-x">
      {/* 01 — FIRST SCREEN */}
      <section className="container-x pt-8 sm:pt-10 lg:pt-14">
        <Showcase
          locale={locale}
          s={d.showcase}
          viewerCta={d.common.tryDemo}
          viewerTitle={d.home.viewerAlt}
          compareLabels={[d.portal.before, d.portal.after]}
          media={{ before: "/demo/sketch-plan.webp", after: "/demo/render-1.webp", video: "/demo/showcase-live.mp4", videoPoster: "/demo/showcase-live-poster.jpg", viewerPoster: "/demo/kitchen-walnut.webp" }}
          headline={
            <>
              <div className="rise">
                <div className="hx-eyebrow">
                  <Index n={1} />
                  <span>{d.home.heroBadge}</span>
                </div>
                <h1 className="hx-h1">{d.home.heroTitle}</h1>
              </div>
            </>
          }
          copy={
            <div className="rise" style={delay(140)}>
              <p className="hx-intro">{c.intro}</p>
              <div className="hx-ctas">
                <TrackedCta href={p("/start")} label="home-hero" locale={locale} className="hx-cta-primary">
                  {d.home.heroPrimary}
                  <ArrowUpRight size={16} />
                </TrackedCta>
                <ButtonLink href={p("/viewer")} variant="secondary">
                  {d.home.heroSecondary}
                </ButtonLink>
              </div>
              <p className="caption hx-note">{d.home.heroNote}</p>
            </div>
          }
        />
      </section>


      {/* 02 — THE PLATFORM */}
      <section className="container-x mt-16 sm:mt-24 lg:mt-28">
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
            <div className="hx-platform-aside lg:col-span-7">
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
            <span>B2B · B2C</span>
          </div>
          <h2 className="hx-h2">{d.home.splitTitle}</h2>
          <p className="hx-lead">{d.home.splitSubtitle}</p>
        </div>
        {/* Two horizontal pillars, one above the other: the story image on one side (alternating), the offer on
            the other — tag, title, text, three points side by side and the button — so a whole card fits the screen.
            B2B: a maker's desk (configurator, CutList, samples); B2C: the kitchen placed in AR in a real room. */}
        <div className="hx-pillars reveal-stagger">
          {[
            {
              card: d.home.b2bCard,
              href: p("/for-business"),
              code: "B2B",
              icons: [Link2, Ruler, Zap],
              media: <B2BStory photo={storyPhoto("b2b-story.webp")} />,
            },
            {
              card: d.home.b2cCard,
              href: p("/for-home"),
              code: "B2C",
              icons: [Smartphone, ShieldCheck, ClipboardCheck],
              media: <B2CStory photo={storyPhoto("b2c-ar.webp")} arLabel="AR" />,
            },
          ].map(({ card, href, code, icons, media }, n) => (
            <Link key={href} href={href} className={`hx-pillar group${n % 2 ? " hx-pillar--flip" : ""}`}>
              <div className="hx-pillar-media img-zoom">{media}</div>
              <div className="hx-pillar-body">
                <div className="hx-pillar-tag">
                  <span className="hx-pillar-code">{code}</span>
                  <span>{card.tag}</span>
                </div>
                <h3 className="hx-pillar-title">{card.title}</h3>
                <p className="hx-pillar-text">{card.text}</p>
                {/* "Lead — explanation": the lead as the point's heading */}
                <ul className="hx-pillar-points">
                  {card.bullets.map((b, n) => {
                    const [lead, ...rest] = b.split(" — ");
                    const Icon = icons[n % icons.length];
                    return (
                      <li key={b}>
                        <span className="hx-pillar-ico" aria-hidden>
                          <Icon size={17} strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0">
                          <strong>{lead}</strong>
                          {rest.length ? <span>{rest.join(" — ")}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <span className="hx-pillar-cta">
                  {card.cta}
                  <ArrowRight size={16} />
                </span>
              </div>
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
        <div className="grid gap-10 border-t border-line pt-6 sm:pt-8 lg:grid-cols-12 lg:gap-14">
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
              <TrackedCta href={p("/start")} label="home-closing" locale={locale} variant="brand" size="lg" className="mt-8">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </TrackedCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
