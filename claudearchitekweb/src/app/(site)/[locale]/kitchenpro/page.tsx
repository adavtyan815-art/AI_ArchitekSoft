import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Box, Calculator, ClipboardList, Cpu, FileText, Layers, Settings2, SlidersHorizontal } from "lucide-react";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";
import { pageMeta } from "../meta";
import { ButtonLink, IconBox, SectionHeading } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "hy") as Locale;
  const d = getDictionary(locale);
  return pageMeta({ locale, path: "/kitchenpro", title: d.nav.kitchenpro, description: d.kitchenpro.subtitle });
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
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-x pt-10 pb-8 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="eyebrow mb-5">
              <span className="dot bg-accent" />
              {d.nav.kitchenpro}
            </div>
            <h1 className="h-display">{k.title}</h1>
            <p className="lead mt-6">{k.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={p("/start?segment=b2b")} size="lg">
                {k.cta}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink href={p("/how-it-works")} variant="secondary" size="lg">
                {d.nav.howItWorks}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">{d.home.heroNote}</p>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
            <Image src="/demo/render-1.jpg" alt="" fill priority sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* ───────────────────────── PROBLEM / SOLUTION ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <div className="card p-6 sm:p-8">
            <div className="kicker">{k.problemTitle}</div>
            <p className="mt-4 text-[17px] leading-relaxed text-fg-2">{k.problemText}</p>
          </div>
          <div className="rounded-2xl border border-accent/25 bg-accent-soft p-6 sm:p-8">
            <div className="eyebrow text-accent-soft-fg">{k.solutionTitle}</div>
            <p className="mt-4 text-[17px] leading-relaxed text-accent-soft-fg">{k.solutionText}</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CAPABILITIES ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <SectionHeading eyebrow={d.nav.kitchenpro} title={k.capabilitiesTitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {k.capabilities.map((c, i) => {
            const Icon = capIcons[i] ?? Box;
            return (
              <div key={c.title} className="card p-5 sm:p-6">
                <IconBox>
                  <Icon />
                </IconBox>
                <div className="mt-4 h-card">{c.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── WORKFLOW 0–6 ───────────────────────── */}
      <section className="section-tight">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.3fr] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading eyebrow={d.nav.howItWorks} title={k.workflowTitle} />
              <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card lg:block">
                <Image src="/demo/sketch.jpg" alt="" fill sizes="38vw" className="object-cover" />
              </div>
            </div>
            <ol className="relative">
              {k.workflow.map((w, i) => (
                <li key={w.stage} className="relative flex gap-4 pb-3 sm:gap-5">
                  <div className="flex flex-none flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fg font-display text-sm font-bold text-bg">{w.stage}</div>
                    {i < k.workflow.length - 1 ? <div className="w-px flex-1 bg-line" /> : null}
                  </div>
                  <div className="card flex-1 p-5">
                    <div className="h-card">{w.title}</div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{w.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────────────────────── B2B / B2C ───────────────────────── */}
      <section className="container-x section-tight reveal">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {[
            { title: k.b2bTitle, text: k.b2bText, img: "/demo/kitchen-walnut.jpg", href: p("/for-business"), cta: d.nav.business },
            { title: k.b2cTitle, text: k.b2cText, img: "/demo/render-2.jpg", href: p("/for-home"), cta: d.nav.home },
          ].map((c) => (
            <div key={c.title} className="card flex flex-col overflow-hidden">
              <div className="relative aspect-[16/9] bg-surface-2">
                <Image src={c.img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{c.title}</h2>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">{c.text}</p>
                <ButtonLink href={c.href} variant="secondary" className="mt-6 w-full sm:w-fit">
                  {c.cta}
                  <ArrowRight size={16} />
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>

        {/* honest status */}
        <div className="card-inset mt-4 p-6 sm:mt-5 sm:p-8">
          <div className="kicker">{k.statusTitle}</div>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-fg-2">{k.statusText}</p>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="container-x pt-4 pb-10 reveal">
        <div className="rounded-3xl bg-accent px-6 py-12 text-accent-fg sm:px-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.home.finalTitle}</h2>
              <p className="mt-3 text-lg opacity-85">{d.home.finalText}</p>
            </div>
            <ButtonLink href={p("/start?segment=b2b")} size="lg" className="w-full bg-accent-fg text-accent hover:opacity-90 sm:w-fit">
              {k.cta}
              <ArrowUpRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
