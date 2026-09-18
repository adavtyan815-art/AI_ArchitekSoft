import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, CheckList, Frame, Index, SectionHeading, Tag, Ticks } from "@/components/ui";

/** Page-only strings that have no dictionary key yet. */
const LOCAL: Record<Locale, { result: string; surveyCaption: string; surveyMark: string }> = {
  hy: { result: "Արդյունքը", surveyCaption: "Չափագրում → Web Viewer", surveyMark: "24–48 Ժ" },
  ru: { result: "Результат", surveyCaption: "Обмер → Web Viewer", surveyMark: "24–48 Ч" },
  en: { result: "Result", surveyCaption: "Survey → Web Viewer", surveyMark: "24–48 H" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/how-it-works", title: d.nav.howItWorks, description: d.howItWorks.subtitle });
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const h = d.howItWorks;
  const t = LOCAL[locale];
  const head = h.comparison.head;

  return (
    <>
      {/* ───────────────────────── 01 · HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{h.tag}</span>
            </div>
            <h1 className="h-display max-w-3xl">{h.title}</h1>
          </div>
          <p className="lead lg:col-span-4 lg:self-end">{h.subtitle}</p>
        </div>
        <div className="mt-12 sm:mt-16">
          <Ticks />
        </div>
      </section>

      {/* ───────────────────────── 02 · STAGES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <ol className="border-t border-line">
          {h.stages.map((s) => (
            <li key={s.n} className="grid gap-x-8 gap-y-4 border-b border-line py-8 sm:py-10 lg:grid-cols-12 lg:gap-x-10">
              <div className="flex items-start gap-4 lg:col-span-5">
                <Index n={s.n} className="mt-2 flex-none sm:mt-3" />
                <h2 className="font-display text-[1.55rem] leading-tight text-fg sm:text-[2rem]">{s.title}</h2>
              </div>
              <p className="text-[15px] leading-relaxed text-muted lg:col-span-4">{s.text}</p>
              <div className="lg:col-span-3">
                <div className="caption">{t.result}</div>
                <Tag className="mt-2">{s.out}</Tag>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────── 03 · TIMELINE ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={2} eyebrow={h.tag} title={h.timelineTitle} />
        <div className="mt-10 sm:mt-14">
          <Ticks />
          <ol className="mt-7 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {h.timeline.map((tl) => (
              <li key={tl.when} className="relative">
                <span aria-hidden className="absolute -top-7 left-0 h-7 w-px bg-line-strong" />
                <div className="font-mono text-[12px] font-medium tracking-[0.08em] text-accent uppercase tabular-nums">{tl.when}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{tl.what}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────────────── 04 · WHAT YOU NEED ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <SectionHeading index={3} eyebrow={d.home.needTag} title={d.home.needTitle} />
            <CheckList numbered items={d.home.needItems} className="mt-8" />
            <p className="caption mt-7">{d.home.needNote}</p>
            <ButtonLink href={p("/start")} className="mt-7">
              {d.common.startProject}
              <ArrowUpRight size={16} />
            </ButtonLink>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Frame marks caption={t.surveyCaption} captionRight={t.surveyMark}>
              <div className="relative aspect-[4/3] bg-surface-2">
                <Image src="/demo/render-3.webp" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </Frame>
          </div>
        </div>
      </section>

      {/* ───────────────────────── 05 · COMPARISON ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={4} eyebrow={head[2]} title={h.comparisonTitle} />
        <dl className="mt-10 border-t border-line sm:mt-14">
          <div className="hidden grid-cols-[minmax(0,11rem)_1fr_1fr] gap-8 border-b border-line py-3 sm:grid">
            <span aria-hidden />
            <span className="kicker">{head[1]}</span>
            <span className="kicker text-fg">{head[2]}</span>
          </div>
          {h.comparison.rows.map((row) => (
            <div key={row[0]} className="grid gap-x-8 gap-y-3 border-b border-line py-5 sm:grid-cols-[minmax(0,11rem)_1fr_1fr] sm:py-6">
              <dt className="font-mono text-[11.5px] leading-6 tracking-[0.1em] text-muted uppercase">{row[0]}</dt>
              <dd className="text-[15px] leading-relaxed text-muted">
                <span className="caption mr-2 sm:hidden">{head[1]} —</span>
                {row[1]}
              </dd>
              <dd className="text-[15px] leading-relaxed font-medium text-fg">
                <span className="caption mr-2 sm:hidden">{head[2]} —</span>
                {row[2]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────────────────────── 06 · CTA ───────────────────────── */}
      <section className="container-x pt-6 pb-16 sm:pb-24 reveal">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{d.home.finalTitle}</h2>
              <p className="mt-4 max-w-md text-[15px] opacity-85">{d.home.finalText}</p>
            </div>
            <div className="lg:col-span-5 lg:justify-self-end">
              <ButtonLink href={p("/start")} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {d.common.startProject}
                <ArrowUpRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
