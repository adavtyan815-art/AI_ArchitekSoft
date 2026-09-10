import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Index, Ticks } from "@/components/ui";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/portfolio", title: d.nav.portfolio, description: d.portfolio.subtitle });
}

/** Page-local strings (the shared dictionary does not carry them). */
const LOCAL: Record<Locale, { filterLabel: string; projects: string; selected: string }> = {
  hy: { filterLabel: "Ֆիլտր", projects: "նախագիծ", selected: "Ընտրված" },
  ru: { filterLabel: "Фильтр", projects: "проектов", selected: "Показано" },
  en: { filterLabel: "Filter", projects: "projects", selected: "Showing" },
};

export default async function PortfolioPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const { locale: raw } = await params;
  const { c } = await searchParams;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const t = LOCAL[locale];
  const p = (path: string) => localePath(locale, path);
  const all = getPortfolio(locale);
  const filters = d.portfolio.filters as Record<string, string>;
  const counts: Record<string, number> = {};
  for (const it of all) counts[it.category] = (counts[it.category] ?? 0) + 1;
  const active = c && c !== "all" && filters[c] ? c : "all";
  const items = active === "all" ? all : all.filter((it) => it.category === active);
  const chips = Object.keys(filters).filter((k) => k === "all" || counts[k]);

  return (
    <>
      {/* 01 — HERO */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-6 flex items-center gap-3">
              <Index n={1} />
              <span className="eyebrow">{d.portfolio.tag}</span>
            </div>
            <h1 className="h-display">{d.portfolio.title}</h1>
            <p className="lead mt-7 max-w-[36rem]">{d.portfolio.subtitle}</p>
          </div>
          <div className="lg:col-span-3 lg:col-start-10 lg:text-right">
            <div className="border-t border-line-strong pt-4 lg:border-t-0 lg:pt-0">
              <div className="font-display text-[3rem] leading-none font-medium text-fg tabular-nums">{String(all.length).padStart(2, "0")}</div>
              <div className="caption mt-2">{t.projects}</div>
            </div>
          </div>
        </div>
        <Ticks className="mt-12 sm:mt-16" />
      </section>

      {/* 02 — FILTER + GRID */}
      <section className="container-x pt-10 pb-16 sm:pt-14 sm:pb-24">
        {all.length ? (
          <div className="flex flex-col gap-4 border-b border-line pb-0 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            {/* Mono underline tabs; the row scrolls sideways on phones instead of wrapping. */}
            <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="tablist" aria-label={t.filterLabel}>
              <div className="flex w-max gap-6 sm:w-auto sm:flex-wrap sm:gap-x-7">
                {chips.map((k) => {
                  const isActive = k === active;
                  const n = k === "all" ? all.length : counts[k];
                  return (
                    <Link
                      key={k}
                      href={k === "all" ? p("/portfolio") : p(`/portfolio?c=${k}`)}
                      role="tab"
                      aria-selected={isActive}
                      className={cn(
                        "-mb-px inline-flex min-h-[44px] items-baseline gap-1.5 border-b-2 pb-2.5 font-mono text-[12px] tracking-[0.08em] whitespace-nowrap uppercase transition-colors",
                        isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                      )}
                    >
                      {filters[k]}
                      <span className={cn("text-[10.5px] tabular-nums", isActive ? "text-accent" : "text-faint")}>{String(n).padStart(2, "0")}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <span className="caption hidden flex-none pb-3 sm:block">
              {t.selected} {String(items.length).padStart(2, "0")} / {String(all.length).padStart(2, "0")}
            </span>
          </div>
        ) : null}

        <div className="mt-10 sm:mt-14">
          {items.length ? (
            <PortfolioGrid items={items} locale={locale} labels={filters} openLive={d.portfolio.openLive} columns={2} />
          ) : (
            <div className="grid-paper border-y border-line px-6 py-24 text-center">
              <h2 className="h-sub">{d.portfolio.empty}</h2>
              <div className="mt-7">
                <ButtonLink href={p("/start")} variant="secondary">
                  {d.common.startProject}
                  <ArrowUpRight size={16} />
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 03 — CTA */}
      <section className="container-x pb-16 sm:pb-24">
        <div className="reveal grid gap-8 rounded-xl bg-accent px-6 py-12 text-accent-fg sm:px-10 sm:py-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 className="font-display text-[1.9rem] leading-[1.08] font-medium sm:text-[2.5rem]">{d.home.finalTitle}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed opacity-85">{d.home.finalText}</p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
            <ButtonLink href={p("/start")} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
              {d.common.startProject}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
