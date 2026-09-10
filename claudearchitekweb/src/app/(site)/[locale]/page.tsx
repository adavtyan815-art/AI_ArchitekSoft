import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, CheckList, Frame, Index, SectionHeading, Stat, Ticks } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { BeforeAfter } from "@/components/site/before-after";
import { pageMeta } from "./meta";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/", title: d.meta.title, description: d.meta.description });
}

/** Material board shown inside the KitchenPro band: real decor names, no icons. */
const MATERIALS: { label: string; fill: string }[] = [
  { label: "EGGER H1180", fill: "linear-gradient(135deg,#b58a5a,#8d6238)" },
  { label: "EGGER U708", fill: "#c9c3b8" },
  { label: "EGGER W1000", fill: "#f1efe9" },
  { label: "Fenix 0720", fill: "#2b2a28" },
  { label: "EGGER H3131", fill: "linear-gradient(135deg,#a8865e,#7a5a3a)" },
  { label: "EGGER U626", fill: "#6c7a5c" },
];

/**
 * Compact entry page (six blocks). Every block ends in a link to its dedicated page:
 * 01 what we are → 02 KitchenPro → 03 who it is for → 04 Web Viewer & Live 3D → 05 selected work → 06 where next.
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
    <>
      {/* 01 — HERO */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6 lg:pr-6">
            <div className="mb-6 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{d.home.heroBadge}</span>
            </div>
            <h1 className="h-display">{d.home.heroTitle}</h1>
            <p className="lead mt-7 max-w-[34rem]">{c.intro}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={p("/start")} size="lg">
                {d.home.heroPrimary}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/viewer")} variant="secondary" size="lg">
                {d.home.heroSecondary}
              </ButtonLink>
            </div>
            <p className="caption mt-5">{d.home.heroNote}</p>
          </div>
          <div className="lg:col-span-6">
            <Frame marks caption={d.home.heroCaption} captionRight="KitchenPro · UE5" className="reveal">
              <BeforeAfter before="/demo/sketch.webp" after="/demo/render-1.webp" labels={[d.portal.before, d.portal.after]} aspect="aspect-[4/3]" />
            </Frame>
          </div>
        </div>

        {/* Proof strip on a ruler */}
        <div className="mt-14 sm:mt-20">
          <Ticks />
          <ul className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
            {d.home.proof.map((it) => (
              <li key={it.label}>
                <Stat value={it.value} label={it.label} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 02 — KITCHENPRO (inverse band) */}
      <section className="mt-20 sm:mt-28">
        <div className="inverse">
          <div className="container-x py-16 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-5">
                <div className="mb-6 flex items-center gap-3">
                  <Index n={2} />
                  <span className="eyebrow">{d.home.kitchenproTag}</span>
                </div>
                <h2 className="h-section">{d.home.kitchenproTitle}</h2>
                <p className="mt-6 text-[16px] leading-relaxed text-fg-2">{d.home.kitchenproText}</p>
                <ButtonLink href={p("/kitchenpro")} className="mt-8 bg-inverse-fg text-inverse-bg hover:bg-inverse-fg/90">
                  {c.kitchenproCta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <ol className="divide-y divide-line border-y border-line">
                  {d.home.pillars.map((pl, i) => (
                    <li key={pl.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 sm:grid-cols-[3rem_1fr]">
                      <Index n={i + 1} className="pt-1.5" />
                      <div>
                        <div className="font-display text-[1.35rem] leading-tight">{pl.title}</div>
                        <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">{pl.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-4" aria-hidden>
                  {MATERIALS.map((m) => (
                    <div key={m.label} className="flex flex-col items-start gap-1.5">
                      <span className="h-9 w-12 rounded-sm border border-line-strong" style={{ background: m.fill }} />
                      <span className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{m.label}</span>
                    </div>
                  ))}
                  <span className="caption pb-1">EGGER · Blum · Hettich · Fenix</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — WHO IT IS FOR */}
      <section className="container-x section-tight">
        <SectionHeading index={3} eyebrow={d.home.splitTitle} title={d.home.splitTitle} text={d.home.splitSubtitle} />
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8 lg:mt-14">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.webp", code: "B2B" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.webp", code: "B2C" },
          ].map(({ card, href, img, code }) => (
            <Link key={href} href={href} className="group reveal block">
              <div className="frame img-zoom">
                <div className="relative aspect-[16/10] bg-surface-2">
                  <Image src={img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="frame-bar flex items-center justify-between border-t border-line px-3.5 py-2">
                  <span className="caption">
                    <span className="text-accent">{code}</span>
                    <span className="mx-2 text-faint">/</span>
                    {card.tag}
                  </span>
                  <ArrowUpRight size={14} className="text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                </div>
              </div>
              <h3 className="mt-6 font-display text-[1.6rem] leading-tight text-fg sm:text-[1.85rem]">{card.title}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-fg-2">{card.text}</p>
              <CheckList items={card.bullets} className="mt-5" />
              <span className="link-arrow mt-6 group-hover:text-accent">
                {card.cta}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 04 — WEB VIEWER & LIVE 3D */}
      <section className="container-x section-tight">
        <SectionHeading index={4} eyebrow={d.home.viewerTag} title={c.viewerCard.title} text={c.viewerCard.text} action={<ButtonLink href={p("/viewer")} variant="secondary">{c.viewerCard.cta}<ArrowRight size={15} /></ButtonLink>} />
        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <Link href={p("/viewer")} className="group reveal block lg:col-span-8">
            <div className="frame frame-marks on-image img-zoom">
              <div className="relative aspect-[16/9] bg-surface-2">
                <Image src="/demo/wardrobe.webp" alt="" fill sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-black/45 text-white backdrop-blur transition-transform group-hover:scale-105">
                    <Play size={22} className="ml-1" />
                  </span>
                </span>
                <span className="absolute bottom-4 left-4 flex gap-1.5" aria-hidden>
                  {["#b58a5a", "#f1efe9", "#cbb999", "#8b9a86", "#2c3a55"].map((h) => (
                    <span key={h} className="h-5 w-5 rounded-sm border border-white/60" style={{ background: h }} />
                  ))}
                </span>
              </div>
              <div className="frame-bar flex items-center justify-between border-t border-line px-3.5 py-2">
                <span className="caption">Web Viewer · GLB · AR</span>
                <span className="caption text-fg">{c.viewerCard.cta}</span>
              </div>
            </div>
          </Link>
          <Link href={p("/live-3d")} className="group reveal flex flex-col justify-between border-t border-line-strong pt-5 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <div>
              <div className="eyebrow">{d.home.liveTag}</div>
              <h3 className="mt-4 font-display text-[1.6rem] leading-tight text-fg">{c.liveCard.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{c.liveCard.text}</p>
              <dl className="spec mt-6 text-[14px]">
                {d.home.liveBullets.map((b, i) => (
                  <div key={b}>
                    <dt>{String(i + 1).padStart(2, "0")}</dt>
                    <dd className="text-fg-2">{b}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <span className="link-arrow mt-6 group-hover:text-accent">
              {c.liveCard.cta}
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </section>

      {/* 05 — SELECTED WORK */}
      {work.length ? (
        <section className="container-x section-tight">
          <SectionHeading
            index={5}
            eyebrow={d.home.portfolioTag}
            title={c.proofTitle}
            action={
              <Link href={p("/portfolio")} className="link-arrow">
                {d.home.portfolioAll}
                <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="mt-10 reveal">
            <PortfolioGrid items={work} locale={locale} labels={d.portfolio.filters} openLive={d.portfolio.openLive} />
          </div>
        </section>
      ) : null}

      {/* 06 — WHERE NEXT + CTA */}
      <section className="container-x section-tight">
        <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Index n={6} />
              <span className="eyebrow">{c.linksTitle}</span>
            </div>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={p(l.href)} className="group flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-display text-[1.2rem] leading-tight text-fg">{l.title}</span>
                      <span className="mt-0.5 block text-[13.5px] text-muted">{l.text}</span>
                    </span>
                    <ArrowRight size={16} className="flex-none text-faint transition-transform group-hover:translate-x-1 group-hover:text-fg" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-10">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.4rem]">{d.home.finalTitle}</h2>
              <p className="mt-3 max-w-md text-[15px] opacity-85">{d.home.finalText}</p>
              <ButtonLink href={p("/start")} size="lg" className="mt-7 bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620]">
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
    </>
  );
}
