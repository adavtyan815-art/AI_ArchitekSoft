import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Eye, Palette, Smartphone } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, CheckList, SectionHeading } from "@/components/ui";
import { BeforeAfter } from "@/components/site/before-after";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.home, description: d.homeSegment.subtitle };
}

export default async function ForHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const h = d.homeSegment;
  const benefitIcons = [Eye, Palette, Smartphone, BadgeCheck];
  const startB2c = p("/start?segment=b2c");

  return (
    <>
      {/* HERO */}
      <section className="container-x pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow mb-4 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {h.tag}
            </div>
            <h1 className="h-display">{h.title}</h1>
            <p className="lead mt-6 max-w-xl">{h.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={startB2c} size="lg">
                {h.cta}
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-500">{d.home.heroNote}</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            <BeforeAfter before="/demo/sketch.jpg" after="/demo/render-1.jpg" labels={[d.portal.before, d.portal.after]} />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading title={h.benefitsTitle} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.benefits.map((it, i) => {
            const Icon = benefitIcons[i] ?? Eye;
            return (
              <div key={it.title} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <div className="mt-4 text-base font-semibold text-ink-950">{it.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{it.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* STEPS + NEED */}
      <section className="container-x pb-16 sm:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading eyebrow={d.home.stepsTag} title={h.stepsTitle} />
            <ol className="mt-8 space-y-4">
              {h.steps.map((s, i) => (
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
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950">{h.needTitle}</h3>
            <CheckList items={d.home.needItems} className="mt-5" />
            <p className="mt-5 text-sm text-ink-500">{h.pricingNote}</p>
            <ButtonLink href={startB2c} className="mt-6 w-full">
              {h.cta}
              <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x pb-8">
        <div className="rounded-3xl bg-brand-500 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg text-brand-100">{d.home.finalText}</p>
            </div>
            <ButtonLink href={startB2c} size="lg" className="bg-white text-ink-950 hover:bg-brand-50">
              {h.cta}
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
