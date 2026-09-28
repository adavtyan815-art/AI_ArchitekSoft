import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Maximize2 } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, Index, SectionHeading, Ticks } from "@/components/ui";
import { TrackedCta } from "@/components/site/cta";
import { KitchenViewer } from "@/components/site/kitchen-viewer";
import { viewerLang, viewerParamsFromQuery, viewerSrc } from "@/lib/webviewer";
import { pageMeta } from "../meta";

/** Page-only strings that have no dictionary key yet. */
const LOCAL: Record<Locale, { featuresTitle: string; frameTitle: string; fullscreen: string }> = {
  hy: { featuresTitle: "Ի՞նչ կարող է անել Ձեր հաճախորդը", frameTitle: "Խոհանոցի 3D դիտում", fullscreen: "Բացել ամբողջ էկրանով" },
  ru: { featuresTitle: "Что может ваш клиент", frameTitle: "3D-просмотр кухни", fullscreen: "Открыть на весь экран" },
  en: { featuresTitle: "What your customer can do", frameTitle: "3D kitchen", fullscreen: "Open full screen" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/viewer", title: d.viewerPage.title, description: d.viewerPage.subtitle });
}

export default async function ViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  /** `bundle`, `cfg`, `doors` are forwarded into the viewer, so a shared configuration opens inside the site. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  const opts = viewerParamsFromQuery(await searchParams);
  const fullHref = viewerSrc({ ...opts, lang: viewerLang((isLocale(raw) ? raw : "hy") as Locale), demo: true });
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const v = d.viewerPage;
  const p = (path: string) => localePath(locale, path);
  const t = LOCAL[locale];

  return (
    <>
      {/* 01 — HERO */}
      <section className="container-x pt-10 sm:pt-14 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7 lg:pr-8">
            <div className="mb-6 flex items-baseline gap-3">
              <Index n={1} />
              <span className="eyebrow">{v.tag}</span>
            </div>
            <h1 className="h-display max-sm:break-words">{v.title}</h1>
          </div>
          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="lead max-w-[32rem]">{v.subtitle}</p>
            <p className="caption mt-5">{d.home.heroNote}</p>
          </div>
        </div>
        <div className="mt-12 sm:mt-16">
          <Ticks />
        </div>
      </section>

      {/* 02 — DEMO */}
      <section className="container-x pt-12 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
          <div className="flex items-baseline gap-3">
            <Index n={2} />
            <span className="eyebrow">{v.demoTitle}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="caption max-sm:hidden">3D · AR · {d.home.viewerSwatches}</span>
            {/* Full screen: the viewer as its own page (its brand, "Back to main website", the whole screen) —
                a real button right above the frame, the first thing people look for. Also the top-level page
                phones and iOS AR Quick Look work best in. */}
            <a href={fullHref} className="btn-secondary min-h-11 gap-2 px-4">
              <Maximize2 size={16} aria-hidden />
              {t.fullscreen}
            </a>
          </div>
        </div>
        {/* The viewer owns the whole box: toolbars, material panel (bottom sheet on phones), AR.
            Phones: edge to edge, past the page gutter (the clamp is container-x's padding). */}
        <KitchenViewer locale={locale} {...opts} demo title={t.frameTitle} className="frame mt-6 max-sm:-mx-[clamp(20px,4vw,72px)] max-sm:rounded-none max-sm:border-x-0" />
      </section>

      {/* 03 — FEATURES */}
      <section className="container-x section-tight reveal">
        <SectionHeading index={3} eyebrow={v.tag} title={t.featuresTitle} />
        <ol className="mt-10 grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {v.features.map((f, i) => (
            <li key={f.title} className="border-t border-line-strong pt-5 pb-8 lg:pb-0">
              <Index n={i + 1} />
              <div className="mt-4 font-display text-[1.25rem] leading-tight text-fg">{f.title}</div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 04 — WEB VIEWER vs LIVE 3D */}
      <section className="container-x section-tight reveal">
        <SectionHeading
          index={4}
          eyebrow={d.home.liveTag}
          title={v.vsTitle}
          action={
            <ButtonLink href={p("/live-3d")} variant="secondary">
              Live 3D
              <ArrowRight size={15} />
            </ButtonLink>
          }
        />
        <div className="mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0 lg:mt-14">
          <table className="w-full min-w-[600px] border-collapse text-[15px]">
            <thead>
              <tr>
                {v.vs.head.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={
                      i === 0
                        ? "w-[9rem] border-y border-line-strong py-3 pr-4 text-left font-mono text-[10.5px] font-medium tracking-[0.1em] text-muted uppercase"
                        : "border-y border-line-strong px-4 py-3 text-left font-mono text-[10.5px] font-medium tracking-[0.1em] text-fg uppercase"
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.vs.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} className={i === 0 ? "border-b border-line py-4 pr-4 align-top font-mono text-[11.5px] tracking-[0.08em] text-muted uppercase" : "border-b border-line px-4 py-4 align-top text-fg-2"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 05 — CTA */}
      <section className="container-x pb-20 reveal sm:pb-28">
        <div className="rounded-xl bg-accent p-7 text-accent-fg sm:p-12">
          <div className="grid items-end gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[1.9rem] leading-[1.08] sm:text-[2.6rem]">{d.home.finalTitle}</h2>
              <p className="mt-4 max-w-lg text-[15px] opacity-85 sm:text-[16px]">{d.home.finalText}</p>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
              <TrackedCta href={p("/start")} label="viewer-closing" locale={locale} size="lg" className="w-full bg-[#17150f] text-[#f4f2ed] hover:bg-[#2a2620] sm:w-fit">
                {v.cta}
                <ArrowUpRight size={18} />
              </TrackedCta>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
