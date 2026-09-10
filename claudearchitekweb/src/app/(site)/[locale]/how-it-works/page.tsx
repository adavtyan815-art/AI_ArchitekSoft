import type { Metadata } from "next";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, SectionHeading, CheckList } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Page-only strings that have no dictionary key yet. */
const LOCAL: Record<Locale, { result: string; swipe: string }> = {
  hy: { result: "Արդյունքը", swipe: "Աղյուսակը շարժեք կողքի" },
  ru: { result: "Результат", swipe: "Таблицу можно прокрутить вбок" },
  en: { result: "Result", swipe: "Scroll the table sideways" },
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

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-16 lg:pt-20">
        <SectionHeading eyebrow={h.tag} title={h.title} text={h.subtitle} size="display" className="max-w-3xl" />
      </section>

      {/* ───────────────────────── STAGES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {h.stages.map((s) => (
            <div key={s.n} className="card flex flex-col p-6 sm:p-8">
              <div className="font-display text-5xl font-bold tracking-tight text-line-strong">{s.n}</div>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-fg">{s.title}</h2>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">{s.text}</p>
              <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-soft-fg">
                <Check size={12} strokeWidth={3} />
                <span className="opacity-70">{t.result}:</span>
                {s.out}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── TIMELINE ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading title={h.timelineTitle} />
        <ol className="card mt-8 divide-y divide-line overflow-hidden">
          {h.timeline.map((tl, i) => {
            const last = i === h.timeline.length - 1;
            return (
              <li key={tl.when} className="grid gap-1.5 px-5 py-5 sm:grid-cols-[200px_1fr] sm:items-center sm:px-7">
                <div className="flex items-center gap-3">
                  <span className={cn("dot h-2.5 w-2.5 flex-none", last ? "bg-fg" : "bg-accent")} />
                  <span className="kicker">{tl.when}</span>
                </div>
                <div className="pl-6 text-[15px] font-medium text-fg sm:pl-0">{tl.what}</div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ───────────────────────── COMPARISON ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading title={h.comparisonTitle} />
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr>
                {h.comparison.head.map((c, i) => (
                  <th
                    key={i}
                    className={cn(
                      "border-b border-line px-5 py-3.5 text-left align-bottom",
                      i === 2 ? "bg-accent-soft font-display text-base font-bold text-accent-soft-fg" : "bg-surface-2 text-[11px] font-semibold tracking-wide text-muted uppercase",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {h.comparison.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} className={cn("border-b border-line px-5 py-4 align-top last:border-b-0", i === 0 && "font-semibold text-fg", i === 1 && "text-muted", i === 2 && "bg-accent-soft/40 font-medium text-fg")}>
                      <span className="inline-flex items-start gap-2">
                        {i === 1 ? <Minus size={14} className="mt-0.5 flex-none text-faint" /> : null}
                        {i === 2 ? <Check size={14} className="mt-0.5 flex-none text-accent" strokeWidth={3} /> : null}
                        {cell}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-faint sm:hidden">{t.swipe}</p>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pt-4 pb-10 reveal">
        <div className="rounded-3xl bg-accent px-6 py-12 text-accent-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg opacity-85">{d.home.finalText}</p>
            </div>
            <ButtonLink href={p("/start")} size="lg" className="w-full bg-accent-fg text-accent hover:opacity-90 sm:w-fit">
              {d.common.startProject}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* WHAT YOU NEED */}
      <section className="container-x section-tight">
        <div className="card-inset grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <div className="eyebrow">{d.home.needTag}</div>
            <h2 className="mt-3 h-section">{d.home.needTitle}</h2>
            <p className="mt-3 text-sm text-muted">{d.home.needNote}</p>
          </div>
          <CheckList items={d.home.needItems} />
        </div>
      </section>
    </>
  );
}
