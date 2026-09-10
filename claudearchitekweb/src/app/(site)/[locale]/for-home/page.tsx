import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, Eye, Info, Palette, Plus, Smartphone } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, CheckList, IconBox, SectionHeading } from "@/components/ui";
import { BeforeAfter } from "@/components/site/before-after";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/for-home", title: d.nav.home, description: d.homeSegment.subtitle });
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
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 pb-8 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">
              <span className="dot bg-accent" />
              {h.tag}
            </div>
            <h1 className="h-display">{h.title}</h1>
            <p className="lead mt-6">{h.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={startB2c} size="lg">
                {h.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
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
      </section>

      {/* ───────────────────────── NOT A SELLER ───────────────────────── */}
      <section className="container-x pt-6 reveal">
        <div className="card-inset flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <IconBox tone="neutral">
            <Info />
          </IconBox>
          <div>
            <div className="h-card">{h.notSellerTitle}</div>
            <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-fg-2">{h.notSellerText}</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── BENEFITS ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading title={h.benefitsTitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.benefits.map((it, i) => {
            const Icon = benefitIcons[i] ?? Eye;
            return (
              <div key={it.title} className="card p-5 sm:p-6">
                <IconBox>
                  <Icon />
                </IconBox>
                <div className="mt-4 h-card">{it.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{it.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── STEPS + PACKAGE ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div>
            <SectionHeading eyebrow={d.home.stepsTag} title={h.stepsTitle} />
            <ol className="mt-8 space-y-3">
              {h.steps.map((s, i) => (
                <li key={s.title} className="card flex gap-4 p-5 sm:gap-5 sm:p-6">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-fg font-display text-sm font-bold text-bg">{i + 1}</div>
                  <div>
                    <div className="h-card">{s.title}</div>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* decision package */}
          <div className="card h-fit p-6 sm:p-8 lg:sticky lg:top-28">
            <div className="eyebrow">{d.common.included}</div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">{h.packageTitle}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{h.packageText}</p>
            <CheckList items={h.packageItems} className="mt-6" />

            <div className="mt-7 border-t border-line pt-6">
              <div className="kicker mb-3">{d.common.addon}</div>
              <ul className="space-y-3">
                {h.addons.map((a) => (
                  <li key={a.title} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-surface-2 text-muted">
                      <Plus size={12} strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-snug font-medium text-fg">{a.title}</span>
                      <span className="block text-sm leading-snug text-muted">{a.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 text-sm text-muted">{h.pricingNote}</p>
            <ButtonLink href={startB2c} size="lg" className="mt-5 w-full">
              {h.cta}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ───────────────────────── WHAT YOU NEED ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <div>
            <SectionHeading eyebrow={d.home.needTag} title={h.needTitle} text={d.home.needNote} />
          </div>
          <div className="card-inset p-6 sm:p-8">
            <CheckList items={d.home.needItems} />
          </div>
        </div>
      </section>

      {/* ───────────────────────── BEFORE / AFTER ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading eyebrow={d.portal.beforeAfter} title={d.home.heroCaption} align="center" />
        <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <BeforeAfter before="/demo/sketch.webp" after="/demo/render-3.webp" labels={[d.portal.before, d.portal.after]} aspect="aspect-[4/3] sm:aspect-[16/9]" />
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pt-4 pb-10 reveal">
        <div className="rounded-3xl bg-accent px-6 py-12 text-accent-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg opacity-85">{d.home.finalText}</p>
            </div>
            <ButtonLink href={startB2c} size="lg" className="w-full bg-accent-fg text-accent hover:opacity-90 sm:w-fit">
              {h.cta}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
