import Link from "next/link";
import { ArrowRight, Box, Factory, Layers, Ruler, Smartphone, Sparkles } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, CheckList, SectionHeading } from "@/components/ui";
import { ContactChannels } from "@/components/site/contact-channels";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { Faq } from "@/components/site/faq";
import { BeforeAfter } from "@/components/site/before-after";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const brand = getSetting("brand");
  const p = (path: string) => localePath(locale, path);
  const work = getPortfolio(locale, { featuredOnly: true, limit: 3 });
  const pillarIcons = [Box, Layers, Factory];
  const solutionIcons = [Ruler, Sparkles, Smartphone, Box];

  return (
    <>
      {/* HERO */}
      <section className="container-x pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow mb-4 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {d.home.heroBadge}
            </div>
            <h1 className="h-display">{d.home.heroTitle}</h1>
            <p className="lead mt-6 max-w-xl">{d.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={p("/start")} size="lg">
                {d.home.heroPrimary}
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.home.heroSecondary}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-500">{d.home.heroNote}</p>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
              <BeforeAfter before="/demo/sketch.jpg" after="/demo/render-1.jpg" labels={[d.portal.before, d.portal.after]} />
            </div>
            <div className="pointer-events-none absolute -bottom-4 -left-4 hidden rounded-2xl border border-line bg-white px-4 py-3 shadow-card sm:block">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Aren • AT-2026-0001</div>
              <div className="text-sm font-medium text-ink-900">{d.portal.stages.approval}</div>
            </div>
          </div>
        </div>

        {/* proof strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
          {d.home.proof.map((it) => (
            <div key={it.label} className="card p-5">
              <div className="text-2xl font-semibold tracking-tight text-ink-950">{it.value}</div>
              <div className="mt-1 text-sm text-ink-500">{it.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SPLIT B2B / B2C */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading title={d.home.splitTitle} text={d.home.splitSubtitle} align="center" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { card: d.home.b2bCard, href: p("/for-business"), img: "/demo/kitchen-walnut.jpg" },
            { card: d.home.b2cCard, href: p("/for-home"), img: "/demo/render-2.jpg" },
          ].map(({ card, href, img }) => (
            <Link key={href} href={href} className="card group overflow-hidden transition-shadow hover:shadow-card">
              <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-6 sm:p-7">
                <div className="eyebrow">{card.tag}</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950">{card.title}</h3>
                <p className="mt-3 text-ink-600">{card.text}</p>
                <CheckList items={card.bullets} className="mt-5" />
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
                  {card.cta}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* KITCHENPRO */}
      <section className="bg-ink-950 text-white">
        <div className="container-x py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <div className="eyebrow mb-3 text-brand-300">{d.home.kitchenproTag}</div>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{d.home.kitchenproTitle}</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-300">{d.home.kitchenproText}</p>
              <ButtonLink href={p("/kitchenpro")} variant="secondary" className="mt-8 border-white/15 bg-white/5 text-white hover:bg-white/10">
                {d.home.kitchenproCta}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {d.home.pillars.map((pl, i) => {
                const Icon = pillarIcons[i];
                return (
                  <div key={pl.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                        <Icon size={18} />
                      </span>
                      <div className="text-lg font-semibold">{pl.title}</div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-300">{pl.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* STEPS + NEED */}
      <section className="container-x py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading eyebrow={d.home.stepsTag} title={d.home.stepsTitle} />
            <ol className="mt-8 space-y-4">
              {d.home.steps.map((s, i) => (
                <li key={s.title} className="card flex gap-5 p-5 sm:p-6">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-white">{i + 1}</div>
                  <div>
                    <div className="text-lg font-semibold text-ink-950">{s.title}</div>
                    <p className="mt-1 text-ink-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card h-fit bg-paper-2 p-6 sm:p-8 lg:sticky lg:top-24">
            <div className="eyebrow">{d.home.needTag}</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950">{d.home.needTitle}</h3>
            <CheckList items={d.home.needItems} className="mt-5" />
            <p className="mt-5 text-sm text-ink-500">{d.home.needNote}</p>
            <ButtonLink href={p("/start")} className="mt-6 w-full">
              {d.common.startProject}
              <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      {work.length ? (
        <section className="container-x py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow={d.home.portfolioTag} title={d.home.portfolioTitle} />
            <Link href={p("/portfolio")} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
              {d.home.portfolioAll}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8">
            <PortfolioGrid items={work} locale={locale} labels={d.portfolio.filters} openLive={d.portfolio.openLive} />
          </div>
        </section>
      ) : null}

      {/* OTHER SOLUTIONS */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading eyebrow={d.home.solutionsTag} title={d.home.solutionsTitle} text={d.home.solutionsText} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {d.home.solutions.map((s, i) => {
            const Icon = solutionIcons[i];
            return (
              <Link key={s.title} href={p("/solutions")} className="card p-5 transition-colors hover:border-ink-300">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <div className="mt-4 text-base font-semibold text-ink-950">{s.title}</div>
                <p className="mt-2 text-sm text-ink-600">{s.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TRUST + FAQ */}
      <section className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeading eyebrow={d.home.trustTag} title={d.home.trustTitle} text={d.home.trustText} />
          <div className="mt-6 flex flex-wrap gap-2">
            {["Unreal Engine 5", "EGGER", "Blum", "Hettich", "Kronospan", "iOS AR", "Android AR"].map((t) => (
              <span key={t} className="badge border-ink-200 bg-white text-ink-700">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-3">{d.home.faqTag}</div>
          <h2 className="h-section">{d.home.faqTitle}</h2>
          <Faq items={d.home.faq} className="mt-6" />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container-x pt-8">
        <div className="rounded-3xl bg-brand-500 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg text-brand-100">{d.home.finalText}</p>
              <ButtonLink href={p("/start")} size="lg" className="mt-7 bg-white text-ink-950 hover:bg-brand-50">
                {d.common.startProject}
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-100">{d.contact.channels}</div>
              <div className="mt-3 [&_a]:border-white/10 [&_a]:bg-white/10 [&_a]:text-white [&_a:hover]:border-white/30 [&_span]:text-white">
                <ContactChannels brand={brand} dict={d} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
