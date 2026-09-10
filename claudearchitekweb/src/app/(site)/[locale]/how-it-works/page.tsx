import type { Metadata } from "next";
import { ArrowRight, Check, Minus } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.howItWorks, description: d.howItWorks.subtitle };
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const h = d.howItWorks;

  return (
    <>
      <section className="container-x pt-14 pb-6 sm:pt-20">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">{h.tag}</div>
          <h1 className="h-display">{h.title}</h1>
          <p className="lead mt-6">{h.subtitle}</p>
        </div>
      </section>

      {/* STAGES */}
      <section className="container-x py-10 sm:py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {h.stages.map((s) => (
            <div key={s.n} className="card flex flex-col p-6 sm:p-8">
              <div className="text-5xl font-semibold tracking-tight text-ink-200">{s.n}</div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-950">{s.title}</h2>
              <p className="mt-3 flex-1 leading-relaxed text-ink-600">{s.text}</p>
              <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <Check size={12} strokeWidth={3} />
                {s.out}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-paper-2">
        <div className="container-x py-16 sm:py-20">
          <SectionHeading title={h.timelineTitle} />
          <ol className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
            {h.timeline.map((t, i) => (
              <li key={t.when} className="grid gap-2 px-5 py-5 sm:grid-cols-[180px_1fr] sm:items-center sm:px-7">
                <div className="flex items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 flex-none rounded-full", i === h.timeline.length - 1 ? "bg-ink-950" : "bg-brand-500")} />
                  <span className="text-sm font-semibold uppercase tracking-wide text-ink-500">{t.when}</span>
                </div>
                <div className="text-base font-medium text-ink-900">{t.what}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeading title={h.comparisonTitle} />
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                {h.comparison.head.map((c, i) => (
                  <th key={i} className={cn("border-b border-line px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide", i === 2 ? "bg-brand-50 text-brand-700" : "bg-ink-50 text-ink-500")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {h.comparison.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} className={cn("border-b border-line px-5 py-4 align-top last:border-b-0", i === 0 && "font-semibold text-ink-950", i === 1 && "text-ink-500", i === 2 && "bg-brand-50/60 font-medium text-ink-900")}>
                      <span className="inline-flex items-start gap-2">
                        {i === 1 ? <Minus size={14} className="mt-0.5 flex-none text-ink-300" /> : null}
                        {i === 2 ? <Check size={14} className="mt-0.5 flex-none text-brand-600" strokeWidth={3} /> : null}
                        {cell}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
            <ButtonLink href={p("/start")} size="lg" className="bg-white text-ink-950 hover:bg-brand-50">
              {d.common.startProject}
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
