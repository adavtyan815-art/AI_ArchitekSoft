import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, CheckList, Frame, Index, SectionHeading, Spec, Ticks } from "@/components/ui";
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
  const startB2c = p("/start?segment=b2c");

  return (
    <>
      {/* 01 — HERO */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-6 lg:pr-6">
            <div className="mb-6 flex items-baseline gap-3">
              <Index n={1} />
              <span className="eyebrow">{h.tag}</span>
            </div>
            <h1 className="h-display max-sm:break-words">{h.title}</h1>
            <p className="lead mt-7 max-w-[34rem]">{h.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={startB2c} size="lg">
                {h.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/portfolio")} variant="secondary" size="lg">
                {d.common.seeWork}
              </ButtonLink>
            </div>
            <p className="caption mt-5">{d.home.heroNote}</p>
          </div>
          <div className="lg:col-span-6">
            <Frame marks caption={d.home.heroCaption} captionRight="B2C">
              <BeforeAfter before="/demo/sketch.webp" after="/demo/render-1.webp" labels={[d.portal.before, d.portal.after]} aspect="aspect-[4/3] sm:aspect-[16/11]" />
            </Frame>
          </div>
        </div>

        {/* Good to know */}
        <div className="mt-14 grid gap-6 border-t border-line pt-7 sm:mt-20 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3">
            <span className="eyebrow">{h.notSellerTitle}</span>
          </div>
          <p className="text-[15px] leading-relaxed text-fg-2 lg:col-span-8 lg:col-start-5">{h.notSellerText}</p>
        </div>
      </section>

      {/* 02 — WHY IT WORKS */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={2} eyebrow={d.home.helpTag} title={h.benefitsTitle} />
        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <Frame marks aspect="aspect-[4/3]" caption="Web Viewer · AR · 1:1" captionRight="B2C">
              <Image src="/demo/render-2.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </Frame>
          </div>
          <ol className="lg:col-span-5 lg:col-start-8">
            {h.benefits.map((it, i) => (
              <li key={it.title} className="border-t border-line py-5 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-5">
                <div className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <Index n={i + 1} className="pt-1.5" />
                  <div>
                    <div className="font-display text-[1.25rem] leading-tight text-fg">{it.title}</div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{it.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 03 — HOW IT GOES (timeline on a ruler) */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={3} eyebrow={d.home.stepsTag} title={h.stepsTitle} />
        <div className="mt-10 lg:mt-14">
          <Ticks />
          <ol className="mt-7 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {h.steps.map((s, i) => (
              <li key={s.title}>
                <Index n={i + 1} />
                <div className="mt-3 font-display text-[1.3rem] leading-tight text-fg">{s.title}</div>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 04 — WHAT YOU NEED */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={4} eyebrow={d.home.needTag} title={h.needTitle} text={d.home.needNote} />
        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <CheckList items={d.home.needItems} numbered className="space-y-4" />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Frame caption={d.portal.beforeAfter} captionRight={d.home.heroCaption}>
              <BeforeAfter before="/demo/sketch.webp" after="/demo/render-3.webp" labels={[d.portal.before, d.portal.after]} aspect="aspect-[4/3] sm:aspect-[16/10]" />
            </Frame>
          </div>
        </div>
      </section>

      {/* 05 — DECISION PACKAGE */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={5} eyebrow={d.common.included} title={h.packageTitle} text={h.packageText} />
        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <CheckList items={h.packageItems} className="space-y-3.5" />
            <p className="caption mt-8">{h.pricingNote}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="kicker mb-4">{d.common.addon}</div>
            <Spec rows={h.addons.map((a) => ({ k: a.title, v: a.text }))} />
            <p className="caption mt-5">{d.common.onRequest}</p>
          </div>
        </div>
      </section>

      {/* 06 — CTA */}
      <section className="container-x pb-20 reveal sm:pb-28">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid items-end gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{d.home.finalTitle}</h2>
              <p className="mt-4 max-w-lg text-[15px] opacity-85 sm:text-[16px]">{d.home.finalText}</p>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
              <ButtonLink href={startB2c} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {h.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
