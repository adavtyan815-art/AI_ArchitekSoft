import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { getPortfolio } from "@/lib/public-data";
import { ButtonLink, Empty, SectionHeading } from "@/components/ui";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/portfolio", title: d.nav.portfolio, description: d.portfolio.subtitle });
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
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 sm:pt-16 lg:pt-20">
        <SectionHeading eyebrow={d.portfolio.tag} title={d.portfolio.title} text={d.portfolio.subtitle} size="display" className="max-w-3xl" />
      </section>

      {/* ───────────────────────── FILTERS + GRID ───────────────────────── */}
      <section className="container-x section-tight">
        {all.length ? (
          // The chip row scrolls horizontally on phones instead of wrapping into a tall block.
          <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" role="tablist">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {chips.map((k) => {
                const isActive = k === active;
                const n = k === "all" ? all.length : counts[k];
                return (
                  <Link
                    key={k}
                    href={k === "all" ? p("/portfolio") : p(`/portfolio?c=${k}`)}
                    role="tab"
                    aria-selected={isActive}
                    className={cn("pill min-h-[38px] px-4 text-sm transition-colors", isActive ? "bg-fg text-bg" : "hover:bg-surface-3")}
                  >
                    {filters[k]}
                    <span className={cn("text-xs tabular-nums", isActive ? "opacity-60" : "text-faint")}>{n}</span>
                  </Link>
                );
              })}
            </div>
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
                  <ArrowUpRight size={16} />
                </ButtonLink>
              }
            />
          )}
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pb-10 reveal">
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
    </>
  );
}
