import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Box, Factory, MonitorPlay, Palette, Play } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, CheckList, IconBox, SectionHeading } from "@/components/ui";
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

/**
 * Compact entry page. Every section answers one question and links to the page that has the detail:
 * what ArchiTek Soft is → KitchenPro → B2B / B2C doors → Web Viewer & Live 3D entry → 3 proofs → where next.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const c = d.homeCompact;
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });
  const pillarIcons = [Box, Palette, Factory];

  return (
    <>
      {/* HERO: what we are + value + entry points */}
      <section className="container-x pt-10 pb-6 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">
              <span className="dot bg-accent" />
              {d.home.heroBadge}
            </div>
            <h1 className="h-display">{d.home.heroTitle}</h1>
            <p className="lead mt-6">{c.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={p("/start")} size="lg">
                {d.home.heroPrimary}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/viewer")} variant="secondary" size="lg">
                {d.home.heroSecondary}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">{d.home.heroNote}</p>
          </div>
          <div>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
              <BeforeAfter before="/demo/sketch.webp" after="/demo/render-1.webp" labels={[d.portal.before, d.portal.after]} aspect="aspect-[4/3] sm:aspect-[16/10]" />
            </div>
            <p className="mt-3 text-center text-xs text-muted">{d.home.heroCaption}</p>
          </div>
        </div>
        <ul className="mt-12 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-4 md:divide-x md:divide-line">
          {d.home.proof.map((it, i) => (
            <li key={it.label} className={i < 2 ? "border-b border-line p-5 md:border-b-0" : "p-5"}>
              <div className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">{it.value}</div>
              <div className="mt-1 text-[13px] leading-snug text-muted">{it.label}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* KITCHENPRO — the product, in one block */}
      <section className="container-x section-tight">
        <div className="inverse overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <div className="eyebrow mb-4 text-accent">{d.home.kitchenproTag}</div>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{d.home.kitchenproTitle}</h2>
              <p className="mt-4 text-[16px] leading-relaxed opacity-80">{d.home.kitchenproText}</p>
              <ButtonLink href={p("/kitchenpro")} className="mt-7 bg-inverse-fg text-inverse-bg hover:opacity-90">
                {c.kitchenproCta}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <div className="grid gap-3">
              {d.home.pillars.map((pl, i) => {
                const Icon = pillarIcons[i];
                return (
                  <div key={pl.title} className="flex gap-4 rounded-2xl border border-current/10 bg-current/5 p-4">
                    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent text-accent-fg">
                      <Icon size={18} />
                    </span>
                    <div>
                      <div className="font-display text-base font-semibold">{pl.title}</div>
                      <p className="mt-0.5 text-[14px] leading-relaxed opacity-75">{pl.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* B2B / B2C doors */}
      <section className="container-x section-tight">
        <SectionHeading title={d.home.splitTitle} text={d.home.splitSubtitle} align="center" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.jpg" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.jpg" },
          ].map(({ card, href, img }) => (
            <Link key={href} href={href} className="card card-hover group overflow-hidden">
              <div className="relative aspect-[16/8] overflow-hidden bg-surface-2">
                <Image src={img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-6 sm:p-7">
                <div className="eyebrow">{card.tag}</div>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">{card.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{card.text}</p>
                <CheckList items={card.bullets} className="mt-5" />
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  {card.cta}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Web Viewer + Live 3D entry cards */}
      <section className="container-x section-tight">
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <Link href={p("/viewer")} className="card card-hover group relative overflow-hidden">
            <div className="relative aspect-[16/8] bg-surface-2">
              <Image src="/demo/wardrobe.jpg" alt="" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#fff] text-[#111] shadow-lift transition-transform group-hover:scale-105">
                  <Play size={24} className="ml-1" />
                </span>
              </span>
            </div>
            <div className="p-6">
              <div className="eyebrow">{d.home.viewerTag}</div>
              <h3 className="mt-3 h-card text-xl">{c.viewerCard.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.viewerCard.text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                {c.viewerCard.cta}
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
          <Link href={p("/live-3d")} className="card card-hover group flex flex-col p-6">
            <IconBox tone="neutral">
              <MonitorPlay />
            </IconBox>
            <div className="mt-5 eyebrow">{d.home.liveTag}</div>
            <h3 className="mt-3 h-card text-xl">{c.liveCard.title}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{c.liveCard.text}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {c.liveCard.cta}
              <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </section>

      {/* Proof: three works */}
      {work.length ? (
        <section className="container-x section-tight">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow={d.home.portfolioTag} title={c.proofTitle} />
            <Link href={p("/portfolio")} className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {d.home.portfolioAll}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8">
            <PortfolioGrid items={work} locale={locale} labels={d.portfolio.filters} openLive={d.portfolio.openLive} />
          </div>
        </section>
      ) : null}

      {/* Where next + contact */}
      <section className="container-x section-tight">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="kicker mb-4">{c.linksTitle}</div>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={p(l.href)} className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                    <span>
                      <span className="block text-[15px] font-semibold text-fg">{l.title}</span>
                      <span className="block text-sm text-muted">{l.text}</span>
                    </span>
                    <ArrowRight size={16} className="flex-none text-faint transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-accent p-6 text-accent-fg sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{d.home.finalTitle}</h2>
            <p className="mt-2 opacity-85">{d.home.finalText}</p>
            <ButtonLink href={p("/start")} className="mt-6 bg-accent-fg text-accent hover:opacity-90">
              {d.common.startProject}
              <ArrowUpRight size={16} />
            </ButtonLink>
            <div className="mt-6 [&_a]:border-white/10 [&_a]:bg-white/10 [&_a]:shadow-none [&_a:hover]:border-white/30 [&_span]:text-current">
              <ContactChannels brand={brand} dict={d} compact />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
