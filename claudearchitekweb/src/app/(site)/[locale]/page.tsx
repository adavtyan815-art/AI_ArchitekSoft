import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Box, Building2, Factory, FileCheck2, Layers, MonitorPlay, Palette, Ruler, Smartphone, Sparkles } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, CheckList, IconBox, SectionHeading } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { Faq } from "@/components/site/faq";
import { BeforeAfter } from "@/components/site/before-after";
import { ViewerDemo } from "@/components/site/viewer-demo";
import { pageMeta } from "./meta";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/", title: d.meta.title, description: d.meta.description });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });
  const helpIcons = [Palette, Layers, FileCheck2];
  const pillarIcons = [Box, Palette, Factory];
  const solutionIcons = [Building2, Sparkles, Smartphone, Ruler];

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 pb-8 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">
              <span className="dot bg-accent" />
              {d.home.heroBadge}
            </div>
            <h1 className="h-display">{d.home.heroTitle}</h1>
            <p className="lead mt-6">{d.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={p("/start")} size="lg">
                {d.home.heroPrimary}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href="#viewer" variant="secondary" size="lg">
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

        <ul className="mt-12 grid grid-cols-2 divide-line overflow-hidden rounded-2xl border border-line bg-surface sm:mt-16 md:grid-cols-4 md:divide-x">
          {d.home.proof.map((it, i) => (
            <li key={it.label} className={i < 2 ? "border-b border-line p-5 md:border-b-0" : "p-5"}>
              <div className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">{it.value}</div>
              <div className="mt-1 text-[13px] leading-snug text-muted">{it.label}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────────────────── HOW WE HELP ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading eyebrow={d.home.helpTag} title={d.home.helpTitle} text={d.home.helpText} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {d.home.help.map((h, i) => {
            const Icon = helpIcons[i];
            return (
              <div key={h.title} className="card p-6">
                <IconBox>
                  <Icon />
                </IconBox>
                <div className="mt-5 h-card">{h.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{h.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── TWO DOORS ───────────────────────── */}
      <section className="container-x section reveal">
        <SectionHeading title={d.home.splitTitle} text={d.home.splitSubtitle} align="center" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.jpg" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.jpg" },
          ].map(({ card, href, img }) => (
            <Link key={href} href={href} className="card card-hover group overflow-hidden">
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
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

      {/* ───────────────────────── WEB VIEWER DEMO ───────────────────────── */}
      <section id="viewer" className="container-x section-tight scroll-mt-24 reveal">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeading eyebrow={d.home.viewerTag} title={d.home.viewerTitle} text={d.home.viewerText} />
            <ButtonLink href={p("/start")} className="mt-7">
              {d.home.viewerCta}
              <ArrowUpRight size={16} />
            </ButtonLink>
            <div className="mt-4">
              <Link href={p("/viewer")} className="text-sm font-semibold text-accent">
                {d.nav.viewer} →
              </Link>
            </div>
          </div>
          <ViewerDemo labels={{ hint: d.home.viewerHint, swatches: d.home.viewerSwatches, ar: d.home.viewerAr, load: d.common.tryDemo }} />
        </div>
      </section>

      {/* ───────────────────────── KITCHENPRO ───────────────────────── */}
      <section className="section">
        <div className="container-x">
          <div className="inverse overflow-hidden rounded-3xl px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20 reveal">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <div className="eyebrow mb-4 text-accent">{d.home.kitchenproTag}</div>
                <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{d.home.kitchenproTitle}</h2>
                <p className="mt-5 text-[17px] leading-relaxed opacity-80">{d.home.kitchenproText}</p>
                <ButtonLink href={p("/kitchenpro")} className="mt-8 bg-inverse-fg text-inverse-bg hover:opacity-90">
                  {d.home.kitchenproCta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
              <div className="grid gap-3">
                {d.home.pillars.map((pl, i) => {
                  const Icon = pillarIcons[i];
                  return (
                    <div key={pl.title} className="flex gap-4 rounded-2xl border border-current/10 bg-current/5 p-5">
                      <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent text-accent-fg">
                        <Icon size={18} />
                      </span>
                      <div>
                        <div className="font-display text-lg font-semibold">{pl.title}</div>
                        <p className="mt-1 text-[14.5px] leading-relaxed opacity-75">{pl.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── STEPS + NEED ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div>
            <SectionHeading eyebrow={d.home.stepsTag} title={d.home.stepsTitle} />
            <ol className="mt-8 space-y-3">
              {d.home.steps.map((s, i) => (
                <li key={s.title} className="card flex gap-5 p-5 sm:p-6">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-fg font-display text-sm font-bold text-bg">{i + 1}</div>
                  <div>
                    <div className="h-card">{s.title}</div>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card-inset h-fit p-6 sm:p-8 lg:sticky lg:top-28">
            <div className="eyebrow">{d.home.needTag}</div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">{d.home.needTitle}</h3>
            <CheckList items={d.home.needItems} className="mt-5" />
            <p className="mt-5 text-sm text-muted">{d.home.needNote}</p>
            <ButtonLink href={p("/start")} className="mt-6 w-full">
              {d.common.startProject}
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ───────────────────────── LIVE 3D (PREMIUM) ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="card grid gap-8 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:p-10">
          <div>
            <div className="eyebrow mb-4">
              <MonitorPlay size={14} />
              {d.home.liveTag}
            </div>
            <h2 className="h-section">{d.home.liveTitle}</h2>
            <p className="lead mt-4">{d.home.liveText}</p>
            <CheckList items={d.home.liveBullets} className="mt-6" />
            <ButtonLink href={p("/for-business")} variant="secondary" className="mt-7">
              {d.home.liveCta}
              <ArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
            <Image src="/demo/interior.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <div className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur">Unreal Engine 5 · 4K</div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── PORTFOLIO ───────────────────────── */}
      {work.length ? (
        <section className="container-x section-tight reveal">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow={d.home.portfolioTag} title={d.home.portfolioTitle} />
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

      {/* ───────────────────────── OTHER INDUSTRIES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading eyebrow={d.home.solutionsTag} title={d.home.solutionsTitle} text={d.home.solutionsText} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {d.home.solutions.map((s, i) => {
            const Icon = solutionIcons[i];
            return (
              <Link key={s.title} href={p("/solutions")} className="card card-hover p-5">
                <IconBox tone="neutral">
                  <Icon />
                </IconBox>
                <div className="mt-4 h-card">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── TRUST + FAQ ───────────────────────── */}
      <section className="container-x section-tight grid gap-12 lg:grid-cols-[1fr_1.2fr] reveal">
        <div>
          <SectionHeading eyebrow={d.home.trustTag} title={d.home.trustTitle} text={d.home.trustText} />
          <div className="mt-6 flex flex-wrap gap-2">
            {["Unreal Engine 5", "EGGER", "Blum", "Hettich", "Kronospan", "iOS AR", "Android AR"].map((t) => (
              <span key={t} className="pill">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-4">{d.home.faqTag}</div>
          <h2 className="h-section">{d.home.faqTitle}</h2>
          <Faq items={d.home.faq} className="mt-6" />
        </div>
      </section>

      {/* ───────────────────────── FINAL CTA ───────────────────────── */}
      <section className="container-x pt-8 reveal">
        <div className="rounded-3xl bg-accent px-6 py-12 text-accent-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg opacity-85">{d.home.finalText}</p>
              <ButtonLink href={p("/start")} size="lg" className="mt-7 bg-accent-fg text-accent hover:opacity-90">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
            <div className="rounded-2xl bg-black/10 p-5 backdrop-blur-sm">
              <div className="kicker mb-3 text-current opacity-80">{d.contact.channels}</div>
              <div className="[&_a]:border-white/10 [&_a]:bg-white/10 [&_a]:shadow-none [&_a:hover]:border-white/30 [&_span]:text-current">
                <ContactChannels brand={brand} dict={d} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
