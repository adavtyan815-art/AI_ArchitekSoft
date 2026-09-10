import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Empty } from "@/components/ui";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.portfolio, description: d.portfolio.subtitle };
}

export default async function PortfolioPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const { locale: raw } = await params;
  const { c } = await searchParams;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
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
      <section className="container-x pt-14 pb-6 sm:pt-20">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">{d.portfolio.tag}</div>
          <h1 className="h-display">{d.portfolio.title}</h1>
          <p className="lead mt-6">{d.portfolio.subtitle}</p>
        </div>
      </section>

      <section className="container-x pb-16 sm:pb-24">
        {all.length ? (
          <div className="flex flex-wrap gap-2" role="tablist">
            {chips.map((k) => {
              const isActive = k === active;
              const n = k === "all" ? all.length : counts[k];
              return (
                <Link
                  key={k}
                  href={k === "all" ? p("/portfolio") : p(`/portfolio?c=${k}`)}
                  role="tab"
                  aria-selected={isActive}
                  className={cn("badge px-3.5 py-1.5 text-sm transition-colors", isActive ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300")}
                >
                  {filters[k]}
                  <span className={cn("ml-1 text-xs", isActive ? "text-ink-300" : "text-ink-400")}>{n}</span>
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="mt-8">
          {items.length ? (
            <PortfolioGrid items={items} locale={locale} labels={filters} openLive={d.portfolio.openLive} />
          ) : (
            <Empty
              title={d.portfolio.empty}
              action={
                <ButtonLink href={p("/start")} variant="secondary">
                  {d.common.startProject}
                  <ArrowRight size={16} />
                </ButtonLink>
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
