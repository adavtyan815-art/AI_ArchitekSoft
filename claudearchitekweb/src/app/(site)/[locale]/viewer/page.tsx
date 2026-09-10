import type { Metadata } from "next";
import { ArrowUpRight, Move3d, Palette, Share2, Smartphone } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, IconBox, SectionHeading } from "@/components/ui";
import { ViewerDemo } from "@/components/site/viewer-demo";
import { pageMeta } from "../meta";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/viewer", title: d.viewerPage.title, description: d.viewerPage.subtitle });
}

export default async function ViewerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const v = d.viewerPage;
  const p = (path: string) => localePath(locale, path);
  const icons = [Move3d, Palette, Smartphone, Share2];

  return (
    <>
      <section className="container-x pt-10 sm:pt-16">
        <SectionHeading eyebrow={v.tag} title={v.title} text={v.subtitle} size="display" className="max-w-3xl" />
      </section>

      <section className="container-x section-tight">
        <div className="kicker mb-3">{v.demoTitle}</div>
        <ViewerDemo labels={{ hint: d.home.viewerHint, swatches: d.home.viewerSwatches, ar: d.home.viewerAr, load: d.common.tryDemo }} height="h-[440px] sm:h-[600px]" autoload />
      </section>

      <section className="container-x section-tight reveal">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {v.features.map((f, i) => {
            const Icon = icons[i];
            return (
              <div key={f.title} className="card p-5">
                <IconBox>
                  <Icon />
                </IconBox>
                <div className="mt-4 h-card">{f.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-x section-tight reveal">
        <SectionHeading title={v.vsTitle} />
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {v.vs.head.map((h, i) => (
                  <th key={i} className={i === 0 ? "px-5 py-3 text-left text-[11px] font-semibold tracking-wide text-muted uppercase" : "px-5 py-3 text-left font-display text-base font-semibold text-fg"}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.vs.rows.map((row) => (
                <tr key={row[0]} className="border-b border-line last:border-0">
                  {row.map((cell, i) => (
                    <td key={i} className={i === 0 ? "px-5 py-3.5 font-medium text-fg" : "px-5 py-3.5 text-fg-2"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8">
          <ButtonLink href={p("/start")} size="lg">
            {v.cta}
            <ArrowUpRight size={18} />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
