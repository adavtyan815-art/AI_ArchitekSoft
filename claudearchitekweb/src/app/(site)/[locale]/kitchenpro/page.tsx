import type { Metadata } from "next";
import { ArrowRight, Box, Calculator, ClipboardList, Cpu, FileText, Layers, Settings2, SlidersHorizontal } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { ButtonLink, SectionHeading } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const d = getDictionary((isLocale(raw) ? raw : "hy") as Locale);
  return { title: d.nav.kitchenpro, description: d.kitchenpro.subtitle };
}

export default async function KitchenProPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const k = d.kitchenpro;
  const capIcons = [Box, Layers, SlidersHorizontal, Calculator, Settings2, FileText, Cpu, ClipboardList];

  return (
    <>
      {/* HERO */}
      <section className="container-x pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="eyebrow mb-4 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {d.nav.kitchenpro}
            </div>
            <h1 className="h-display">{k.title}</h1>
            <p className="lead mt-6 max-w-xl">{k.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={p("/start")} size="lg">
                {k.cta}
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/how-it-works")} variant="secondary" size="lg">
                {d.nav.howItWorks}
              </ButtonLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/demo/render-1.jpg" alt="" className="aspect-[16/11] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-7 sm:p-9">
            <div className="eyebrow text-ink-500">{k.problemTitle}</div>
            <p className="mt-4 text-lg leading-relaxed text-ink-700">{k.problemText}</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-7 sm:p-9">
            <div className="eyebrow">{k.solutionTitle}</div>
            <p className="mt-4 text-lg leading-relaxed text-ink-900">{k.solutionText}</p>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="container-x pb-16 sm:pb-20">
        <SectionHeading eyebrow={d.nav.kitchenpro} title={k.capabilitiesTitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {k.capabilities.map((c, i) => {
            const Icon = capIcons[i] ?? Box;
            return (
              <div key={c.title} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <div className="mt-4 text-base font-semibold text-ink-950">{c.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{c.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="bg-paper-2">
        <div className="container-x py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <SectionHeading eyebrow={d.nav.howItWorks} title={k.workflowTitle} />
              <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/demo/sketch.jpg" alt="" className="aspect-[4/3] w-full object-cover" />
              </div>
            </div>
            <ol className="relative space-y-3 lg:pl-3">
              {k.workflow.map((w, i) => (
                <li key={w.stage} className="relative flex gap-5">
                  <div className="flex flex-none flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950 text-sm font-semibold text-white">{w.stage}</div>
                    {i < k.workflow.length - 1 ? <div className="w-px flex-1 bg-ink-200" /> : null}
                  </div>
                  <div className="card mb-3 flex-1 p-5">
                    <div className="text-base font-semibold text-ink-950">{w.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{w.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* B2B / B2C */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { title: k.b2bTitle, text: k.b2bText, img: "/demo/kitchen-walnut.jpg", href: p("/for-business"), cta: d.nav.business },
            { title: k.b2cTitle, text: k.b2cText, img: "/demo/render-1.jpg", href: p("/for-home"), cta: d.nav.home },
          ].map((c) => (
            <div key={c.title} className="card overflow-hidden">
              <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-6 sm:p-7">
                <h3 className="text-2xl font-semibold tracking-tight text-ink-950">{c.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-600">{c.text}</p>
                <ButtonLink href={c.href} variant="secondary" className="mt-6">
                  {c.cta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>

        {/* STATUS */}
        <div className="mt-10 rounded-2xl border border-line bg-paper-2 p-6 sm:p-8">
          <div className="eyebrow text-ink-500">{k.statusTitle}</div>
          <p className="mt-3 max-w-3xl text-ink-700">{k.statusText}</p>
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
              {k.cta}
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
